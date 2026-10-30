require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== SETTINGS PERSISTENCE & POS DEFAULTS VERIFICATION ===");

   const adminUser = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });

   const token = jwt.sign(
      {
         id: adminUser.id,
         email: adminUser.email,
         role: adminUser.role?.name || "ADMIN",
         permissions: ["ALL"],
      },
      JWT_SECRET,
      { expiresIn: "1h" }
   );

   const headers = {
      Authorization: `Bearer ${token}`,
      Cookie: `devx_token=${token}`,
      "Content-Type": "application/json",
   };

   // 1. Read current settings
   const getRes = await fetch("http://localhost:3000/api/settings", { headers });
   if (!getRes.ok) {
      console.error("[FAIL] GET /api/settings failed:", getRes.status);
      process.exit(1);
   }
   const initialSettings = await getRes.json();
   console.log(`[PASS] Initial settings fetched: Currency = '${initialSettings.currency}', Store = '${initialSettings.storeName}'`);

   // 2. Update settings
   const updateRes = await fetch("http://localhost:3000/api/settings", {
      method: "PUT",
      headers,
      body: JSON.stringify({
         storeName: "DevX Retail flagship",
         currency: "BDT",
         defaultDeliveryCharge: 60,
         defaultVatPercent: 5,
         prefixOrder: "ORD_",
         prefixCustomer: "CUS_",
         prefixPurchase: "PUR_",
      }),
   });
   if (!updateRes.ok) {
      console.error("[FAIL] PUT /api/settings failed:", await updateRes.text());
      process.exit(1);
   }
   const savedSettings = await updateRes.json();
   console.log(`[PASS] Settings updated: defaultDeliveryCharge = ${savedSettings.defaultDeliveryCharge}, defaultVatPercent = ${savedSettings.defaultVatPercent}`);

   // 3. Verify Persistence via Direct DB query
   const dbSetting = await prisma.storeSetting.findUnique({ where: { id: "default" } });
   if (
      dbSetting.storeName !== "DevX Retail flagship" ||
      dbSetting.currency !== "BDT" ||
      Number(dbSetting.defaultDeliveryCharge) !== 60
   ) {
      console.error("[FAIL] DB record does not match saved settings:", dbSetting);
      process.exit(1);
   }
   console.log("[PASS] Settings verified directly in MySQL database.");

   // 4. Restore original store name
   await prisma.storeSetting.update({
      where: { id: "default" },
      data: {
         storeName: initialSettings.storeName || "DevX POS",
      },
   });
   console.log("Restored store name to original.");

   console.log("==============================================================");
   console.log("SETTINGS PERSISTENCE VERIFIED WITH 100% SUCCESS");
   console.log("==============================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
