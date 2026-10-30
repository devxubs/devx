import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@src/lib/auth";
import { prisma } from "@src/lib/prisma";

export async function POST(request: NextRequest) {
   const session = getSessionUser(request);
   if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }

   try {
      const defaultData = {
         storeName: "DevX POS",
         tagline: "Smart Retail & Point of Sale",
         logoUrl: "",
         email: "contact@devxpos.com",
         phone: "+880 1700-123456",
         address: "House 42, Road 11, Banani, Dhaka-1213, Bangladesh",
         currency: "BDT",
         currencySymbol: "৳",
         timezone: "Asia/Dhaka",
         dateFormat: "DD/MM/YYYY",
         language: "en",
         defaultTaxRate: 5.0,
         defaultDeliveryCharge: 60.0,
         defaultDiscountRate: 0.0,
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
         customConfig: {},
      };

      const settings = await prisma.storeSetting.upsert({
         where: { id: "default" },
         update: defaultData,
         create: {
            id: "default",
            ...defaultData,
         },
      });

      return NextResponse.json({ message: "Settings restored to defaults", settings });
   } catch {
      return NextResponse.json(
         { error: "Failed to reset settings" },
         { status: 500 },
      );
   }
}
