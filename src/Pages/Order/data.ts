import { OrderType } from "./type";

// // 🧑‍💻 1. Customer Information

// Customer Name

// Email Address

// Phone Number

// Billing Address (Street, City, State, ZIP, Country)

// Shipping Address (checkbox: “Same as billing”)

// // 📦 2. Products / Items

// Add Product(s) (search by name or code)

// For each product:

// Product Name / SKU

// Quantity

// Price per unit

// Subtotal (auto-calculated)

// ** 🚚 3. Delivery Details

// Shipping Method (Standard, Express, Overnight, etc.)

// Courier / Ship By (FedEx, UPS, DHL, USPS, etc.)

// Tracking Number (optional, filled later)

// Estimated Delivery Date

// Delivery Instructions (e.g., “Leave at reception”)

// ** 💳 4. Payment Information

// Payment Method (Cash on Delivery, Card, Bank Transfer, Wallet, etc.)

// Payment Status (Pending, Paid, Failed, Refunded)

// Transaction ID (if available)

// If Card → optional details:

// Masked Card Number (**** **** **** 1234)

// Card Type (Visa, Mastercard, Amex)

// ** 🧾 5. Pricing & Discounts

// Subtotal (auto-calculated)

// Shipping Cost

// Discount (manual entry or coupon code)

// Tax / VAT

// Total Amount

// Advance Payment (if applicable)

// Due Amount (auto-calculated)

// ** 📋 6. Order Details

// Order ID (auto-generated)

// Invoice No.

// Order Source (Website, App, Phone, WhatsApp, Messenger)

// Order Status (Pending, Processing, Confirmed, Delivered, Cancelled, etc.)

// Order Note (special instructions)

// ** 📜 7. Extra (Optional but Useful)

// Status History (timestamps of each stage)

// Cancellation Reason (if status = Cancelled)

// Return Status (Requested, Approved, Completed)

//?? ⚡ On the form UI, you can present these as collapsible sections or tabs:

// Customer

// Products

// Delivery

// Payment

// Pricing

// Order Info

// Give it as it is given here.

