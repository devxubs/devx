// DevX POS — Demo Data Seeder (ADDITIVE + IDEMPOTENT)
// ─────────────────────────────────────────────────────────────────────────────
// Creates a realistic, interconnected demo dataset for testing every module.
//
// SAFETY:
//  • Refuses to run unless ALLOW_DEMO_DATA=true is set explicitly.
//  • Refuses to run when NODE_ENV=production.
//  • Refuses to run unless the target database name contains "test", "demo"
//    or "dev" — or ALLOW_NON_TEST_DB=true is also set (deliberate opt-in).
//  • Never deletes, truncates, resets or overwrites existing records.
//    Every record is created only when its demo marker is not already present.
//  • Does NOT touch StoreSetting and never changes existing users/passwords.
//
// Run:  ALLOW_DEMO_DATA=true npm run db:seed:demo
// Demo staff password: DEMO_SEED_PASSWORD env, default "Demo@12345" (demo only).
// ─────────────────────────────────────────────────────────────────────────────
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// ── Guards ───────────────────────────────────────────────────────────────────
function guardAndDescribeTarget() {
   if (process.env.ALLOW_DEMO_DATA !== "true") {
      console.error("✋ Refused: set ALLOW_DEMO_DATA=true to run the demo seeder.");
      process.exit(1);
   }
   if (process.env.NODE_ENV === "production") {
      console.error("✋ Refused: NODE_ENV=production.");
      process.exit(1);
   }
   const url = process.env.DATABASE_URL || "";
   let dbName = "(unknown)", host = "(unknown)";
   try {
      const u = new URL(url);
      host = u.hostname + (u.port ? ":" + u.port : "");
      dbName = u.pathname.replace(/^\//, "");
   } catch { /* keep unknowns */ }
   const looksSafe = /(test|demo|dev)/i.test(dbName);
   if (!looksSafe && process.env.ALLOW_NON_TEST_DB !== "true") {
      console.error(`✋ Refused: database "${dbName}" does not look like a test/demo/dev database.`);
      console.error("   If you are CERTAIN this is the right target, also set ALLOW_NON_TEST_DB=true.");
      process.exit(1);
   }
   console.log("──────────────────────────────────────────────────────────────");
   console.log(" DevX POS — DEMO DATA SEEDER (additive, idempotent)");
   console.log(` Target database : ${dbName}  @ ${host}`);
   console.log(" Planned         : create demo records only where missing;");
   console.log("                   no deletes, no overwrites, settings untouched.");
   console.log("──────────────────────────────────────────────────────────────");
}

// ── Deterministic RNG (stable plan across runs) ──────────────────────────────
function mulberry32(seed) {
   return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
   };
}
const rand = mulberry32(20261112);
const ri = (min, max) => min + Math.floor(rand() * (max - min + 1)); // inclusive
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const money = (n) => Math.round(n * 100) / 100;

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (d, hour = 12) => {
   const t = new Date(now - d * DAY);
   t.setHours(hour, ri(0, 59), ri(0, 59), 0);
   return t;
};

// ── Sequential IDs — same algorithm as src/lib/idGenerator.ts ───────────────
const PREFIXES = { USER: "EP_", CUSTOMER: "CUS_", SUPPLIER: "SUP_", ORDER: "ORD_", PURCHASE: "PUR_", PRODUCT: "PROD_", CATEGORY: "CAT_", UNIT: "UNIT_", EXPENSE: "EXP_", ASSET: "AST_", ROLE: "ROLE_", WAREHOUSE: "WH_" };
const MODEL_FOR = { USER: () => prisma.user, CUSTOMER: () => prisma.customer, SUPPLIER: () => prisma.supplier, ORDER: () => prisma.order, PURCHASE: () => prisma.purchase, PRODUCT: () => prisma.product, CATEGORY: () => prisma.category, UNIT: () => prisma.unit, EXPENSE: () => prisma.expense, ASSET: () => prisma.asset, ROLE: () => prisma.role, WAREHOUSE: () => prisma.warehouse };

async function nextId(entityType) {
   const prefix = PREFIXES[entityType];
   const seq = await prisma.entitySequence.upsert({
      where: { entityType },
      update: { currentSeq: { increment: 1 } },
      create: { entityType, currentSeq: 1 },
   });
   let n = seq.currentSeq;
   let candidate = `${prefix}${n}`;
   const model = MODEL_FOR[entityType]();
   // collision check, same as the app util
   for (;;) {
      const clash = await model.findFirst({
         where: { OR: [{ customId: candidate }, ...(entityType === "ORDER" ? [{ orderId: candidate }, { orderCode: candidate }] : [])] },
      });
      if (!clash) break;
      const bumped = await prisma.entitySequence.upsert({
         where: { entityType },
         update: { currentSeq: { increment: 1 } },
         create: { entityType, currentSeq: n + 1 },
      });
      n = bumped.currentSeq;
      candidate = `${prefix}${n}`;
   }
   return candidate;
}

// ── Static demo master data ──────────────────────────────────────────────────
const DEMO_PASSWORD = process.env.DEMO_SEED_PASSWORD || "Demo@12345";

