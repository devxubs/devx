// DevX POS — MySQL Database Initial Seeder
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
   console.log("🌱 Starting DevX POS database seed...");

   // 1. Roles
   console.log("Seeding roles...");
   const rolesData = [
      {
         name: "System Admin",
         description: "Full system control and configuration",
         permissions: { all: true, orders: true, products: true, users: true, reports: true },
      },
      {
         name: "Store Manager",
         description: "Manage inventory, orders, customers, and staff",
         permissions: { orders: true, products: true, customers: true, reports: true },
      },
      {
         name: "Cashier",
         description: "Handle billing, sales orders, and receipts",
         permissions: { orders: true, products_read: true, customers: true },
      },
      {
         name: "Warehouse Supervisor",
         description: "Oversee inventory stocks and supplier purchases",
         permissions: { products: true, purchases: true, suppliers: true },
      },
   ];

   const createdRoles = {};
   for (const r of rolesData) {
      const role = await prisma.role.upsert({
         where: { name: r.name },
         update: { description: r.description, permissions: r.permissions },
         create: r,
      });
      createdRoles[r.name] = role;
   }

   // 2. Units
   console.log("Seeding units...");
   const unitNames = ["Piece", "Kilogram", "Gram", "Liter", "Dozen", "Box", "Carton", "Bottle", "Bag", "Pair", "Set"];
   for (const name of unitNames) {
      await prisma.unit.upsert({
         where: { name },
         update: {},
         create: { name },
      });
   }

   // 3. Categories
   console.log("Seeding categories...");
   const categoriesData = ["Beverages", "Snacks", "Dairy", "Electronics", "Footwear", "Apparel", "Personal Care"];
   const createdCategories = {};
   for (const name of categoriesData) {
      const category = await prisma.category.upsert({
         where: { name },
         update: {},
         create: { name },
      });
      createdCategories[name] = category;
   }

   // 4. Link or Create Admin User
   console.log("Setting up Admin user...");
   const adminRole = createdRoles["System Admin"];
   const existingUser = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
   });

   let adminUser;
   if (existingUser) {
      adminUser = await prisma.user.update({
         where: { id: existingUser.id },
         data: {
            roleId: adminRole.id,
            status: "ACTIVE",
         },
      });
   } else {
      const hashedPassword = await bcrypt.hash("admin123456", 12);
      adminUser = await prisma.user.create({
         data: {
            email: "devxub@gmail.com",
            name: "jubayer",
            passwordHash: hashedPassword,
            phoneNumber: "+8801700000000",
            address: "Dhaka, Bangladesh",
            status: "ACTIVE",
            roleId: adminRole.id,
         },
      });
   }

   // Create secondary staff user
   const cashierHashedPassword = await bcrypt.hash("cashier123", 12);
   await prisma.user.upsert({
      where: { email: "cashier@devxpos.com" },
      update: {},
      create: {
         email: "cashier@devxpos.com",
         name: "Demo Cashier",
         passwordHash: cashierHashedPassword,
         phoneNumber: "+8801800000001",
         address: "Dhaka Outlet",
         status: "ACTIVE",
         roleId: createdRoles["Cashier"].id,
         salary: "25000",
      },
   });

   // 5. Products
   console.log("Seeding products...");
   const sampleProducts = [
      {
         productCode: "PD-001",
         productSku: "SKU-WET-01",
         productName: "Elegance Stiletto Heels",
         subDescription: "Stylish high heels for evening wear",
         content: "These stiletto heels feature a sleek design, cushioned insole, and durable sole — perfect for parties, events, or formal occasions.",
         images: [
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp",
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-2.webp",
         ],
         quantity: 72,
         lowStockAlert: 10,
         categoryId: createdCategories["Footwear"]?.id,
         productType: "Heels",
         colors: ["Red", "Black", "Nude"],
         sizes: ["37", "38", "39", "40"],
         regularPrice: 85.0,
         salePrice: 75.0,
      },
      {
         productCode: "PD-002",
         productSku: "SKU-SFW-02",
         productName: "Pro Smart Fitness Watch",
         subDescription: "Heart-rate monitor with AMOLED display",
         content: "Waterproof smartwatch with sleep tracking, GPS, 14-day battery life, and multiple sports modes.",
         images: [
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-3.webp",
         ],
         quantity: 45,
         lowStockAlert: 8,
         categoryId: createdCategories["Electronics"]?.id,
         productType: "Wearables",
         colors: ["Space Gray", "Silver", "Midnight Blue"],
         sizes: ["Standard"],
         regularPrice: 199.99,
         salePrice: 179.99,
      },
      {
         productCode: "PD-003",
         productSku: "SKU-ANC-03",
         productName: "Active Noise-Cancelling Headphones",
         subDescription: "Wireless Bluetooth over-ear headphones",
         content: "Crisp acoustic performance with active noise cancellation up to 35dB, 40 hours playtime, and rapid USB-C charging.",
         images: [
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-4.webp",
         ],
         quantity: 8,
         lowStockAlert: 10,
         categoryId: createdCategories["Electronics"]?.id,
         productType: "Audio",
         colors: ["Matte Black", "Graphite"],
         sizes: ["One Size"],
         regularPrice: 129.5,
         salePrice: 115.0,
      },
      {
         productCode: "PD-004",
         productSku: "SKU-CTN-04",
         productName: "Premium Cotton Casual Shirt",
         subDescription: "100% breathable organic cotton",
         content: "Modern slim-fit button-down casual shirt suitable for work, weekends, and social gatherings.",
         images: [
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-5.webp",
         ],
         quantity: 60,
         lowStockAlert: 15,
         categoryId: createdCategories["Apparel"]?.id,
         productType: "Shirt",
         colors: ["Navy Blue", "White", "Olive Green"],
         sizes: ["M", "L", "XL"],
         regularPrice: 45.0,
         salePrice: 38.0,
      },
      {
         productCode: "PD-005",
         productSku: "SKU-ORG-05",
         productName: "Organic Green Tea Blend",
         subDescription: "Hand-picked whole-leaf tea 250g",
         content: "Antioxidant-rich organic herbal green tea with aromatic jasmine undertones.",
         images: [
            "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-6.webp",
         ],
         quantity: 110,
         lowStockAlert: 20,
         categoryId: createdCategories["Beverages"]?.id,
         productType: "Tea",
         colors: ["Natural"],
         sizes: ["250g"],
         regularPrice: 14.5,
         salePrice: 12.0,
      },
   ];

   const createdProducts = [];
   for (const p of sampleProducts) {
      const product = await prisma.product.upsert({
         where: { productCode: p.productCode },
         update: p,
         create: p,
      });
      createdProducts.push(product);
   }

   // 6. Customers
   console.log("Seeding customers...");
   const customersData = [
      { name: "John Doe", email: "john.doe@example.com", phone: "+8801712345678", address: "Gulshan-2, Dhaka" },
      { name: "Sarah Ahmed", email: "sarah.ahmed@example.com", phone: "+8801812345678", address: "Dhanmondi, Dhaka" },
      { name: "Michael Lee", email: "michael.lee@example.com", phone: "+8801912345678", address: "Uttara Sector 7, Dhaka" },
      { name: "Fatima Khan", email: "fatima.khan@example.com", phone: "+8801612345678", address: "Banani, Dhaka" },
      { name: "David Smith", email: "david.smith@example.com", phone: "+8801512345678", address: "Mirpur DOHS, Dhaka" },
   ];

   const createdCustomers = [];
   for (const c of customersData) {
      let cust = await prisma.customer.findFirst({ where: { phone: c.phone } });
      if (!cust) {
         cust = await prisma.customer.create({ data: c });
      }
      createdCustomers.push(cust);
   }

   // 7. Suppliers
   console.log("Seeding suppliers...");
   const suppliersData = [
      { name: "Md. Rahim Traders", email: "md.rahim@example.com", phone: "01710000001", address: "Chawkbazar, Dhaka" },
      { name: "Abdul Karim Imports", email: "abdul.karim@example.com", phone: "01810000002", address: "Agrabad, Chittagong" },
      { name: "Global Tech Supplies", email: "tech@globaltrade.com", phone: "01910000003", address: "Motijheel, Dhaka" },
   ];

   for (const s of suppliersData) {
      const existing = await prisma.supplier.findFirst({ where: { phone: s.phone } });
      if (!existing) {
         await prisma.supplier.create({ data: s });
      }
   }

   // 8. Orders
   console.log("Seeding orders...");
   const existingOrders = await prisma.order.count();
   if (existingOrders === 0 && createdProducts.length > 0) {
      const order1 = await prisma.order.create({
         data: {
            orderId: "#6001",
            invoiceNo: "INV-6001",
            status: "COMPLETED",
            orderSource: "Pathao Courier",
            paymentMethod: "Cash on Delivery",
            subtotal: 150.0,
            deliveryCharge: 60.0,
            discount: 10.0,
            total: 200.0,
            advancePayment: 200.0,
            dueAmount: 0.0,
            customerId: createdCustomers[0]?.id,
            employeeId: adminUser.id,
            items: {
               create: [
                  {
                     productId: createdProducts[0].id,
                     name: createdProducts[0].productName,
                     code: createdProducts[0].productCode,
                     quantity: 2,
                     price: 75.0,
                     subtotal: 150.0,
                  },
               ],
            },
         },
      });

      const order2 = await prisma.order.create({
         data: {
            orderId: "#6002",
            invoiceNo: "INV-6002",
            status: "PENDING",
            orderSource: "Steadfast",
            paymentMethod: "bKash",
            subtotal: 179.99,
            deliveryCharge: 80.0,
            discount: 0.0,
            total: 259.99,
            advancePayment: 100.0,
            dueAmount: 159.99,
            customerId: createdCustomers[1]?.id,
            employeeId: adminUser.id,
            items: {
               create: [
                  {
                     productId: createdProducts[1].id,
                     name: createdProducts[1].productName,
                     code: createdProducts[1].productCode,
                     quantity: 1,
                     price: 179.99,
                     subtotal: 179.99,
                  },
               ],
            },
         },
      });

      const order3 = await prisma.order.create({
         data: {
            orderId: "#6003",
            invoiceNo: "INV-6003",
            status: "CONFIRMED",
            orderSource: "RedX",
            paymentMethod: "Card",
            subtotal: 115.0,
            deliveryCharge: 60.0,
            discount: 15.0,
            total: 160.0,
            advancePayment: 160.0,
            dueAmount: 0.0,
            customerId: createdCustomers[2]?.id,
            employeeId: adminUser.id,
            items: {
               create: [
                  {
                     productId: createdProducts[2].id,
                     name: createdProducts[2].productName,
                     code: createdProducts[2].productCode,
                     quantity: 1,
                     price: 115.0,
                     subtotal: 115.0,
                  },
               ],
            },
         },
      });
   }

   // 9. Expenses
   console.log("Seeding expenses...");
   const sampleExpenses = [
      { type: "Office Rent", amount: 1200.0, note: "Monthly retail space rental" },
      { type: "Electricity & Utilities", amount: 185.5, note: "Monthly power & internet bill" },
      { type: "Staff Refreshments", amount: 45.0, note: "Tea, snacks, and mineral water" },
      { type: "POS Paper Rolls & Stationery", amount: 35.0, note: "Thermal receipt paper (pack of 20)" },
   ];

   for (const exp of sampleExpenses) {
      await prisma.expense.create({
         data: {
            type: exp.type,
            amount: exp.amount,
            note: exp.note,
            createdById: adminUser.id,
         },
      });
   }

   // 10. Assets
   console.log("Seeding assets...");
   const sampleAssets = [
      { name: "Touchscreen POS Terminal", category: "Hardware", value: 650.0, description: "All-in-one 15-inch capacitive display" },
      { name: "Thermal Receipt Printer", category: "Hardware", value: 120.0, description: "80mm auto-cutter thermal printer" },
      { name: "Wireless Barcode Scanner", category: "Hardware", value: 75.0, description: "2D QR & Barcode handheld scanner" },
      { name: "Heavy Duty Cash Drawer", category: "Hardware", value: 90.0, description: "Steel electronic RJ11 cash drawer" },
      { name: "Store Shelving Units (Set of 4)", category: "Furniture", value: 450.0, description: "Powder-coated display racks" },
   ];

   for (const a of sampleAssets) {
      await prisma.asset.create({
         data: a,
      });
   }

   // 11. Store Settings (Default to BDT ৳)
   console.log("Seeding store settings...");
   await prisma.storeSetting.upsert({
      where: { id: "default" },
      update: {},
      create: {
         id: "default",
         storeName: "DevX POS",
         tagline: "Smart Retail & Point of Sale",
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
         receiptPaperSize: "80mm",
         invoiceHeader: "DevX POS - Retail Invoice",
         invoiceFooter: "Thank you for shopping with us! Please come again.",
         themeMode: "dark",
         themeColor: "primary",
         enableLowStockAlert: true,
         notifyEmail: "admin@devxpos.com",
      },
   });

   // 12. Billing Transactions
   console.log("Seeding billing transactions...");
   const billingCount = await prisma.billingTransaction.count();
   if (billingCount === 0) {
      await prisma.billingTransaction.createMany({
         data: [
            { amount: 15000.0, paymentMethod: "bKash Merchant", status: "COMPLETED", serviceCharge: 225.0, description: "Weekly POS sales settlement" },
            { amount: 8500.0, paymentMethod: "Nagad Business", status: "COMPLETED", serviceCharge: 127.5, description: "Courier COD settlement payout" },
            { amount: 25000.0, paymentMethod: "City Bank POS", status: "COMPLETED", serviceCharge: 375.0, description: "Credit card gateway batch payout" },
            { amount: 12000.0, paymentMethod: "Cash Handover", status: "PENDING", serviceCharge: 0.0, description: "Cash register handover to bank" },
         ],
      });
   }

   console.log("✅ Database seeding completed successfully!");
}

main()
   .catch((e) => {
      console.error("❌ Seed failed:", e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
   });
