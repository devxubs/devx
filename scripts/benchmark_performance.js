require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function benchmarkEndpoint(name, url, headers, iterations = 10) {
   const times = [];
   let payloadBytes = 0;

   // Warm-up run
   await fetch(url, { headers });

   for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const res = await fetch(url, { headers });
      const end = performance.now();
      const text = await res.text();
      times.push(end - start);
      if (i === 0) payloadBytes = Buffer.byteLength(text, "utf8");
   }

   times.sort((a, b) => a - b);
   const min = times[0].toFixed(1);
   const max = times[times.length - 1].toFixed(1);
   const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
   const p95 = times[Math.floor(times.length * 0.95)].toFixed(1);
   const payloadKb = (payloadBytes / 1024).toFixed(2);

   console.log(`| ${name.padEnd(30)} | Avg: ${avg.padStart(6)} ms | Min: ${min.padStart(5)} ms | P95: ${p95.padStart(6)} ms | Size: ${payloadKb.padStart(6)} KB |`);
   return { name, avg: Number(avg), min: Number(min), max: Number(max), p95: Number(p95), payloadKb: Number(payloadKb) };
}

async function main() {
   console.log("=== DEVX POS REPRODUCIBLE PERFORMANCE BENCHMARK ===");
   console.log("-----------------------------------------------------------------------------------------");

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

   const endpoints = [
      { name: "Orders List (Default Page 1)", url: "http://localhost:3000/api/orders?page=1&limit=20" },
      { name: "Orders List (Filtered: Status)", url: "http://localhost:3000/api/orders?status=PENDING&limit=20" },
      { name: "Orders List (Complex Filter)", url: "http://localhost:3000/api/orders?status=CONFIRMED&district=Dhaka&minPrice=100&limit=20" },
      { name: "Products Autocomplete/Search", url: "http://localhost:3000/api/products?search=Heels&limit=10" },
      { name: "Customers Search API", url: "http://localhost:3000/api/customers?search=01&limit=10" },
      { name: "Reports Summary Dashboard", url: "http://localhost:3000/api/reports?tab=summary" },
      { name: "Reports Courier Reconciliation", url: "http://localhost:3000/api/reports?tab=courier" },
      { name: "Reports Sales Trend", url: "http://localhost:3000/api/reports?tab=sales" },
      { name: "Recycle Bin (10 Entities)", url: "http://localhost:3000/api/bin" },
      { name: "Settings Read API", url: "http://localhost:3000/api/settings" },
   ];

   const results = [];
   for (const ep of endpoints) {
      const res = await benchmarkEndpoint(ep.name, ep.url, headers, 10);
      results.push(res);
   }

   console.log("-----------------------------------------------------------------------------------------");
   const overallAvg = (results.reduce((s, r) => s + r.avg, 0) / results.length).toFixed(1);
   console.log(`Overall Average API Latency: ${overallAvg} ms (Sub-150ms Target: ${Number(overallAvg) < 150 ? "MET (PASS)" : "EXCEEDED"})`);
   console.log("=========================================================================================");
}

main()
   .catch(console.error)
   .finally(() => prisma.$disconnect());