const ROLE_DEFS = [
   { name: "System Admin", description: "Full system control and configuration", permissions: { all: true, orders: true, products: true, users: true, reports: true } },
   { name: "Store Manager", description: "Manage inventory, orders, customers, and staff", permissions: { orders: true, products: true, customers: true, reports: true } },
   { name: "Cashier", description: "Handle billing, sales orders, and receipts", permissions: { orders: true, products_read: true, customers: true } },
   { name: "Warehouse Supervisor", description: "Oversee inventory stocks and supplier purchases", permissions: { products: true, purchases: true, suppliers: true } },
];

const DEMO_USERS = [
   { email: "demo.manager@devxpos.test", name: "Demo Manager (Tanvir Hasan)", role: "Store Manager", phone: "+8801711001001", salary: "45000" },
   { email: "demo.cashier1@devxpos.test", name: "Demo Cashier (Rahim Uddin)", role: "Cashier", phone: "+8801711001002", salary: "22000" },
   { email: "demo.cashier2@devxpos.test", name: "Demo Cashier (Fatema Akter)", role: "Cashier", phone: "+8801711001003", salary: "22000" },
   { email: "demo.warehouse@devxpos.test", name: "Demo Warehouse (Karim Mia)", role: "Warehouse Supervisor", phone: "+8801711001004", salary: "28000" },
   { email: "demo.sales@devxpos.test", name: "Demo Sales (Nusrat Jahan)", role: "Store Manager", phone: "+8801711001005", salary: "38000" },
   { email: "demo.support@devxpos.test", name: "Demo Support (Arif Chowdhury)", role: "Cashier", phone: "+8801711001006", salary: "20000" },
];

const CATEGORY_NAMES = ["Rice & Grains", "Cooking Oil", "Spices", "Beverages", "Snacks", "Dairy & Eggs", "Personal Care", "Household", "Electronics", "Apparel", "Footwear", "Stationery"];
const UNIT_DEFS = [
   { name: "Piece", short: "pc" }, { name: "Kilogram", short: "kg" }, { name: "Liter", short: "L" },
   { name: "Dozen", short: "dz" }, { name: "Box", short: "box" }, { name: "Packet", short: "pkt" },
];

// [name, category, cost, regularPrice, baseUnit]
const PRODUCT_DEFS = [
   ["Miniket Rice Premium 5kg", "Rice & Grains", 340, 420, "Packet"],
   ["Nazirshail Rice 5kg", "Rice & Grains", 390, 480, "Packet"],
   ["Basmati Rice 1kg", "Rice & Grains", 145, 185, "Packet"],
   ["Red Lentil (Masoor Dal) 1kg", "Rice & Grains", 118, 150, "Packet"],
   ["Chinigura Rice 5kg", "Rice & Grains", 520, 640, "Packet"],
   ["Soybean Oil 5L", "Cooking Oil", 780, 895, "Bottle"],
   ["Mustard Oil 1L", "Cooking Oil", 285, 340, "Bottle"],
   ["Sunflower Oil 2L", "Cooking Oil", 410, 480, "Bottle"],
   ["Olive Oil 500ml", "Cooking Oil", 690, 850, "Bottle"],
   ["Turmeric Powder 200g", "Spices", 78, 110, "Packet"],
   ["Red Chilli Powder 200g", "Spices", 92, 130, "Packet"],
   ["Cumin Seeds 100g", "Spices", 105, 150, "Packet"],
   ["Garam Masala 50g", "Spices", 65, 95, "Packet"],
   ["Coriander Powder 200g", "Spices", 70, 100, "Packet"],
   ["Coca-Cola 1.25L", "Beverages", 62, 80, "Bottle"],
   ["Pran Mango Juice 1L", "Beverages", 88, 115, "Bottle"],
   ["Ispahani Mirzapore Tea 400g", "Beverages", 195, 240, "Packet"],
   ["Nescafe Classic 95g", "Beverages", 330, 410, "Piece"],
   ["Mum Drinking Water 1.5L", "Beverages", 22, 30, "Bottle"],
   ["Potato Crackers (Mr. Twist)", "Snacks", 14, 20, "Packet"],
   ["Chanachur 300g", "Snacks", 52, 70, "Packet"],
   ["Lexus Biscuits 240g", "Snacks", 68, 90, "Packet"],
   ["Dark Fantasy Cookies", "Snacks", 96, 130, "Packet"],
   ["Farm Fresh Milk 1L", "Dairy & Eggs", 78, 95, "Bottle"],
   ["Deshi Eggs (Dozen)", "Dairy & Eggs", 128, 155, "Dozen"],
   ["Arong Yogurt 500ml", "Dairy & Eggs", 72, 95, "Piece"],
   ["Butter 100g (Aarong)", "Dairy & Eggs", 118, 150, "Piece"],
   ["Lux Soap 100g", "Personal Care", 58, 75, "Piece"],
   ["Parachute Coconut Oil 200ml", "Personal Care", 132, 165, "Bottle"],
   ["Close-Up Toothpaste 145g", "Personal Care", 108, 140, "Piece"],
   ["Sunsilk Shampoo 340ml", "Personal Care", 265, 330, "Bottle"],
   ["Vim Liquid 500ml", "Household", 118, 150, "Bottle"],
   ["Surf Excel 1kg", "Household", 235, 290, "Packet"],
   ["Harpic 750ml", "Household", 148, 185, "Bottle"],
   ["LED Bulb 12W (Walton)", "Electronics", 165, 230, "Piece"],
   ["USB Fast Charger 25W", "Electronics", 420, 590, "Piece"],
   ["Wireless Mouse M220", "Electronics", 780, 1090, "Piece"],
   ["AA Battery 4-Pack (Duracell)", "Electronics", 210, 290, "Packet"],
   ["Men's Cotton T-Shirt", "Apparel", 320, 550, "Piece"],
   ["Women's Kurti (Local)", "Apparel", 680, 1150, "Piece"],
   ["Kids Denim Pant", "Apparel", 540, 890, "Piece"],
   ["Running Shoes (Bata Power)", "Footwear", 1450, 2190, "Pair"],
   ["Leather Sandal (Apex)", "Footwear", 890, 1390, "Pair"],
   ["School Shoes Black", "Footwear", 720, 1150, "Pair"],
   ["A4 Notebook (RFL)", "Stationery", 68, 100, "Piece"],
   ["Ball Pen Pack (Matador)", "Stationery", 42, 60, "Packet"],
];

