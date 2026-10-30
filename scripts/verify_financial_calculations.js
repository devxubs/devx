require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== FINANCIAL CALCULATIONS & REPORTS RECONCILIATION TEST ===");

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

   // 1. Direct DB Aggregates
   const [dbRevenueAgg, dbExpenseAgg, dbPurchaseAgg] = await Promise.all([
      prisma.order.aggregate({
         where: { isDeleted: false, status: { in: ["COMPLETED", "DELIVERED"] } },
         _sum: { total: true },
      }),
      prisma.expense.aggregate({
         where: { isDeleted: false },
         _sum: { amount: true },
      }),
      prisma.purchase.aggregate({
         where: { isDeleted: false },
         _sum: { total: true },
      }),
   ]);

   const expectedRevenue = Number(dbRevenueAgg._sum.total || 0);
   const expectedExpenses = Number(dbExpenseAgg._sum.amount || 0);
   const expectedPurchases = Number(dbPurchaseAgg._sum.total || 0);
   const expectedNetProfit = expectedRevenue - expectedExpenses - expectedPurchases;

   // 2. Fetch Report Summary API
   const summaryRes = await fetch("http://localhost:3000/api/reports?tab=summary", { headers });
   const summaryData = await summaryRes.json();

   console.log("Reconciliation Check:");
   console.log(`- Revenue:   API = ${summaryData.totalRevenue}, DB = ${expectedRevenue} -> ${summaryData.totalRevenue === expectedRevenue ? "MATCH (PASS)" : "MISMATCH"}`);
   console.log(`- Expenses:  API = ${summaryData.totalExpenses}, DB = ${expectedExpenses} -> ${summaryData.totalExpenses === expectedExpenses ? "MATCH (PASS)" : "MISMATCH"}`);
   console.log(`- Purchases: API = ${summaryData.totalPurchases}, DB = ${expectedPurchases} -> ${summaryData.totalPurchases === expectedPurchases ? "MATCH (PASS)" : "MISMATCH"}`);
   console.log(`- Net Profit:API = ${summaryData.netProfit}, Calculated = ${expectedNetProfit} -> ${summaryData.netProfit === expectedNetProfit ? "MATCH (PASS)" : "MISMATCH"}`);

   if (
      summaryData.totalRevenue !== expectedRevenue ||
      summaryData.totalExpenses !== expectedExpenses ||
      summaryData.totalPurchases !== expectedPurchases ||
      summaryData.netProfit !== expectedNetProfit
   ) {
      console.error("[FAIL] Summary calculations do not match database aggregates!");
      process.exit(1);
   }

   // 3. Courier Report Reconciliation
   const courierRes = await fetch("http://localhost:3000/api/reports?tab=courier", { headers });
   const courierData = await courierRes.json();

   let courierFormulasMatch = true;
   for (const row of courierData.rows) {
      const expectedPay = row.total_amount - row.courier_charge;
      if (row.courier_pay_to_you !== expectedPay) {
         console.error(`[FAIL] Courier Pay To You mismatch for row ${row.id}: got ${row.courier_pay_to_you}, expected ${expectedPay}`);
         courierFormulasMatch = false;
         break;
      }
      if (isNaN(row.courier_charge) || isNaN(row.courier_pay_to_you)) {
         console.error(`[FAIL] NaN detected in row ${row.id}`);
         courierFormulasMatch = false;
         break;
      }
   }

   if (courierFormulasMatch) {
      console.log(`- Courier Rows Verified (${courierData.rows.length} rows): All rows satisfy 'courier_pay_to_you = total - courier_charge' without NaN -> MATCH (PASS)`);
   } else {
      process.exit(1);
   }

   console.log("==============================================================");
   console.log("ALL FINANCIAL CALCULATIONS 100% RECONCILED WITH DATABASE!");
   console.log("==============================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