export const orders: OrderType[] = [
   {
      orderId: "#6012",
      invoiceNo: "INV-6012",
      status: "Pending",
      orderNote: "Leave at reception",
      orderSource: "Mobile App",
      createdAt: "2025-09-12T10:00:00Z",
      updatedAt: "2025-09-12T10:05:00Z",

      employee: { id: "EMP001", name: "John Doe" },
      customer: {
         id: "CUST001",
         name: "Ava Thompson",
         email: "ava.thompson@example.com",
         address: "123 Main Street, Austin, TX 78701",
         phone: "512-555-0192",
      },

      delivery: {
         address: "123 Main Street, Austin, TX 78701",
         shipBy: "FedEx",
         method: "Express",
         trackingNo: "TRK1928374651",
         estimatedDelivery: "2025-09-13T10:00:00Z",
         deliveredAt: "2025-09-13T10:00:00Z",
      },

      payment: {
         method: "Card",
         status: "Paid",
         transactionId: "TXN19283",
         details: { cardMasked: "**** **** **** 4123", cardType: "Visa" },
      },

      products: [
         {
            id: "PRD001",
            name: "Wireless Mouse",
            code: "PRD001",
            quantity: 2,
            price: 25.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 51.98,
         shipping: 0,
         discount: 5,
         taxes: 4.16,
         total: 51.14,
      },
   },

   {
      orderId: "#6013",
      invoiceNo: "INV-6013",
      status: "Processing",
      orderNote: "Handle with care",
      orderSource: "Phone Call",
      createdAt: "2025-09-13T15:00:00Z",

      employee: { id: "EMP002", name: "Alice Smith" },
      customer: {
         id: "CUST002",
         name: "Liam Carter",
         email: "liam.carter@example.com",
         address: "456 Oak Drive, Seattle, WA 98101",
         phone: "206-555-0147",
      },

      delivery: {
         address: "456 Oak Drive, Seattle, WA 98101",
         shipBy: "UPS",
         method: "Standard",
         trackingNo: "TRK8753091276",
      },

      payment: {
         method: "Cash on Delivery",
         status: "Pending",
      },

      products: [
         {
            id: "PRD002",
            name: "Gaming Keyboard",
            code: "PRD002",
            quantity: 1,
            price: 59.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
            ],
         },
         {
            id: "PRD003",
            name: "USB-C Hub",
            code: "PRD003",
            quantity: 1,
            price: 34.95,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 94.94,
         shipping: 5,
         discount: 0,
         taxes: 7.59,
         total: 107.53,
      },
   },

   {
      orderId: "#6014",
      invoiceNo: "INV-6014",
      status: "Confirmed",
      orderNote: "Gift wrap this order",
      orderSource: "Messenger",
      createdAt: "2025-09-11T13:00:00Z",

      employee: { id: "EMP003", name: "Michael Lee" },
      customer: {
         id: "CUST003",
         name: "Sophia Kim",
         email: "sophia.kim@example.com",
         address: "789 Pine St, Denver, CO 80203",
         phone: "303-555-0173",
      },

      delivery: {
         address: "789 Pine St, Denver, CO 80203",
         shipBy: "DHL",
         method: "Standard",
         trackingNo: "TRK0001234567",
      },

      payment: {
         method: "Card",
         status: "Paid",
         details: { cardMasked: "**** **** **** 5678", cardType: "Mastercard" },
      },

      products: [
         {
            id: "PRD007",
            name: "Desk Lamp",
            code: "PRD007",
            quantity: 1,
            price: 22.75,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 22.75,
         shipping: 0,
         discount: 5,
         taxes: 1.79,
         total: 19.54,
      },
   },

   {
      orderId: "#6015",
      invoiceNo: "INV-6015",
      status: "Hold",
      orderNote: "Awaiting confirmation",
      orderSource: "WhatsApp",
      createdAt: "2025-09-11T15:00:00Z",

      employee: { id: "EMP004", name: "Sophia Brown" },
      customer: {
         id: "CUST004",
         name: "Noah Wilson",
         email: "noah.wilson@example.com",
         address: "321 Maple Ave, Chicago, IL 60601",
         phone: "312-555-0132",
      },

      delivery: {
         address: "321 Maple Ave, Chicago, IL 60601",
         shipBy: "USPS",
         method: "Priority",
         trackingNo: "TRK8765432109",
      },

      payment: {
         method: "Card",
         status: "Paid",
         details: { cardMasked: "**** **** **** 8765", cardType: "Amex" },
      },

      products: [
         {
            id: "PRD005",
            name: "Webcam",
            code: "PRD005",
            quantity: 1,
            price: 79.49,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
            ],
         },
         {
            id: "PRD009",
            name: "Wireless Charger",
            code: "PRD009",
            quantity: 1,
            price: 39.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 119.48,
         shipping: 0,
         discount: 10,
         taxes: 9.56,
         total: 119.04,
      },
   },

   {
      orderId: "#6016",
      invoiceNo: "INV-6016",
      status: "Cancelled",
      orderNote: "Customer requested cancellation",
      orderSource: "Website",
      createdAt: "2025-09-11T15:30:00Z",

      employee: { id: "EMP005", name: "David Miller" },
      customer: {
         id: "CUST005",
         name: "Olivia Martinez",
         email: "olivia.martinez@example.com",
         address: "101 Lakeview Blvd, Miami, FL 33101",
         phone: "305-555-0199",
      },

      delivery: {
         address: "101 Lakeview Blvd, Miami, FL 33101",
         shipBy: "UPS",
         method: "Express",
         trackingNo: "TRK9081726354",
      },

      payment: {
         method: "Card",
         status: "Refunded",
         details: { cardMasked: "**** **** **** 9999", cardType: "Visa" },
      },

      products: [
         {
            id: "PRD010",
            name: "Bluetooth Speaker",
            code: "PRD010",
            quantity: 1,
            price: 49.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 49.99,
         shipping: 0,
         discount: 0,
         taxes: 3.99,
         total: 53.98,
      },

      cancellationReason: "Customer changed mind",
   },

   {
      orderId: "#6017",
      invoiceNo: "INV-6017",
      status: "Processing",
      orderNote: "Urgent delivery",
      orderSource: "Messenger",
      createdAt: "2025-09-14T09:00:00Z",

      employee: { id: "EMP006", name: "Emma Wilson" },
      customer: {
         id: "CUST006",
         name: "Ethan Brown",
         email: "ethan.brown@example.com",
         address: "555 Elm St, San Francisco, CA 94102",
         phone: "415-555-0178",
      },

      delivery: {
         address: "555 Elm St, San Francisco, CA 94102",
         shipBy: "DHL",
         method: "Express",
         trackingNo: "TRK5647382910",
      },

      payment: {
         method: "Bank Transfer",
         status: "Paid",
      },

      products: [
         {
            id: "PRD011",
            name: "Noise Cancelling Headphones",
            code: "PRD011",
            quantity: 1,
            price: 129.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
            ],
         },
         {
            id: "PRD012",
            name: "Laptop Stand",
            code: "PRD012",
            quantity: 1,
            price: 45.5,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 175.49,
         shipping: 10,
         discount: 15,
         taxes: 12.84,
         total: 183.33,
      },
   },

   {
      orderId: "#6018",
      invoiceNo: "INV-6018",
      status: "Delivered",
      orderNote: "Ring the bell",
      orderSource: "WhatsApp",
      createdAt: "2025-09-11T20:00:00Z",

      employee: { id: "EMP007", name: "Oliver Taylor" },
      customer: {
         id: "CUST007",
         name: "Emma Davis",
         email: "emma.davis@example.com",
         address: "202 Birch Rd, Dallas, TX 75201",
         phone: "214-555-0164",
      },

      delivery: {
         address: "202 Birch Rd, Dallas, TX 75201",
         shipBy: "FedEx",
         method: "Overnight",
         trackingNo: "TRK5432109876",
         deliveredAt: "2025-09-12T09:00:00Z",
      },

      payment: {
         method: "Wallet",
         status: "Paid",
      },

      products: [
         {
            id: "PRD013",
            name: "Smartwatch",
            code: "PRD013",
            quantity: 1,
            price: 199.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 199.99,
         shipping: 0,
         discount: 20,
         taxes: 14.4,
         total: 194.39,
      },
   },

   {
      orderId: "#6019",
      invoiceNo: "INV-6019",
      status: "Pending",
      orderNote: "Confirm stock before shipping",
      orderSource: "Phone Call",
      createdAt: "2025-09-15T10:00:00Z",

      employee: { id: "EMP008", name: "Ava Martinez" },
      customer: {
         id: "CUST008",
         name: "James Lee",
         email: "james.lee@example.com",
         address: "404 Cedar St, Boston, MA 02108",
         phone: "617-555-0185",
      },

      delivery: {
         address: "404 Cedar St, Boston, MA 02108",
         shipBy: "USPS",
         method: "Priority",
         trackingNo: "TRK2345678910",
      },

      payment: {
         method: "Cash on Delivery",
         status: "Pending",
      },

      products: [
         {
            id: "PRD014",
            name: "Portable SSD",
            code: "PRD014",
            quantity: 1,
            price: 89.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 89.99,
         shipping: 0,
         discount: 0,
         taxes: 6.75,
         total: 96.74,
      },
   },

   {
      orderId: "#6020",
      invoiceNo: "INV-6020",
      status: "Hold",
      orderNote: "Check delivery slot",
      orderSource: "Mobile App",
      createdAt: "2025-09-14T19:00:00Z",

      employee: { id: "EMP009", name: "Liam Thompson" },
      customer: {
         id: "CUST009",
         name: "Isabella Johnson",
         email: "isabella.johnson@example.com",
         address: "606 Spruce Ln, Portland, OR 97201",
         phone: "503-555-0142",
      },

      delivery: {
         address: "606 Spruce Ln, Portland, OR 97201",
         shipBy: "DHL",
         method: "Economy",
         trackingNo: "TRK9081726355",
      },

      payment: {
         method: "Card",
         status: "Paid",
         details: { cardMasked: "**** **** **** 4444", cardType: "Visa" },
      },

      products: [
         {
            id: "PRD015",
            name: "Ergonomic Chair",
            code: "PRD015",
            quantity: 1,
            price: 249.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 249.99,
         shipping: 20,
         discount: 30,
         taxes: 18.9,
         total: 258.89,
      },
   },

   {
      orderId: "#6021",
      invoiceNo: "INV-6021",
      status: "Confirmed",
      orderNote: "Customer prefers evening delivery",
      orderSource: "Website",
      createdAt: "2025-09-13T17:30:00Z",

      employee: { id: "EMP010", name: "Sophia Davis" },
      customer: {
         id: "CUST010",
         name: "William Scott",
         email: "william.scott@example.com",
         address: "707 Aspen Ct, Phoenix, AZ 85001",
         phone: "602-555-0176",
      },

      delivery: {
         address: "707 Aspen Ct, Phoenix, AZ 85001",
         shipBy: "FedEx",
         method: "Standard",
         trackingNo: "TRK1122334455",
      },

      payment: {
         method: "Credit Card",
         status: "Paid",
         details: { cardMasked: "**** **** **** 2222", cardType: "Mastercard" },
      },

      products: [
         {
            id: "PRD016",
            name: "Mechanical Keyboard",
            code: "PRD016",
            quantity: 1,
            price: 109.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
            ],
         },
         {
            id: "PRD017",
            name: "Gaming Mouse Pad",
            code: "PRD017",
            quantity: 1,
            price: 19.99,
            images: [
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
            ],
         },
      ],

      pricing: {
         currency: "USD",
         subtotal: 129.98,
         shipping: 0,
         discount: 10,
         taxes: 9.59,
         total: 129.57,
      },
   },
];