const FIRST = ["Md. Rahim", "Abdul Karim", "Fatema", "Ayesha", "Md. Sohel", "Nusrat", "Tanvir", "Sharmin", "Md. Imran", "Rumana", "Hasan", "Mahmuda", "Md. Rakib", "Shila", "Ariful", "Nasrin", "Md. Fahim", "Tania", "Rafiqul", "Sumaiya", "Md. Nabil", "Priya", "Shakib", "Mitu", "Md. Arman", "Farhana", "Biplob", "Shamima", "Md. Touhid", "Anika", "Rasel", "Khadiza", "Md. Joy", "Sabrina", "Mehedi", "Ruma", "Md. Sajib", "Nabila", "Omar", "Laila", "Md. Emon", "Dipa", "Sakib", "Moushumi", "Md. Rubel"];
const LAST = ["Uddin", "Begum", "Hossain", "Akter", "Islam", "Rahman", "Ahmed", "Khatun", "Mia", "Sultana", "Khan", "Das"];
const AREAS = ["Mirpur, Dhaka", "Uttara, Dhaka", "Dhanmondi, Dhaka", "Keraniganj, Dhaka", "Mohammadpur, Dhaka", "Gazipur", "Narayanganj", "Savar, Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Barishal", "Cumilla", "Mymensingh"];

const SUPPLIER_DEFS = [
   ["Karim Trading Corporation", "Tejgaon, Dhaka"], ["Dhaka Agro Distribution", "Karwan Bazar, Dhaka"],
   ["Bengal Consumer Goods Ltd", "Motijheel, Dhaka"], ["Padma Wholesale House", "Chawkbazar, Dhaka"],
   ["Sonali Enterprise", "New Market, Dhaka"], ["Jamuna Supply Co.", "Gazipur"],
   ["Fresh Farm Source BD", "Savar, Dhaka"], ["City Electronics Wholesale", "Stadium Market, Dhaka"],
   ["Rupayan Textile Suppliers", "Islampur, Dhaka"], ["Ananda Footwear Suppliers", "Sadarghat, Dhaka"],
   ["Green Stationery World", "Nilkhet, Dhaka"], ["Meghna Foods Distribution", "Narayanganj"],
];

const EXPENSE_TYPES = [
   ["Shop Rent", 15000, 18000], ["Utility Bill (Electricity)", 2800, 6500], ["Staff Salary (Part-time Helper)", 6000, 9000],
   ["Transport / Delivery Van", 800, 3500], ["Packaging Materials", 1200, 4000], ["Marketing (Facebook Boost)", 500, 3000],
   ["Shop Maintenance", 700, 4500], ["Internet Bill", 1000, 1500], ["Courier Service Cost", 900, 3800], ["Miscellaneous", 200, 1800],
];

const ASSET_DEFS = [
   ["Shop Freezer (Walton 300L)", "Equipment", 38500], ["Billing Computer (Core i5)", "Electronics", 42000],
   ["POS Printer (Thermal 80mm)", "Electronics", 6500], ["Barcode Scanner", "Electronics", 3800],
   ["Delivery Motorcycle (Used)", "Vehicle", 95000], ["Steel Display Rack (Large)", "Furniture", 12500],
   ["Wooden Counter Table", "Furniture", 18000], ["CCTV Camera Set (4 pcs)", "Security", 15500],
   ["IPS / Backup Power Unit", "Electronics", 22000], ["Weighing Scale (Digital)", "Equipment", 4500],
   ["Cash Drawer", "Equipment", 3200], ["Shop Signboard (LED)", "Furniture", 9800],
];

// ── Main ─────────────────────────────────────────────────────────────────────
const counts = {};
const bump = (k, n = 1) => { counts[k] = (counts[k] || 0) + n; };

