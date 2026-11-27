import { NextRequest, NextResponse } from "next/server";
import { requireActiveSession, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";
import { sanitizeCustomConfig } from "@src/lib/customConfig";
import { validateDefaultCourierStatusInConfig } from "@src/lib/courierSubmission";
import { validateDecreaseStockOnInConfig } from "@src/lib/productSettings";
import { validateOrderCreateDefaultsInConfig } from "@src/lib/orderStatusDisplay";
import { validatePrefixSettingValue } from "@src/lib/idGenerator";
import { validatePaymentMethodsInConfig } from "@src/lib/paymentMethods";
import { validateCustomInvoiceTemplatesInConfig } from "@src/lib/customInvoiceTemplates";
import {
   logAudit,
   auditActorFromContext,
   requestAuditContext,
   buildChanges,
} from "@src/lib/audit";

/**
 * Default settings, mirroring the Prisma schema defaults exactly
 * (SET-02 fix). Returned by GET when the singleton row has not been
 * created yet — a read must never write to the database, and the
 * previous route-created copy disagreed with the schema
 * (e.g. defaultTaxRate 5.0 here vs @default(0) in schema.prisma).
 * The row is first persisted by an authorised PUT (which upserts).
 */
const DEFAULT_SETTINGS = {
   id: "default",
   storeName: "DevX POS",
   tagline: "Smart Retail & Point of Sale",
   logoUrl: "",
   email: "info@devxpos.com",
   phone: "+880 1700-000000",
   address: "Dhaka, Bangladesh",
   currency: "BDT",
   currencySymbol: "৳",
   timezone: "Asia/Dhaka",
   dateFormat: "DD/MM/YYYY",
   language: "en",
   defaultTaxRate: 0,
   defaultDeliveryCharge: 60,
   defaultDiscountRate: 0,
   invoicePrefix: "INV",
   orderPrefix: "#",
   enableStockValidation: true,
   defaultPaymentMethod: "Cash",
   defaultLowStockAlert: 10,
   autoGenerateSku: true,
   autoGenerateBarcode: true,
   receiptPaperSize: "80mm",
   invoiceHeader: "DevX POS - Retail Invoice",
   invoiceFooter: "Thank you for shopping with us! Please come again.",
   showLogoOnReceipt: true,
   showBarcodeOnReceipt: true,
   themeMode: "dark",
   themeColor: "primary",
   enableLowStockAlert: true,
   notifyEmail: "admin@devxpos.com",
   prefixEmployee: "EP_",
   prefixCustomer: "CUS_",
   prefixSupplier: "SUP_",
   prefixOrder: "ORD_",
   prefixPurchase: "PUR_",
   prefixProduct: "PROD_",
   prefixCategory: "CAT_",
   prefixUnit: "UNIT_",
   prefixExpense: "EXP_",
   prefixAsset: "AST_",
   prefixRole: "ROLE_",
   prefixBilling: "BILL_",
   prefixWarehouse: "WH_",
   customConfig: null,
};

export async function GET(request: NextRequest) {
   // SET-02 fix: settings are business configuration — authentication
   // required (previously any anonymous caller could read them).
   const sessionGate = await requireActiveSession(request);
   if (sessionGate instanceof NextResponse) return sessionGate;

   try {
      const settings = await prisma.storeSetting.findUnique({
         where: { id: "default" },
      });

      const payload: any = settings ?? DEFAULT_SETTINGS;

      // BUG-G2 (Full Live QA Audit 2026-11-25): every signed-in
      // account receives the store settings because the app shell
      // needs the flat identity fields (name, logo, currency) for
      // all roles — but the full customConfig is business
      // configuration (and the future home of courier credentials).
      // Callers without a settings permission now receive only the
      // two benign operational keys other staff screens consume
      // (the Order table's default courier status and the Expense
      // form's default category); everything else is withheld.
      const canSeeSettings = sessionGate.hasPermission([
         "settings",
         "setting",
         "setting_view_setting",
         "setting_update_setting",
         "setting_update",
      ]);
      // RP-3 (U3): the update capability mirrors the PUT gate's
      // permission list exactly (no view-only entries). It is
      // returned with the payload so the Settings page can render
      // read-only for roles that cannot save, instead of letting
      // them edit and fail at Save. Server-side enforcement is
      // unchanged — this flag is presentation only.
      const canUpdateSettings = sessionGate.hasPermission([
         "settings",
         "setting",
         "setting_update_setting",
         "setting_update",
      ]);
      // Audit L-1: a SEPARATE capability for the admin-only actions
      // presented on the System tab (factory reset, data export).
      // Derived from the exact predicate requireAdmin enforces —
      // AuthContext.isAdmin (System Admin role or the "all"
      // permission, see src/lib/auth.ts) — so a role that can edit
      // settings but is not an administrator no longer sees those
      // actions enabled only to receive a 403. Presentation only;
      // both routes keep their requireAdmin enforcement.
      const canAdminSettings = sessionGate.isAdmin === true;
      if (
         !canSeeSettings &&
         payload &&
         payload.customConfig &&
         typeof payload.customConfig === "object"
      ) {
         const cfg = payload.customConfig as Record<string, unknown>;
         const scrubbed: Record<string, unknown> = {};
         // Phase 1D/1E/1F: the order-flow Product Settings keys are
         // operational (Order Create reads them to apply the
         // stock-out / courier / variation gates), so roles without
         // settings permission still receive them — the same
         // treatment defaultCourierStatus already had.
         for (const key of [
            "defaultCourierStatus",
            "defaultExpenseCategory",
            "stockOutProductCanOrder",
            "outOfStockCanSubmitCourier",
            "variationSelectOnOrder",
            "defaultWarehouseId",
            // Final-verification fix: decreaseStockOn belongs with
            // its Phase 1 siblings — it was the one operational
            // Product Settings key missing from this allowlist.
            // (All enforcement reads are server-side; this keeps
            // staff-role settings payloads complete and consistent.)
            "decreaseStockOn",
            // Phase 2: order display/sorting config is operational
            // UI configuration for every order-facing role.
            "orderStatusOrder",
            "orderStatusHidden",
            "orderListDefaultStatuses",
            "orderTableColumns",
            // Phase 3: Order Creation Defaults — the create form
            // (staff roles) reads these on init.
            "orderCreateDefaultProductId",
            "orderCreateDefaultSource",
            "orderCreateDefaultStatus",
            // Phase 5: the payment method list — every payment
            // selector (staff roles) reads it.
            "paymentMethods",
            // RP-3 (F1): the invoice presentation keys — the
            // print renderers read settings.customConfig
            // client-side, so without these a staff-printed
            // invoice silently fell back to renderer defaults
            // instead of the store's configured template,
            // visibility and terms. Presentational only: this is
            // content customers see on every printed invoice.
            "invoiceTemplateId",
            "accentColor",
            "termsText",
            "showSkuColumn",
            "showSignatureBox",
            "showCustomerOnReceipt",
            "showCashierOnReceipt",
            "showCourierOnReceipt",
            "showTermsOnReceipt",
            "showLogoOnReceipt",
            "showBarcodeOnReceipt",
            // Cleanup Phase 2: custom invoice templates — the
            // print path resolves the selected template through
            // this list for every role; without it a staff print
            // of a custom-template invoice would fall back to
            // the base layout (the RP-3 F1 failure mode).
            "customInvoiceTemplates",
         ]) {
            if (key in cfg) scrubbed[key] = cfg[key];
         }
         return NextResponse.json({
            ...payload,
            customConfig: scrubbed,
            canUpdateSettings,
            canAdminSettings,
         });
      }

      return NextResponse.json({ ...payload, canUpdateSettings, canAdminSettings });
   } catch {
      return NextResponse.json(
         { error: "Failed to fetch settings" },
         { status: 500 },
      );
   }
}

export async function PUT(request: NextRequest) {
   // SEC-01 fix: changing store settings requires the settings
   // permission (or admin).
   const gate = await requirePermission(request, [
      "settings",
      "setting",
      "setting_update_setting",
      "setting_update",
   ]);
   if (gate instanceof NextResponse) return gate;

   try {
      const body = await request.json();

      // Phase 4: validate the Order ID / Invoice Number prefix
      // settings before anything is trimmed or saved (letters,
      // digits, hyphens, underscores; max 20 chars; empty is
      // allowed — read paths fall back to the defaults).
      // Audit L-3: the same validation now covers ALL 14 prefix
      // fields — previously the other twelve were only trimmed,
      // so values with spaces or symbols could be stored and flow
      // into generated entity IDs.
      for (const [field, label] of [
         ["prefixEmployee", "Employee ID Prefix"],
         ["prefixCustomer", "Customer ID Prefix"],
         ["prefixSupplier", "Supplier ID Prefix"],
         ["prefixOrder", "Order ID Prefix"],
         ["prefixPurchase", "Purchase ID Prefix"],
         ["prefixProduct", "Product ID Prefix"],
         ["prefixCategory", "Category ID Prefix"],
         ["prefixUnit", "Unit ID Prefix"],
         ["prefixExpense", "Expense ID Prefix"],
         ["prefixAsset", "Asset ID Prefix"],
         ["prefixRole", "Role ID Prefix"],
         ["prefixBilling", "Billing ID Prefix"],
         ["prefixWarehouse", "Warehouse ID Prefix"],
         ["invoicePrefix", "Invoice Number Prefix"],
      ] as const) {
         if (body[field] !== undefined) {
            const verdict = validatePrefixSettingValue(body[field], label);
            if (!verdict.ok) {
               return NextResponse.json(
                  { error: "Validation error", message: verdict.message },
                  { status: 400 },
               );
            }
         }
      }

      const dataToUpdate: any = {};
      // Phase 1C: set inside the customConfig block below when the
      // save carries a valid defaultWarehouseId to synchronise.
      let defaultWarehouseSyncId: string | null = null;

      // General
      if (body.storeName !== undefined) dataToUpdate.storeName = body.storeName.trim();
      if (body.tagline !== undefined) dataToUpdate.tagline = body.tagline;
      if (body.logoUrl !== undefined) dataToUpdate.logoUrl = body.logoUrl;
      if (body.email !== undefined) dataToUpdate.email = body.email;
      if (body.phone !== undefined) dataToUpdate.phone = body.phone;
      if (body.address !== undefined) dataToUpdate.address = body.address;
      if (body.currency !== undefined) {
         dataToUpdate.currency = body.currency;
         // Automatically map common currency symbols
         const symbolMap: Record<string, string> = {
            BDT: "৳",
            USD: "$",
            EUR: "€",
            GBP: "£",
            INR: "₹",
            JPY: "¥",
            CAD: "C$",
            AUD: "A$",
         };
         dataToUpdate.currencySymbol = body.currencySymbol || symbolMap[body.currency] || body.currency;
      }
      if (body.currencySymbol !== undefined) dataToUpdate.currencySymbol = body.currencySymbol;
      if (body.timezone !== undefined) dataToUpdate.timezone = body.timezone;
      if (body.dateFormat !== undefined) dataToUpdate.dateFormat = body.dateFormat;
      if (body.language !== undefined) dataToUpdate.language = body.language;

      // Sales & POS
      if (body.defaultTaxRate !== undefined || body.defaultVatPercent !== undefined) {
         dataToUpdate.defaultTaxRate = parseFloat(body.defaultTaxRate ?? body.defaultVatPercent) || 0;
      }
      if (body.defaultDeliveryCharge !== undefined) dataToUpdate.defaultDeliveryCharge = parseFloat(body.defaultDeliveryCharge) || 0;
      if (body.defaultDiscountRate !== undefined) dataToUpdate.defaultDiscountRate = parseFloat(body.defaultDiscountRate) || 0;
      if (body.invoicePrefix !== undefined) dataToUpdate.invoicePrefix = body.invoicePrefix.trim();
      if (body.orderPrefix !== undefined) dataToUpdate.orderPrefix = body.orderPrefix.trim();
      if (body.enableStockValidation !== undefined) dataToUpdate.enableStockValidation = Boolean(body.enableStockValidation);
      if (body.defaultPaymentMethod !== undefined) dataToUpdate.defaultPaymentMethod = body.defaultPaymentMethod;

      // Inventory
      if (body.defaultLowStockAlert !== undefined) dataToUpdate.defaultLowStockAlert = parseInt(body.defaultLowStockAlert) || 10;
      if (body.autoGenerateSku !== undefined) dataToUpdate.autoGenerateSku = Boolean(body.autoGenerateSku);
      if (body.autoGenerateBarcode !== undefined) dataToUpdate.autoGenerateBarcode = Boolean(body.autoGenerateBarcode);

      // Invoice & Printing
      if (body.receiptPaperSize !== undefined) dataToUpdate.receiptPaperSize = body.receiptPaperSize;
      if (body.invoiceHeader !== undefined) dataToUpdate.invoiceHeader = body.invoiceHeader;
      if (body.invoiceFooter !== undefined) dataToUpdate.invoiceFooter = body.invoiceFooter;
      if (body.showLogoOnReceipt !== undefined) dataToUpdate.showLogoOnReceipt = Boolean(body.showLogoOnReceipt);
      if (body.showBarcodeOnReceipt !== undefined) dataToUpdate.showBarcodeOnReceipt = Boolean(body.showBarcodeOnReceipt);

      // Appearance
      if (body.themeMode !== undefined) dataToUpdate.themeMode = body.themeMode;
      if (body.themeColor !== undefined) dataToUpdate.themeColor = body.themeColor;

      // Notifications & System
      if (body.enableLowStockAlert !== undefined) dataToUpdate.enableLowStockAlert = Boolean(body.enableLowStockAlert);
      if (body.notifyEmail !== undefined) dataToUpdate.notifyEmail = body.notifyEmail;

      // Entity ID Custom Prefixes
      if (body.prefixEmployee !== undefined) dataToUpdate.prefixEmployee = body.prefixEmployee.trim();
      if (body.prefixCustomer !== undefined) dataToUpdate.prefixCustomer = body.prefixCustomer.trim();
      if (body.prefixSupplier !== undefined) dataToUpdate.prefixSupplier = body.prefixSupplier.trim();
      if (body.prefixOrder !== undefined) dataToUpdate.prefixOrder = body.prefixOrder.trim();
      if (body.prefixPurchase !== undefined) dataToUpdate.prefixPurchase = body.prefixPurchase.trim();
      if (body.prefixProduct !== undefined) dataToUpdate.prefixProduct = body.prefixProduct.trim();
      if (body.prefixCategory !== undefined) dataToUpdate.prefixCategory = body.prefixCategory.trim();
      if (body.prefixUnit !== undefined) dataToUpdate.prefixUnit = body.prefixUnit.trim();
      if (body.prefixExpense !== undefined) dataToUpdate.prefixExpense = body.prefixExpense.trim();
      if (body.prefixAsset !== undefined) dataToUpdate.prefixAsset = body.prefixAsset.trim();
      if (body.prefixRole !== undefined) dataToUpdate.prefixRole = body.prefixRole.trim();
      if (body.prefixBilling !== undefined) dataToUpdate.prefixBilling = body.prefixBilling.trim();
      // P2-20: prefixWarehouse was missing from this whitelist (and
      // from PrefixesTab), so the warehouse prefix — consumed by
      // generateNextEntityId — could never be edited.
      if (body.prefixWarehouse !== undefined) dataToUpdate.prefixWarehouse = body.prefixWarehouse.trim();

      // Custom Config — P2-20: dead write-only keys are stripped on
      // save (see src/lib/customConfig.ts for the audited list).
      // O4: the Default Courier Status lives in this blob
      // (customConfig.defaultCourierStatus); an unsupported value is
      // rejected here, on save, instead of being stored and then
      // silently misapplied at courier submission time.
      if (body.customConfig !== undefined) {
         const courierVerdict = validateDefaultCourierStatusInConfig(body.customConfig);
         if (!courierVerdict.ok) {
            return NextResponse.json(
               { error: "Validation error", message: courierVerdict.message },
               { status: 400 },
            );
         }
         // Phase 1B: the Decrease Stock On trigger
         // (customConfig.decreaseStockOn) is validated the same
         // way — an unsupported status is rejected on save instead
         // of being stored and silently misapplied when the stock
         // engine resolves it (the resolver falls back to
         // CONFIRMED, which would hide the mistake).
         const decreaseVerdict = validateDecreaseStockOnInConfig(body.customConfig);
         if (!decreaseVerdict.ok) {
            return NextResponse.json(
               { error: "Validation error", message: decreaseVerdict.message },
               { status: 400 },
            );
         }
         // Phase 3: the Order Creation Defaults keys are validated
         // the same way (a present default status must be a real
         // OrderStatus; product/source must be strings).
         const createDefaultsVerdict =
            validateOrderCreateDefaultsInConfig(body.customConfig);
         if (!createDefaultsVerdict.ok) {
            return NextResponse.json(
               { error: "Validation error", message: createDefaultsVerdict.message },
               { status: 400 },
            );
         }
         // Phase 5: the paymentMethods list is validated the same
         // way (well-formed entries, unique names).
         const paymentMethodsVerdict =
            validatePaymentMethodsInConfig(body.customConfig);
         if (!paymentMethodsVerdict.ok) {
            return NextResponse.json(
               { error: "Validation error", message: paymentMethodsVerdict.message },
               { status: 400 },
            );
         }
         // Cleanup Phase 2: the custom invoice template list is
         // validated the same way (well-formed entries, unique
         // ids, real built-in base templates).
         const customTemplatesVerdict =
            validateCustomInvoiceTemplatesInConfig(body.customConfig);
         if (!customTemplatesVerdict.ok) {
            return NextResponse.json(
               { error: "Validation error", message: customTemplatesVerdict.message },
               { status: 400 },
            );
         }
         // Phase 1C (settings → warehouse direction): when this
         // save carries a non-empty defaultWarehouseId, the
         // Warehouse.isDefault flag is moved to match inside the
         // save transaction below — the setting and the flag are
         // two views of one fact and must not drift. An empty or
         // absent value leaves the flag untouched (no default
         // configured → existing behaviour preserved). A stale id
         // is rejected here instead of being stored.
         if (
            body.customConfig &&
            typeof body.customConfig === "object" &&
            !Array.isArray(body.customConfig) &&
            "defaultWarehouseId" in body.customConfig
         ) {
            const candidate = (body.customConfig as Record<string, unknown>)
               .defaultWarehouseId;
            if (typeof candidate === "string" && candidate.trim() !== "") {
               const warehouse = await prisma.warehouse.findFirst({
                  where: { id: candidate, isDeleted: false },
                  select: { id: true },
               });
               if (!warehouse) {
                  return NextResponse.json(
                     {
                        error: "Validation error",
                        message: "defaultWarehouseId does not match an existing warehouse.",
                     },
                     { status: 400 },
                  );
               }
               defaultWarehouseSyncId = candidate;
            }
         }
         dataToUpdate.customConfig = sanitizeCustomConfig(body.customConfig);
      }

      // P2-4: settings updates are audited in the same transaction
      // as the upsert. The diff covers exactly the whitelisted
      // fields this PUT writes; customConfig (a JSON blob) is
      // compared by its serialised form so a config-only save still
      // registers. A no-op PUT (empty diff — including the
      // first-ever save, where there is no prior row to diff
      // against beyond the schema defaults the GET falls back to)
      // writes no row beyond a CREATE when the row is first
      // persisted.
      const auditCtx = requestAuditContext(request);
      const updated = await prisma.$transaction(async (tx) => {
         const before = await tx.storeSetting.findUnique({
            where: { id: "default" },
         });
         const result = await tx.storeSetting.upsert({
            where: { id: "default" },
            update: dataToUpdate,
            create: {
               id: "default",
               ...dataToUpdate,
            },
         });

         const diffFields = Object.keys(dataToUpdate);
         if (diffFields.length > 0) {
            const snapshot = (row: any) =>
               row
                  ? {
                       ...row,
                       customConfig:
                          row.customConfig != null
                             ? JSON.stringify(row.customConfig)
                             : null,
                    }
                  : null;
            if (!before) {
               await logAudit(tx, {
                  actor: auditActorFromContext(gate),
                  action: "CREATE",
                  entityType: "SETTING",
                  entityId: result.id,
                  summary: "Store settings created",
                  ...auditCtx,
               });
            } else {
               const changes = buildChanges(
                  snapshot(before),
                  snapshot(result),
                  diffFields,
               );
               if (changes) {
                  await logAudit(tx, {
                     actor: auditActorFromContext(gate),
                     action: "UPDATE",
                     entityType: "SETTING",
                     entityId: result.id,
                     summary: "Store settings updated",
                     changes,
                     ...auditCtx,
                  });
               }
            }
         }

         // Phase 1C: move the Warehouse.isDefault flag to the
         // warehouse named by the saved defaultWarehouseId, in the
         // same transaction as the settings upsert — the two can
         // never be observed out of sync.
         if (defaultWarehouseSyncId) {
            await tx.warehouse.updateMany({
               where: { isDefault: true, id: { not: defaultWarehouseSyncId } },
               data: { isDefault: false },
            });
            await tx.warehouse.update({
               where: { id: defaultWarehouseSyncId },
               data: { isDefault: true },
            });
         }

         return result;
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json(
         { error: "Failed to update settings" },
         { status: 500 },
      );
   }
}
