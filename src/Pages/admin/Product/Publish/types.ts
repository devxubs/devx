import { z } from "zod";

export const hideNumberSpinnerSx = {
   "& input[type=number]": {
      MozAppearance: "textfield",
   },
   "& input[type=number]::-webkit-outer-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
   },
   "& input[type=number]::-webkit-inner-spin-button": {
      WebkitAppearance: "none",
      margin: 0,
   },
} as const;

export interface ProductVariantItem {
   id?: string;
   variantName: string;
   sku: string;
   barcode?: string;
   regularPrice: number;
   salePrice?: number | null;
   costPrice?: number;
   wholesalePrice?: number;
   quantity: number;
   lowStockAlert?: number;
   image?: string | null;
   status?: "ACTIVE" | "INACTIVE";
   attributes?: Record<string, string>;
}

export interface ProductBundleComponent {
   componentProductId: string;
   componentProductName?: string;
   componentSku?: string;
   quantity: number;
   unitPrice?: number;
}

export interface SpecificationPair {
   key: string;
   value: string;
}

export const productSchema = z
   .object({
      // Basic Information
      productName: z.string().min(2, "Product name must be at least 2 characters"),
      subDescription: z.string().max(250, "Short summary must be 250 characters or less").optional(),
      content: z.string().optional(),
      brand: z.string().optional(),
      manufacturer: z.string().optional(),
      category: z.string().min(1, "Category is required"),
      subcategory: z.string().optional(),
      productType: z.string().min(1, "Product type is required").default("Simple"),
      status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).default("ACTIVE"),
      isFeatured: z.boolean().default(false),

      // Identification
      productCode: z.string().optional(),
      productSku: z.string().optional(),
      barcode: z.string().optional(),

      // Media
      images: z.array(z.any()).optional().default([]),

      // Pricing & Taxes
      costPrice: z.coerce.number().min(0, "Cost price cannot be negative").default(0),
      regularPrice: z.coerce.number().positive("Regular price must be greater than 0"),
      salePrice: z.coerce.number().optional(),
      wholesalePrice: z.coerce.number().min(0).optional().default(0),
      dealerPrice: z.coerce.number().min(0).optional().default(0),
      taxRate: z.coerce.number().min(0).max(100).default(0),
      taxMode: z.enum(["EXCLUSIVE", "INCLUSIVE"]).default("EXCLUSIVE"),
      discountPercentage: z.coerce.number().min(0).max(100).default(0),

      // Units & Measurement
      baseUnit: z.string().optional(),
      purchaseUnit: z.string().optional(),
      salesUnit: z.string().optional(),
      unitConversionRate: z.coerce.number().positive().default(1),
      unit: z.array(z.string()).optional().default([]), // compatibility
      color: z.array(z.string()).optional().default([]), // compatibility

      // Inventory & Warehouse
      quantity: z.coerce.number().min(0, "Quantity cannot be negative").default(0),
      lowStockAlert: z.string().optional().default("10"),
      minStockLevel: z.coerce.number().min(0).default(5),
      maxStockLevel: z.coerce.number().min(0).default(1000),
      warehouseId: z.string().optional(),
      rackLocation: z.string().optional(),
      shelfLocation: z.string().optional(),

      // Batches & Serials
      hasBatchTracking: z.boolean().default(false),
      hasSerialTracking: z.boolean().default(false),
      batchNumber: z.string().optional(),
      mfgDate: z.string().optional(),
      expDate: z.string().optional(),
      batchQuantity: z.coerce.number().optional(),

      // Suppliers
      primarySupplierId: z.string().optional(),
      supplierProductCode: z.string().optional(),
      supplierPrice: z.coerce.number().optional(),
      leadTimeDays: z.coerce.number().optional(),

      // Warranty & Specifications
      warrantyPeriod: z.string().optional(),
      warrantyType: z.string().optional(),
      modelNumber: z.string().optional(),
      originCountry: z.string().optional(),
      specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional().default([]),
      tags: z.array(z.string()).optional().default([]),

      // Accounting
      salesAccount: z.string().optional(),
      purchaseAccount: z.string().optional(),
      inventoryAccount: z.string().optional(),
      cogsAccount: z.string().optional(),

      // POS & Sales Settings
      allowDiscount: z.boolean().default(true),
      allowPriceChangeAtPos: z.boolean().default(false),
      trackInventory: z.boolean().default(true),
      allowNegativeStock: z.boolean().default(false),
      availableForPos: z.boolean().default(true),
      availableForOnline: z.boolean().default(true),

      // Variants & Bundles
      variants: z.array(z.any()).optional().default([]),
      bundleItems: z.array(z.any()).optional().default([]),
   })
   .refine(
      (data) =>
         data.salePrice === undefined ||
         data.salePrice === null ||
         isNaN(Number(data.salePrice)) ||
         Number(data.salePrice) <= 0 ||
         Number(data.salePrice) <= Number(data.regularPrice),
      {
         message: "Sale price cannot exceed regular price",
         path: ["salePrice"],
      },
   );

export type ProductSchemaType = z.infer<typeof productSchema>;