async function main() {
   guardAndDescribeTarget();
   await prisma.$queryRaw`SELECT 1`; // connectivity check
   console.log("✓ Database connection OK\n");

   // ── Roles (same upserts as prisma/seed.js — additive, never destructive)
   const roles = {};
   for (const r of ROLE_DEFS) {
      const role = await prisma.role.upsert({ where: { name: r.name }, update: {}, create: { ...r, customId: undefined } });
      if (!role.customId) {
         await prisma.role.update({ where: { id: role.id }, data: { customId: await nextId("ROLE") } });
      }
      roles[r.name] = role;
   }

   // ── Demo staff users (marker: demo email)
   const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
   const users = [];
   for (const u of DEMO_USERS) {
      let user = await prisma.user.findUnique({ where: { email: u.email } });
      if (!user) {
         user = await prisma.user.create({
            data: {
               customId: await nextId("USER"), email: u.email, name: u.name,
               passwordHash: hash, phoneNumber: u.phone, address: "Demo Store, Dhaka",
               salary: u.salary, status: "ACTIVE", roleId: roles[u.role].id,
               hireDate: daysAgo(ri(120, 300)),
            },
         });
         bump("Users");
      }
      users.push(user);
   }
   const adminUser = await prisma.user.findFirst({ where: { role: { name: "System Admin" } } }) || users[0];
   const staffPool = users.length ? users : [adminUser];

   // ── Categories & Units (marker: name)
   const categories = {};
   for (const name of CATEGORY_NAMES) {
      let c = await prisma.category.findUnique({ where: { name } });
      if (!c) { c = await prisma.category.create({ data: { name, customId: await nextId("CATEGORY") } }); bump("Categories"); }
      categories[name] = c;
   }
   for (const u of UNIT_DEFS) {
      const exists = await prisma.unit.findUnique({ where: { name: u.name } });
      if (!exists) { await prisma.unit.create({ data: { ...u, customId: await nextId("UNIT") } }); bump("Units"); }
   }

   // ── Warehouse (marker: name) — stocks mirror product quantities
   let warehouse = await prisma.warehouse.findUnique({ where: { name: "Main Warehouse (Demo)" } });
   if (!warehouse) {
      warehouse = await prisma.warehouse.create({ data: { name: "Main Warehouse (Demo)", customId: await nextId("WAREHOUSE"), code: "WH-DEMO", address: "Keraniganj, Dhaka", phone: "+8801711001999", isDefault: false } });
      bump("Warehouses");
   }

   // ── Products (marker: productCode DEMO-PD-xxx). Start at quantity 0;
   //    final stock is computed by the purchase/sales simulation below.
   const products = [];
   for (let i = 0; i < PRODUCT_DEFS.length; i++) {
      const [name, cat, cost, regular, baseUnit] = PRODUCT_DEFS[i];
      const code = `DEMO-PD-${String(i + 1).padStart(3, "0")}`;
      let p = await prisma.product.findUnique({ where: { productCode: code } });
      if (!p) {
         const sale = chance(0.55) ? money(regular * 0.92) : null;
         p = await prisma.product.create({
            data: {
               customId: await nextId("PRODUCT"), productCode: code, productSku: `DEMO-SKU-${String(i + 1).padStart(3, "0")}`,
               productName: name, categoryId: categories[cat].id, baseUnit, purchaseUnit: baseUnit, salesUnit: baseUnit,
               costPrice: cost, regularPrice: regular, salePrice: sale,
               wholesalePrice: money(cost * 1.12), quantity: 0, lowStockAlert: 10, minStockLevel: 5,
               status: "ACTIVE", brand: pick(["Local", "Walton", "Pran", "Aarong", "Generic"]),
               primarySupplierId: undefined,
            },
         });
         bump("Products");
      }
      products.push({ ...p, _cost: cost, _defIndex: i });
   }

   // ── Suppliers (marker: phone)
   const suppliers = [];
   for (let i = 0; i < SUPPLIER_DEFS.length; i++) {
      const phone = `+88018${String(20000000 + i * 137913).slice(0, 8)}`;
      let s = await prisma.supplier.findFirst({ where: { phone } });
      if (!s) {
         s = await prisma.supplier.create({
            data: { customId: await nextId("SUPPLIER"), name: SUPPLIER_DEFS[i][0], phone, address: SUPPLIER_DEFS[i][1], email: `supplier${i + 1}@demo-suppliers.test` },
         });
         bump("Suppliers");
      }
      suppliers.push(s);
   }
   // link products to a primary supplier (only where unset)
   for (let i = 0; i < products.length; i++) {
      if (!products[i].primarySupplierId) {
         await prisma.product.update({ where: { id: products[i].id }, data: { primarySupplierId: suppliers[i % suppliers.length].id, supplierPrice: products[i]._cost } });
      }
   }

   // ── Customers (marker: phone)
   const customers = [];
   for (let i = 0; i < 45; i++) {
      const phone = `+88019${String(30000000 + i * 7919).slice(0, 8)}`;
      let c = await prisma.customer.findFirst({ where: { phone } });
      if (!c) {
         c = await prisma.customer.create({
            data: {
               customId: await nextId("CUSTOMER"),
               name: `${FIRST[i]} ${LAST[i % LAST.length]}`,
               phone, address: pick(AREAS),
               email: chance(0.5) ? `demo.customer${i + 1}@mail.test` : null,
               createdAt: daysAgo(ri(30, 89)),
            },
         });
         bump("Customers");
      }
      customers.push(c);
   }

   // ── Chronological simulation: purchases restock, orders sell ─────────────
   // Deterministic plan (same every run). Stock is tracked in-memory exactly
   // the way the app's stock service moves it, so balances never go negative
   // and final Product.quantity == Σ movements per product.
   // The simulation ledger is PLAN-ONLY (deterministic, starts at 0) so that
   // create/skip decisions are identical on every run — strict idempotency.
   // Final quantities are applied afterwards from the DB's real movement sums.
   const stock = new Map(products.map((p) => [p.id, 0]));
   const priceOf = (p) => Number(p.salePrice ?? p.regularPrice);

   // The whole simulation plan uses its OWN RNG stream, independent of the
   // master-data phases above (whose draw counts differ between a first run
   // and a re-run). This keeps the plan bit-for-bit identical on every run.
   const srand = mulberry32(777001);
   const sri = (a, b) => a + Math.floor(srand() * (b - a + 1));
   const spick = (arr) => arr[Math.floor(srand() * arr.length)];
   // Purchase quantities scale with unit cost, so purchase VALUE stays in a
   // realistic ratio to sales value (a 1,450-taka shoe is not stocked by 100).
   const purchaseQty = (cost, boost = 1) => {
      const base = cost > 1000 ? sri(2, 5) : cost > 400 ? sri(4, 10) : cost > 150 ? sri(8, 20) : sri(12, 35);
      return Math.max(1, Math.round(base * boost));
   };

   // Purchases: 24 over the last 88 days
   const purchasePlans = [];
   for (let i = 0; i < 24; i++) {
      const itemCount = sri(2, 5);
      const items = [];
      const used = new Set();
      for (let j = 0; j < itemCount; j++) {
         const p = spick(products);
         if (used.has(p.id)) continue;
         used.add(p.id);
         items.push({ product: p, quantity: purchaseQty(p._cost), price: p._cost });
      }
      purchasePlans.push({ index: i, dayOffset: 88 - Math.floor((i / 24) * 86) - sri(0, 1), supplier: suppliers[i % suppliers.length], items });
   }
   // Opening stock purchase (oldest) so early orders have something to sell
   purchasePlans.push({
      index: 24, dayOffset: 89, supplier: suppliers[0],
      items: products.slice(0, 30).map((p) => ({ product: p, quantity: purchaseQty(p._cost, 1.3), price: p._cost })),
   });

   // Orders: 90 over the last 89 days, weighted toward recent weeks
   const STATUS_PLAN = [
      ...Array(34).fill("COMPLETED"), ...Array(20).fill("DELIVERED"), ...Array(8).fill("CONFIRMED"),
      ...Array(6).fill("PROCESSING"), ...Array(4).fill("SHIPPED"), ...Array(8).fill("PENDING"),
      ...Array(2).fill("HOLD"), ...Array(6).fill("CANCELLED"), ...Array(2).fill("FAILED"),
   ];
   const orderPlans = [];
   for (let i = 0; i < 90; i++) {
      orderPlans.push({
         index: i, dayOffset: Math.max(0, 89 - Math.floor(Math.pow(srand(), 0.8) * 90)),
         status: STATUS_PLAN[i], customer: spick(customers), employee: spick(staffPool),
      });
   }

   // Merge into one timeline, oldest first; purchases before orders on a day.
   const events = [
      ...purchasePlans.map((p) => ({ kind: "purchase", dayOffset: p.dayOffset, plan: p })),
      ...orderPlans.map((o) => ({ kind: "order", dayOffset: o.dayOffset, plan: o })),
   ].sort((a, b) => b.dayOffset - a.dayOffset || (a.kind === "purchase" ? -1 : 1));

   for (const ev of events) {
      if (ev.kind === "purchase") {
         const plan = ev.plan;
         // Per-event RNG: in-loop draws must not depend on how many earlier
         // events were created vs skipped, or re-runs would diverge.
         const pr = mulberry32(5000 + plan.index);
         const pri = (a, b) => a + Math.floor(pr() * (b - a + 1));
         const ppick = (arr) => arr[Math.floor(pr() * arr.length)];
         const pchance = (p) => pr() < p;
         const pdaysAgo = (d, hour = 12) => { const t = new Date(now - d * DAY); t.setHours(hour, pri(0, 59), pri(0, 59), 0); return t; };
         const marker = `DEMO-SUP-INV-${String(plan.index + 1).padStart(3, "0")}`;
         if (await prisma.purchase.findFirst({ where: { invoice: marker } })) {
            for (const it of plan.items) stock.set(it.product.id, (stock.get(it.product.id) || 0) + it.quantity); // keep plan ledger exact on re-runs
            continue;
         }
         const productAmount = money(plan.items.reduce((s, it) => s + it.quantity * it.price, 0));
         const othersCost = money(pri(0, 800));
         const discount = pchance(0.3) ? money(productAmount * 0.02) : 0;
         const total = money(productAmount + othersCost - discount);
         const paid = pchance(0.6) ? total : money(total * 0.5);
         const createdAt = pdaysAgo(plan.dayOffset, pri(9, 18));
         await prisma.$transaction(async (tx) => {
            const purId = await nextId("PURCHASE");
            const purchase = await tx.purchase.create({
               data: {
                  customId: purId, invoice: marker, supplierId: plan.supplier.id,
                  productAmount, othersCost, discount, total, paid, due: money(total - paid),
                  note: "[DEMO] Regular stock purchase", createdById: ppick(staffPool).id, createdAt, updatedAt: createdAt,
                  items: { create: plan.items.map((it) => ({ productId: it.product.id, name: it.product.productName, code: it.product.productCode, quantity: it.quantity, price: it.price, subtotal: money(it.quantity * it.price) })) },
               },
            });
            for (const it of plan.items) {
               stock.set(it.product.id, stock.get(it.product.id) + it.quantity);
               await tx.stockMovement.create({ data: { productId: it.product.id, type: "PURCHASE", quantity: it.quantity, purchaseId: purchase.id, note: "[DEMO] Purchase restock", createdAt } });
            }
            bump("Purchases"); bump("Stock Movements", plan.items.length);
         });
      } else {
         const plan = ev.plan;
         const or = mulberry32(20000 + plan.index);
         const ori = (a, b) => a + Math.floor(or() * (b - a + 1));
         const opick = (arr) => arr[Math.floor(or() * arr.length)];
         const ochance = (p) => or() < p;
         const odaysAgo = (d, hour = 12) => { const t = new Date(now - d * DAY); t.setHours(hour, ori(0, 59), ori(0, 59), 0); return t; };
         const marker = `DEMO-ORD-${String(plan.index + 1).padStart(3, "0")}`;
         if (await prisma.order.findFirst({ where: { referenceId: marker } })) {
            // keep the plan ledger exact on re-runs: replay this order's sale
            const existing = await prisma.order.findFirst({ where: { referenceId: marker }, include: { items: true } });
            const wasCancelled = existing && (existing.status === "CANCELLED" || existing.status === "FAILED");
            if (existing && !wasCancelled) {
               for (const it of existing.items) if (it.productId) stock.set(it.productId, (stock.get(it.productId) || 0) - it.quantity);
            }
            continue;
         }
         const itemCount = ori(1, 4);
         const items = [];
         const used = new Set();
         for (let j = 0; j < itemCount; j++) {
            const p = opick(products);
            if (used.has(p.id)) continue;
            used.add(p.id);
            const available = stock.get(p.id) || 0;
            const qty = Math.max(0, Math.min(ori(1, 5), available));
            if (qty === 0) continue;
            items.push({ product: p, quantity: qty, price: priceOf(p) });
         }
         const cancelled = plan.status === "CANCELLED" || plan.status === "FAILED";
         if (!items.length && !cancelled) continue; // nothing sellable that day
         const subtotal = money(items.reduce((s, it) => s + it.quantity * it.price, 0));
         const deliveryCharge = ochance(0.5) ? opick([0, 60, 80, 120]) : 0;
         const discount = ochance(0.3) ? money(subtotal * 0.05) : 0;
         const total = money(subtotal + deliveryCharge - discount);
         const paidInFull = ["COMPLETED", "DELIVERED"].includes(plan.status);
         const advance = paidInFull ? total : ochance(0.5) ? money(total * 0.3) : 0;
         const createdAt = odaysAgo(plan.dayOffset, ori(9, 21));
         await prisma.$transaction(async (tx) => {
            const seq = await nextId("ORDER");
            const order = await tx.order.create({
               data: {
                  customId: seq, orderId: seq, orderCode: seq,
                  invoiceNo: `INV-DEMO-${String(plan.index + 1).padStart(3, "0")}`,
                  status: plan.status, customerId: plan.customer.id, employeeId: plan.employee.id,
                  paymentMethod: opick(["Cash", "Cash", "bKash", "Nagad", "Rocket", "Card"]),
                  orderSource: opick(["POS", "POS", "Facebook", "Phone", "WhatsApp", "Website"]),
                  courier: ["SHIPPED", "DELIVERED", "OUT_FOR_DELIVERY"].includes(plan.status) ? opick(["Steadfast", "Pathao", "RedX", "Sundarban"]) : null,
                  courierStatus: plan.status === "DELIVERED" ? "Delivered" : plan.status === "SHIPPED" ? "In Courier" : null,
                  subtotal, deliveryCharge, discount, total,
                  advancePayment: advance, dueAmount: money(total - advance),
                  cancellationReason: plan.status === "CANCELLED" ? opick(["Customer changed mind", "Product unavailable", "Duplicate order"]) : null,
                  deliveredAt: ["DELIVERED", "COMPLETED"].includes(plan.status) ? odaysAgo(Math.max(0, plan.dayOffset - 1), 15) : null,
                  referenceId: marker, orderNote: "[DEMO] Demo order", createdAt, updatedAt: createdAt,
                  items: { create: items.map((it) => ({ productId: it.product.id, name: it.product.productName, code: it.product.productCode, quantity: it.quantity, price: it.price, subtotal: money(it.quantity * it.price) })) },
               },
            });
            if (!cancelled) {
               for (const it of items) {
                  stock.set(it.product.id, stock.get(it.product.id) - it.quantity);
                  await tx.stockMovement.create({ data: { productId: it.product.id, type: "SALE", quantity: -it.quantity, orderId: order.id, note: "[DEMO] Order sale", createdAt } });
               }
               bump("Stock Movements", items.length);
            }
            bump("Orders");
         });
      }
   }

   // A few manual adjustments (counted in the same stock ledger)
   for (let i = 0; i < 4; i++) {
      const p = products[(i * 7) % products.length];
      const note = `[DEMO-ADJ-${i + 1}] Stock correction`;
      if (await prisma.stockMovement.findFirst({ where: { note } })) continue;
      const delta = i % 2 === 0 ? 5 : -3;
      if ((stock.get(p.id) || 0) + delta < 0) continue;
      stock.set(p.id, stock.get(p.id) + delta);
      await prisma.stockMovement.create({ data: { productId: p.id, type: "ADJUSTMENT", quantity: delta, note, createdAt: daysAgo(ri(2, 20)) } });
      bump("Stock Movements");
   }

   // Apply final stock from the DB's REAL movement sums (ground truth —
   // correct on first runs, re-runs and recovered partial runs alike),
   // to demo products + warehouse mirror.
   const realSums = await prisma.stockMovement.groupBy({
      by: ["productId"], where: { productId: { in: products.map((p) => p.id) } }, _sum: { quantity: true },
   });
   const realStock = new Map(realSums.map((m) => [m.productId, m._sum.quantity || 0]));
   for (const p of products) {
      const qty = realStock.get(p.id) || 0;
      await prisma.product.update({ where: { id: p.id }, data: { quantity: qty } });
      await prisma.productWarehouseStock.upsert({
         where: { productId_warehouseId: { productId: p.id, warehouseId: warehouse.id } },
         update: { quantity: qty },
         create: { productId: p.id, warehouseId: warehouse.id, quantity: qty },
      });
   }

   // ── Expenses (marker: note "DEMO-EXP-xxx")
   for (let i = 0; i < 30; i++) {
      const note = `DEMO-EXP-${String(i + 1).padStart(3, "0")}`;
      if (await prisma.expense.findFirst({ where: { note } })) continue;
      const [type, lo, hi] = EXPENSE_TYPES[i % EXPENSE_TYPES.length];
      const createdAt = daysAgo(ri(1, 88), ri(9, 19));
      await prisma.expense.create({
         data: { customId: await nextId("EXPENSE"), type, amount: ri(lo, hi), note, createdById: pick(staffPool).id, createdAt, updatedAt: createdAt },
      });
      bump("Expenses");
   }

   // ── Assets (marker: name)
   for (const [name, category, value] of ASSET_DEFS) {
      if (await prisma.asset.findFirst({ where: { name } })) continue;
      await prisma.asset.create({
         data: { customId: await nextId("ASSET"), name, category, value, description: "[DEMO] Demo asset", createdAt: daysAgo(ri(60, 89)) },
      });
      bump("Assets");
   }

   // ── Notifications (marker: title prefix)
   const NOTIFS = [
      ["[DEMO] Low stock alert", "Miniket Rice Premium 5kg is running low on stock.", "Inventory", "warning"],
      ["[DEMO] New order received", "A new Facebook order was received from a demo customer.", "Order", "success"],
      ["[DEMO] Purchase due reminder", "A supplier payment is partially due this week.", "Settlement", "info"],
      ["[DEMO] Daily sales summary", "Yesterday's demo sales crossed the weekly average.", "System", "info"],
      ["[DEMO] Stock adjustment done", "A manual stock correction was recorded by the warehouse team.", "Inventory", "info"],
   ];
   for (let i = 0; i < 18; i++) {
      const [title, message, category, type] = NOTIFS[i % NOTIFS.length];
      const user = staffPool[i % staffPool.length];
      const fullTitle = `${title} #${Math.floor(i / NOTIFS.length) + 1}`;
      if (await prisma.notification.findFirst({ where: { title: fullTitle, userId: user.id } })) continue;
      await prisma.notification.create({
         data: { userId: user.id, title: fullTitle, message, category, type, isRead: chance(0.6), createdAt: daysAgo(ri(0, 15), ri(8, 20)) },
      });
      bump("Notifications");
   }

   // ── Chat conversations + messages (marker: conversation name)
   const CONV_DEFS = [
      { name: "Demo: Store Team", type: "group", members: "all", msgs: ["Assalamu alaikum everyone, today's target is set.", "Rice stock update: new purchase arrived this morning.", "Please check the pending Facebook orders.", "Courier pickup is scheduled for 4 PM.", "Done, invoices printed.", "Great, closing summary will be shared at night.", "Sales report dashboard-e update hoyeche.", "Low stock item gulor list baniyechi.", "Agamikal notun purchase ashar kotha ache."] },
      { name: "Demo: Delivery Updates", type: "group", members: "all", msgs: ["Steadfast picked up 6 parcels.", "Two deliveries confirmed by customers.", "One parcel returned — customer was unavailable.", "Return received and stock updated.", "Pathao aj ektu late korche.", "Customer OTP confirm koreche ekta parcel-e.", "Kal ker jonno 8 ta parcel ready thakbe."] },
      { name: "Demo: Manager ↔ Cashier", type: "direct", members: "two", msgs: ["Bhai, bKash payment for the last order is confirmed.", "Okay, mark it as paid please.", "Done. Receipt sent on WhatsApp.", "Discount policy ta abar check kore nio.", "Okay bhai, 5% er upore hole apnake janabo.", "Ajker cash closing mileche."] },
      { name: "Demo: Warehouse Check", type: "direct", members: "two", msgs: ["Soybean oil stock koto ache ekhon?", "System-e 42 dekhacche, physical-o mileche.", "Good, adjustment lagbe na.", "Rice er notun lot shelf-e sajano hoyeche.", "Expired item check korechi, kichu pai nai.", "Kal physical count hobe bikal 4 tay."] },
      { name: "Demo: Weekend Plan", type: "group", members: "all", msgs: ["Friday te offer campaign cholbe.", "Discount products list ready korechi.", "Poster design kal pabo.", "Okay, page-e post kore dio.", "Offer er jonno banner print korte hobe.", "Stock jeno sesh na hoy sedike nojor rekho.", "Rater moddhe final list pathiye dibo."] },
      { name: "Demo: Supplier Follow-up", type: "direct", members: "two", msgs: ["Karim Trading ke payment-er update dite hobe.", "Partial payment pathiyechi, receipt ache.", "Tader notun price list esheche, review korbo.", "Dhaka Agro theke notun invoice esheche.", "Due amount ta next week clear hobe bolechi.", "Tara delivery Friday confirm koreche."] },
   ];
   for (const def of CONV_DEFS) {
      let conv = await prisma.conversation.findFirst({ where: { name: def.name } });
      if (!conv) {
         const memberUsers = def.members === "all" ? [adminUser, ...staffPool] : [staffPool[0], staffPool[1] || adminUser];
         const ids = [...new Set(memberUsers.map((u) => u.id))];
         conv = await prisma.conversation.create({
            data: { type: def.type, name: def.name, members: ids, adminIds: [adminUser.id], createdAt: daysAgo(ri(10, 40)) },
         });
         bump("Chat Conversations");
      }
      const existingMsgs = await prisma.chatMessage.count({ where: { conversationId: conv.id } });
      if (existingMsgs === 0) {
         const memberIds = Array.isArray(conv.members) ? conv.members : [];
         for (let m = 0; m < def.msgs.length; m++) {
            const senderId = memberIds[m % Math.max(1, memberIds.length)] || adminUser.id;
            const sender = [adminUser, ...staffPool].find((u) => u.id === senderId);
            await prisma.chatMessage.create({
               data: { conversationId: conv.id, senderId, senderName: sender ? sender.name : "Demo User", message: def.msgs[m], isRead: chance(0.7), createdAt: daysAgo(ri(0, 9), ri(9, 21)) },
            });
            bump("Chat Messages");
         }
      }
   }

   // ── Bin (soft-deleted demo records — isDeleted flag, the app's mechanism)
   const binCustomerPhone = "+8801999999001";
   if (!(await prisma.customer.findFirst({ where: { phone: binCustomerPhone } }))) {
      await prisma.customer.create({ data: { customId: await nextId("CUSTOMER"), name: "Demo Deleted Customer", phone: binCustomerPhone, address: "Bin test, Dhaka", isDeleted: true } });
      bump("Bin records");
   }
   if (!(await prisma.product.findUnique({ where: { productCode: "DEMO-PD-BIN" } }))) {
      await prisma.product.create({ data: { customId: await nextId("PRODUCT"), productCode: "DEMO-PD-BIN", productSku: "DEMO-SKU-BIN", productName: "Demo Discontinued Item", regularPrice: 100, costPrice: 70, quantity: 0, isDeleted: true } });
      bump("Bin records");
   }
   if (!(await prisma.expense.findFirst({ where: { note: "DEMO-EXP-BIN" } }))) {
      await prisma.expense.create({ data: { customId: await nextId("EXPENSE"), type: "Miscellaneous", amount: 150, note: "DEMO-EXP-BIN", isDeleted: true, createdById: adminUser.id } });
      bump("Bin records");
   }

   // ── Report ────────────────────────────────────────────────────────────────
   console.log("\n✅ Demo seeding complete. Records created THIS run:");
   for (const [k, v] of Object.entries(counts)) console.log(`   ${k.padEnd(18)} ${v}`);
   if (!Object.keys(counts).length) console.log("   (none — demo data already present, idempotent ✓)");
   console.log("\nDemo staff logins (password for all): " + DEMO_PASSWORD);
   for (const u of DEMO_USERS) console.log(`   ${u.email}  — ${u.role}`);
   console.log("\nNote: existing records, settings and the normal `npm run seed` were not touched.");
}

main()
   .catch((e) => { console.error("❌ Demo seeder failed:", e.message || e); process.exitCode = 1; })
   .finally(async () => { await prisma.$disconnect(); });
