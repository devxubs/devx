import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, requirePermission } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

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
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const settings = await prisma.storeSetting.findUnique({
         where: { id: "default" },
      });

      return NextResponse.json(settings ?? DEFAULT_SETTINGS);
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

      const dataToUpdate: any = {};

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

      // Custom Config
      if (body.customConfig !== undefined) dataToUpdate.customConfig = body.customConfig;

      const updated = await prisma.storeSetting.upsert({
         where: { id: "default" },
         update: dataToUpdate,
         create: {
            id: "default",
            ...dataToUpdate,
         },
      });

      return NextResponse.json(updated);
   } catch {
      return NextResponse.json(
         { error: "Failed to update settings" },
         { status: 500 },
      );
   }
}
