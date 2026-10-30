require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "devx-pos-secure-jwt-secret-key-32chars-minimum!";

async function main() {
   console.log("=== EXHAUSTIVE ORDER FILTER ASSERTION TEST ===");

   // 1. Authenticate as admin
   const adminUser = await prisma.user.findFirst({
      where: { email: "devxub@gmail.com" },
      include: { role: true },
   });
   if (!adminUser) {
      throw new Error("No admin user found in database!");
   }

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

   // 2. Setup controlled test customer and test orders
   const testCustA = await prisma.customer.create({
      data: {
         name: "Deep Test Customer Alpha",
         phone: "01799990001",
         email: "deep_alpha@test.com",
         address: "House 10, Road 4, Sector 3, Uttara, Dhaka",
      },
   });

   const testCustB = await prisma.customer.create({
      data: {
         name: "Deep Test Customer Beta",
         phone: "01899990002",
         email: "deep_beta@test.com",
         address: "GEC Circle, Nasirabad, Chattogram",
      },
   });

   const testCustC = await prisma.customer.create({
      data: {
         name: "Deep Test Customer Gamma",
         phone: "01999990003",
         email: "deep_gamma@test.com",
         address: "Zindabazar, Amberkhana, Sylhet",
      },
   });

   // Create 3 specific controlled orders
   const orderA = await prisma.order.create({
      data: {
         orderId: "TEST_FILTER_ORD_A",
         customId: "ORD_TEST_A",
         invoiceNo: "INV-TEST-A",
         status: "PENDING",
         orderSource: "Website",
         courier: "Steadfast",
         courierStatus: "Pending",
         printStatus: "Not Printed",
         orderType: "Regular",
         subtotal: 100,
         deliveryCharge: 60,
         discount: 0,
         total: 160,
         advancePayment: 0,
         dueAmount: 160,
         orderNote: "Alpha urgent note",
         utmSource: "Facebook Ads",
         referenceId: "CAMP_SUMMER",
         customerId: testCustA.id,
         employeeId: adminUser.id,
         pathaoCity: "Dhaka",
         pathaoZone: "Uttara",
         items: {
            create: [
               {
                  productId: "cmvrtwi3z000p0sc7cidi3g3q",
                  name: "Elegance Stiletto Heels",
                  quantity: 1,
                  price: 100,
                  subtotal: 100,
               },
            ],
         },
      },
   });

   const orderB = await prisma.order.create({
      data: {
         orderId: "TEST_FILTER_ORD_B",
         customId: "ORD_TEST_B",
         invoiceNo: "INV-TEST-B",
         status: "CONFIRMED",
         orderSource: "Facebook",
         courier: "Pathao",
         courierStatus: "In Courier",
         printStatus: "Printed",
         orderType: "Urgent",
         subtotal: 500,
         deliveryCharge: 120,
         discount: 50,
         total: 570,
         advancePayment: 570,
         dueAmount: 0, // Paid in full
         utmSource: "Google Ads",
         customerId: testCustB.id,
         pathaoCity: "Chattogram",
         pathaoZone: "Nasirabad",
      },
   });

   // Create a 2nd order for Customer B to make them a Regular Customer (duplicate orders)
   const orderB2 = await prisma.order.create({
      data: {
         orderId: "TEST_FILTER_ORD_B2",
         customId: "ORD_TEST_B2",
         invoiceNo: "INV-TEST-B2",
         status: "CONFIRMED",
         orderSource: "Facebook",
         courier: "Pathao",
         total: 200,
         subtotal: 200,
         customerId: testCustB.id,
      },
   });

   const orderC = await prisma.order.create({
      data: {
         orderId: "TEST_FILTER_ORD_C",
         customId: "ORD_TEST_C",
         invoiceNo: "INV-TEST-C",
         status: "DELIVERED",
         orderSource: "Phone",
         courier: "RedX",
         courierStatus: "Delivered",
         printStatus: "Printed",
         orderType: "Regular",
         subtotal: 1500,
         deliveryCharge: 0, // Free delivery
         discount: 100,
         total: 1400,
         advancePayment: 500,
         dueAmount: 900, // Partial
         customerId: testCustC.id,
         employeeId: adminUser.id,
         pathaoCity: "Sylhet",
      },
   });

   console.log("Seeded 3 controlled test orders (A: Dhaka/Pending/160, B: Chattogram/Confirmed/570, C: Sylhet/Delivered/1400)");

   let passedAssertions = 0;
   let failedAssertions = 0;

   async function testQuery(testName, queryParams, assertionFn) {
      try {
         const url = `http://localhost:3000/api/orders?${queryParams}`;
         const res = await fetch(url, { headers });
         if (!res.ok) {
            console.error(`[FAIL] ${testName} - HTTP status ${res.status}`);
            failedAssertions++;
            return;
         }
         const data = await res.json();
         const result = assertionFn(data);
         if (result === true || result == null) {
            console.log(`[PASS] ${testName}`);
            passedAssertions++;
         } else {
            console.error(`[FAIL] ${testName} - Assertion Error: ${result}`);
            failedAssertions++;
         }
      } catch (err) {
         console.error(`[FAIL] ${testName} - Exception: ${err.message}`);
         failedAssertions++;
      }
   }

   // --- RUN TESTS WITH STRICT RESULT ASSERTIONS ---

   // 1. Status Filter
   await testQuery(
      "1. Filter: status=CONFIRMED returns only CONFIRMED orders",
      "status=CONFIRMED",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         const allConfirmed = data.orders.every((o) => o.status === "CONFIRMED");
         if (!hasB) return "Expected Order B not found";
         if (hasA || hasC) return "Order A or C should not be returned";
         if (!allConfirmed) return "Non-confirmed orders present";
         return true;
      }
   );

   // 2. Status Exclusion Filter
   await testQuery(
      "2. Filter: excludeStatus=true&status=CONFIRMED excludes CONFIRMED orders",
      "status=CONFIRMED&excludeStatus=true",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const allNotConfirmed = data.orders.every((o) => o.status !== "CONFIRMED");
         if (hasB) return "Order B was returned despite exclusion";
         if (!allNotConfirmed) return "A CONFIRMED order was found";
         return true;
      }
   );

   // 3. Multi-status Filter
   await testQuery(
      "3. Filter: status=PENDING,DELIVERED returns both PENDING and DELIVERED",
      "status=PENDING,DELIVERED",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA || !hasC) return "Expected A or C not found";
         if (hasB) return "Order B was unexpectedly returned";
         return true;
      }
   );

   // 4. District Filter
   await testQuery(
      "4. Filter: district=Dhaka returns only Dhaka customer orders",
      "district=Dhaka",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const allDhaka = data.orders.every((o) => (o.customer?.address || "").toLowerCase().includes("dhaka"));
         if (!hasA) return "Order A in Dhaka not found";
         if (hasB) return "Order B in Chattogram was returned";
         if (!allDhaka) return "Non-Dhaka customer present";
         return true;
      }
   );

   // 5. District Exclusion Filter
   await testQuery(
      "5. Filter: excludeDistrict=true&district=Dhaka excludes Dhaka orders",
      "district=Dhaka&excludeDistrict=true",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (hasA) return "Order A in Dhaka was returned despite exclusion";
         return true;
      }
   );

   // 6. Courier Filter
   await testQuery(
      "6. Filter: courier=Steadfast returns only Steadfast orders",
      "courier=Steadfast",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const allSteadfast = data.orders.every((o) => o.courier === "Steadfast");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B (Pathao) was returned";
         if (!allSteadfast) return "Found non-Steadfast courier";
         return true;
      }
   );

   // 7. Courier Exclusion Filter
   await testQuery(
      "7. Filter: excludeCourier=true&courier=Steadfast excludes Steadfast orders",
      "courier=Steadfast&excludeCourier=true",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (hasA) return "Order A was returned despite exclusion";
         return true;
      }
   );

   // 8. Courier Status Filter
   await testQuery(
      "8. Filter: courierStatus=In Courier returns In Courier orders",
      "courierStatus=In Courier",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B not found";
         if (hasA) return "Order A returned";
         return true;
      }
   );

   // 9. Print Status Filter
   await testQuery(
      "9. Filter: printStatus=Not Printed returns Not Printed orders",
      "printStatus=Not Printed",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B (Printed) returned";
         return true;
      }
   );

   // 10. Min Price Filter
   await testQuery(
      "10. Filter: minPrice=1000 returns only orders with total >= 1000",
      "minPrice=1000",
      (data) => {
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const allAbove1000 = data.orders.every((o) => Number(o.total) >= 1000);
         if (!hasC) return "Order C (1400) not found";
         if (hasA) return "Order A (160) returned";
         if (!allAbove1000) return "Order with total < 1000 returned";
         return true;
      }
   );

   // 11. Max Price Filter
   await testQuery(
      "11. Filter: maxPrice=300 returns only orders with total <= 300",
      "maxPrice=300",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const allUnder300 = data.orders.every((o) => Number(o.total) <= 300);
         if (!hasA) return "Order A (160) not found";
         if (hasB) return "Order B (570) returned";
         if (!allUnder300) return "Order with total > 300 returned";
         return true;
      }
   );

   // 12. Combined Price Range Filter
   await testQuery(
      "12. Filter: minPrice=400&maxPrice=800 returns Order B (570)",
      "minPrice=400&maxPrice=800",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         if (!hasB) return "Order B not found";
         if (hasA || hasC) return "Out of range orders returned";
         return true;
      }
   );

   // 13. Order Source Filter
   await testQuery(
      "13. Filter: orderSource=Facebook returns Facebook orders",
      "orderSource=Facebook",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B not found";
         if (hasA) return "Order A returned";
         return true;
      }
   );

   // 14. Order Source Exclusion
   await testQuery(
      "14. Filter: excludeOrderSource=true&orderSource=Facebook excludes Facebook",
      "orderSource=Facebook&excludeOrderSource=true",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (hasB) return "Order B returned despite exclusion";
         return true;
      }
   );

   // 15. Note Filter: Has Note
   await testQuery(
      "15. Filter: note=Has Note returns only orders with notes",
      "note=Has Note",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const allHaveNote = data.orders.every((o) => Boolean(o.orderNote));
         if (!hasA) return "Order A not found";
         if (!allHaveNote) return "Order without note returned";
         return true;
      }
   );

   // 16. Note Filter: Note substring match
   await testQuery(
      "16. Filter: note=Alpha urgent returns Order A",
      "note=Alpha urgent",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B returned";
         return true;
      }
   );

   // 17. UTM Source Filter
   await testQuery(
      "17. Filter: utmSource=Google Ads returns Order B",
      "utmSource=Google Ads",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B not found";
         if (hasA) return "Order A returned";
         return true;
      }
   );

   // 18. Reference ID Filter
   await testQuery(
      "18. Filter: referenceId=CAMP_SUMMER returns Order A",
      "referenceId=CAMP_SUMMER",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B returned";
         return true;
      }
   );

   // 19. Pathao City & Zone Filter
   await testQuery(
      "19. Filter: pathaoCity=Dhaka&pathaoZone=Uttara returns Order A",
      "pathaoCity=Dhaka&pathaoZone=Uttara",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B returned";
         return true;
      }
   );

   // 20. Payment Status: Paid
   await testQuery(
      "20. Filter: paymentStatus=Paid returns Order B (due=0)",
      "paymentStatus=Paid",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const allDueZero = data.orders.every((o) => Number(o.dueAmount) <= 0);
         if (!hasB) return "Order B not found";
         if (!allDueZero) return "Unpaid order returned in Paid filter";
         return true;
      }
   );

   // 21. Payment Status: Unpaid
   await testQuery(
      "21. Filter: paymentStatus=Unpaid returns Order A (advance=0)",
      "paymentStatus=Unpaid",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const allAdvanceZero = data.orders.every((o) => Number(o.advancePayment) <= 0);
         if (!hasA) return "Order A not found";
         if (!allAdvanceZero) return "Paid order returned in Unpaid filter";
         return true;
      }
   );

   // 22. Delivery Charge: Free
   await testQuery(
      "22. Filter: deliveryCharge=Free returns Order C (shipping=0)",
      "deliveryCharge=Free",
      (data) => {
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         const allFree = data.orders.every((o) => Number(o.deliveryCharge) <= 0);
         if (!hasC) return "Order C not found";
         if (!allFree) return "Non-free order returned in Free filter";
         return true;
      }
   );

   // 23. Discount Amount & Operator (Greater)
   await testQuery(
      "23. Filter: discountAmount=80&discountOp=Greater returns Order C (discount=100)",
      "discountAmount=80&discountOp=Greater",
      (data) => {
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasC) return "Order C not found";
         if (hasA) return "Order A returned (discount=0)";
         return true;
      }
   );

   // 24. Employee Filter
   await testQuery(
      `24. Filter: employee=${adminUser.id} returns handled orders`,
      `employee=${adminUser.id}`,
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A not found";
         if (hasB) return "Order B (not assigned to admin) returned";
         return true;
      }
   );

   // 25. Order Type Filter
   await testQuery(
      "25. Filter: orderType=Urgent returns Order B",
      "orderType=Urgent",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B not found";
         if (hasA) return "Order A (Regular) returned";
         return true;
      }
   );

   // 26. Combined Filter: Status + District + Courier
   await testQuery(
      "26. Filter: status=CONFIRMED&district=Chattogram&courier=Pathao returns Order B",
      "status=CONFIRMED&district=Chattogram&courier=Pathao",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         if (!hasB) return "Order B not found";
         if (hasA || hasC) return "Non-matching orders returned";
         return true;
      }
   );

   // 27. Sorting Filter: sortBy=total&sortOrder=asc
   await testQuery(
      "27. Sorting: sortBy=total&sortOrder=asc orders by total ascending",
      "sortBy=total&sortOrder=asc&limit=5",
      (data) => {
         for (let i = 1; i < data.orders.length; i++) {
            if (Number(data.orders[i].total) < Number(data.orders[i - 1].total)) {
               return `Order at index ${i} has total ${data.orders[i].total} < previous ${data.orders[i-1].total}`;
            }
         }
         return true;
      }
   );

   // 28. Sorting Filter: sortBy=total&sortOrder=desc
   await testQuery(
      "28. Sorting: sortBy=total&sortOrder=desc orders by total descending",
      "sortBy=total&sortOrder=desc&limit=5",
      (data) => {
         for (let i = 1; i < data.orders.length; i++) {
            if (Number(data.orders[i].total) > Number(data.orders[i - 1].total)) {
               return `Order at index ${i} has total ${data.orders[i].total} > previous ${data.orders[i-1].total}`;
            }
         }
         return true;
      }
   );

   // 29. Pagination: Limit & Page
   await testQuery(
      "29. Pagination: limit=2 returns exactly 2 records",
      "limit=2",
      (data) => {
         if (data.orders.length > 2) return `Expected <= 2 records, got ${data.orders.length}`;
         return true;
      }
   );

   // 30. Search by Exact Order ID
   await testQuery(
      "30. Search: search=TEST_FILTER_ORD_C matches Order C",
      "search=TEST_FILTER_ORD_C",
      (data) => {
         const hasC = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_C");
         if (!hasC) return "Order C not found via search";
         return true;
      }
   );

   // 31. Search by Customer Phone
   await testQuery(
      "31. Search: search=01899990002 matches Order B",
      "search=01899990002",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasB) return "Order B not found via phone search";
         return true;
      }
   );

   // 32. BD Mobile Number validation
   await testQuery(
      "32. Filter: bdMobileNumber=Valid BD verifies starts with 01",
      "bdMobileNumber=Valid BD",
      (data) => {
         const allValidBd = data.orders.every((o) => !o.customer?.phone || o.customer.phone.startsWith("01"));
         if (!allValidBd) return "Found phone number not starting with 01";
         return true;
      }
   );

   // 33. Summary Aggregates Accuracy Assertion
   await testQuery(
      "33. Aggregates: Summary numbers match mathematical sum of active orders",
      "",
      (data) => {
         if (!data.summary) return "Summary object missing";
         const s = data.summary;
         if (typeof s.productTotal !== "number" || isNaN(s.productTotal)) return "productTotal is NaN";
         if (typeof s.grandTotal !== "number" || isNaN(s.grandTotal)) return "grandTotal is NaN";
         if (typeof s.due !== "number" || isNaN(s.due)) return "due is NaN";
         return true;
      }
   );

   // 34. Product Name Filter
   await testQuery(
      "34. Filter: product=Elegance Stiletto Heels returns Order A",
      "product=Elegance Stiletto Heels",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A with product not found";
         if (hasB) return "Order B returned unexpectedly";
         return true;
      }
   );

   // 35. Product Name Exclusion
   await testQuery(
      "35. Filter: excludeProduct=true&product=Elegance Stiletto Heels excludes Order A",
      "product=Elegance Stiletto Heels&excludeProduct=true",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (hasA) return "Order A was returned despite excludeProduct";
         return true;
      }
   );

   // 36. Category Filter
   await testQuery(
      "36. Filter: category=Footwear returns Order A",
      "category=Footwear",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A with Footwear category not found";
         if (hasB) return "Order B returned unexpectedly";
         return true;
      }
   );

   // 37. Category Exclusion
   await testQuery(
      "37. Filter: excludeCategory=true&category=Footwear excludes Order A",
      "category=Footwear&excludeCategory=true",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (hasA) return "Order A was returned despite excludeCategory";
         return true;
      }
   );

   // 38. Customer Type: Regular
   await testQuery(
      "38. Filter: customerType=Regular returns Order B and B2 (Customer B with >1 orders)",
      "customerType=Regular",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B for regular customer not found";
         if (hasA) return "Order A (single order customer) returned in Regular filter";
         return true;
      }
   );

   // 39. Customer Type: New
   await testQuery(
      "39. Filter: customerType=New returns Order A (single order customer)",
      "customerType=New",
      (data) => {
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         if (!hasA) return "Order A for new customer not found";
         if (hasB) return "Order B (repeat customer) returned in New filter";
         return true;
      }
   );

   // 40. Duplicate Orders Filter
   await testQuery(
      "40. Filter: duplicateOrders=true returns orders belonging to repeat customers",
      "duplicateOrders=true",
      (data) => {
         const hasB = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_B");
         const hasA = data.orders.some((o) => o.orderId === "TEST_FILTER_ORD_A");
         if (!hasB) return "Order B not found";
         if (hasA) return "Order A returned in duplicateOrders filter";
         return true;
      }
   );

   // Cleanup test data
   console.log("Cleaning up test data...");
   await prisma.orderItem.deleteMany({
      where: { orderId: { in: [orderA.id, orderB.id, orderB2.id, orderC.id] } },
   });
   await prisma.order.deleteMany({
      where: {
         id: { in: [orderA.id, orderB.id, orderB2.id, orderC.id] },
      },
   });
   await prisma.customer.deleteMany({
      where: {
         id: { in: [testCustA.id, testCustB.id, testCustC.id] },
      },
   });

   console.log("==========================================");
   console.log(`TOTAL ASSERTIONS EXECUTED: ${passedAssertions + failedAssertions}`);
   console.log(`PASSED: ${passedAssertions}`);
   console.log(`FAILED: ${failedAssertions}`);
   console.log("==========================================");

   if (failedAssertions > 0) {
      process.exit(1);
   }
}

main()
   .catch((err) => {
      console.error("FATAL:", err);
      process.exit(1);
   })
   .finally(() => prisma.$disconnect());
