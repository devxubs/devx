/**
 * Barcode & Identification helpers for DevX POS
 */

/**
 * Generate a valid 13-digit EAN-13 barcode with standard checksum
 */
export function generateEAN13Barcode(prefix: string = "200"): string {
   // Retail in-store prefix 200-299 standard GS1 restricted circulation
   let code = prefix;
   while (code.length < 12) {
      code += Math.floor(Math.random() * 10);
   }

   // Calculate EAN-13 modulo 10 check digit
   let sum = 0;
   for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
   }
   const checkDigit = (10 - (sum % 10)) % 10;
   return `${code}${checkDigit}`;
}

/**
 * Generate a readable alphanumeric Code-128 style SKU
 */
export function generateSuggestedSKU(productName: string = "", category: string = ""): string {
   const cleanName = productName
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 4) || "PROD";

   const cleanCat = category
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 3) || "GEN";

   const randomNum = Math.floor(1000 + Math.random() * 9000);
   return `${cleanCat}-${cleanName}-${randomNum}`;
}

/**
 * Generate QR code data string for product identification
 */
export function generateQRData(product: {
   productCode?: string;
   productSku?: string;
   productName?: string;
   regularPrice?: number;
}): string {
   return JSON.stringify({
      code: product.productCode || "",
      sku: product.productSku || "",
      name: product.productName || "",
      price: product.regularPrice || 0,
   });
}
