import { OrderType } from "./type";

export const paymentMethod = [
   "Cash on Delivery",
   "Card",
   "Bank Transfer",
   "Wallet",
   "Credit Card",
];

export const orders: OrderType[] = [
   {
      id: 1,
      color: "warning",

      orderId: "#6012",
      invoiceNo: "INV-6012",
      status: "Pending",
      orderNote: "Leave at reception",
      orderSource: "Mobile App",
      createdAt: "2025-09-12T10:00:00Z",
      updatedAt: "2025-09-12T10:05:00Z",

      timestamps: {
         createdAt: "2025-09-12T10:00:00Z",
         updatedAt: "2025-09-12T10:05:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP001", name: "John Doe" },
      customer: {
         id: "CUST001",
         name: "Ava Thompson",
         email: "ava.thompson@example.com",
         address: "123 Main Street, Austin, TX 78701",
         phone: "512-555-0192",
      },

      products: [
         {
            id: "PRD001",
            name: "Wireless Mouse",
            code: "PRD001",
            quantity: 2,
            price: 25.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 51.98,
         deliveryCharge: 0,
         discount: 5,
         total: 51.14,
      },
   },

   {
      id: 2,
      color: "info",

      orderId: "#6013",
      invoiceNo: "INV-6013",
      status: "Processing",
      orderNote: "Handle with care",
      orderSource: "Phone Call",
      createdAt: "2025-09-13T15:00:00Z",

      timestamps: {
         createdAt: "2025-09-13T15:00:00Z",
         updatedAt: "2025-09-13T15:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP002", name: "Alice Smith" },
      customer: {
         id: "CUST002",
         name: "Liam Carter",
         email: "liam.carter@example.com",
         address: "456 Oak Drive, Seattle, WA 98101",
         phone: "206-555-0147",
      },

      products: [
         {
            id: "PRD002",
            name: "Gaming Keyboard",
            code: "PRD002",
            quantity: 1,
            price: 59.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
         },
         {
            id: "PRD003",
            name: "USB-C Hub",
            code: "PRD003",
            quantity: 1,
            price: 34.95,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 94.94,
         deliveryCharge: 5,
         discount: 0,
         total: 107.53,
      },
   },

   {
      id: 3,
      color: "primary",

      orderId: "#6014",
      invoiceNo: "INV-6014",
      status: "Confirmed",
      orderNote: "Gift wrap this order",
      orderSource: "Messenger",
      createdAt: "2025-09-11T13:00:00Z",

      timestamps: {
         createdAt: "2025-09-11T13:00:00Z",
         updatedAt: "2025-09-11T13:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP003", name: "Michael Lee" },
      customer: {
         id: "CUST003",
         name: "Sophia Kim",
         email: "sophia.kim@example.com",
         address: "789 Pine St, Denver, CO 80203",
         phone: "303-555-0173",
      },

      products: [
         {
            id: "PRD007",
            name: "Desk Lamp",
            code: "PRD007",
            quantity: 1,
            price: 22.75,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 22.75,
         deliveryCharge: 0,
         discount: 5,
         total: 19.54,
      },
   },

   {
      id: 4,
      color: "default",

      orderId: "#6015",
      invoiceNo: "INV-6015",
      status: "Hold",
      orderNote: "Awaiting confirmation",
      orderSource: "WhatsApp",
      createdAt: "2025-09-11T15:00:00Z",

      timestamps: {
         createdAt: "2025-09-11T15:00:00Z",
         updatedAt: "2025-09-11T15:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP004", name: "Sophia Brown" },
      customer: {
         id: "CUST004",
         name: "Noah Wilson",
         email: "noah.wilson@example.com",
         address: "321 Maple Ave, Chicago, IL 60601",
         phone: "312-555-0132",
      },

      products: [
         {
            id: "PRD005",
            name: "Webcam",
            code: "PRD005",
            quantity: 1,
            price: 79.49,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
         },
         {
            id: "PRD009",
            name: "Wireless Charger",
            code: "PRD009",
            quantity: 1,
            price: 39.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 119.48,
         deliveryCharge: 0,
         discount: 10,
         total: 119.04,
      },
   },

   {
      id: 5,
      color: "error",

      orderId: "#6016",

      invoiceNo: "INV-6016",
      status: "Cancelled",
      orderNote: "Customer requested cancellation",
      orderSource: "Website",
      createdAt: "2025-09-11T15:30:00Z",

      timestamps: {
         createdAt: "2025-09-11T15:30:00Z",
         updatedAt: "2025-09-11T15:30:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP005", name: "David Miller" },
      customer: {
         id: "CUST005",
         name: "Olivia Martinez",
         email: "olivia.martinez@example.com",
         address: "101 Lakeview Blvd, Miami, FL 33101",
         phone: "305-555-0199",
      },

      products: [
         {
            id: "PRD010",
            name: "Bluetooth Speaker",
            code: "PRD010",
            quantity: 1,
            price: 49.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 49.99,
         deliveryCharge: 0,
         discount: 0,
         total: 53.98,
      },

      cancellationReason: "Customer changed mind",
   },

   {
      id: 6,
      color: "info",

      orderId: "#6017",
      invoiceNo: "INV-6017",
      status: "Processing",
      orderNote: "Urgent delivery",
      orderSource: "Messenger",
      createdAt: "2025-09-14T09:00:00Z",

      timestamps: {
         createdAt: "2025-09-14T09:00:00Z",
         updatedAt: "2025-09-14T09:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP006", name: "Emma Wilson" },
      customer: {
         id: "CUST006",
         name: "Ethan Brown",
         email: "ethan.brown@example.com",
         address: "555 Elm St, San Francisco, CA 94102",
         phone: "415-555-0178",
      },

      products: [
         {
            id: "PRD011",
            name: "Noise Cancelling Headphones",
            code: "PRD011",
            quantity: 1,
            price: 129.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
         },
         {
            id: "PRD012",
            name: "Laptop Stand",
            code: "PRD012",
            quantity: 1,
            price: 45.5,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 175.49,
         deliveryCharge: 10,
         discount: 15,
         total: 183.33,
      },
   },

   {
      id: 7,
      color: "success",

      orderId: "#6018",
      invoiceNo: "INV-6018",
      status: "Delivered",
      orderNote: "Ring the bell",
      orderSource: "WhatsApp",
      createdAt: "2025-09-11T20:00:00Z",

      timestamps: {
         createdAt: "2025-09-11T20:00:00Z",
         updatedAt: "2025-09-11T20:00:00Z",
         deliveryTime: "2025-09-11T20:45:00Z",
      },

      employee: { id: "EMP007", name: "Oliver Taylor" },
      customer: {
         id: "CUST007",
         name: "Emma Davis",
         email: "emma.davis@example.com",
         address: "202 Birch Rd, Dallas, TX 75201",
         phone: "214-555-0164",
      },

      products: [
         {
            id: "PRD013",
            name: "Smartwatch",
            code: "PRD013",
            quantity: 1,
            price: 199.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 199.99,
         deliveryCharge: 0,
         discount: 20,
         total: 194.39,
      },
   },

   {
      id: 8,
      color: "warning",

      orderId: "#6019",
      invoiceNo: "INV-6019",
      status: "Pending",
      orderNote: "Confirm stock before deliveryCharge",
      orderSource: "Phone Call",
      createdAt: "2025-09-15T10:00:00Z",

      timestamps: {
         createdAt: "2025-09-15T10:00:00Z",
         updatedAt: "2025-09-15T10:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP008", name: "Ava Martinez" },
      customer: {
         id: "CUST008",
         name: "James Lee",
         email: "james.lee@example.com",
         address: "404 Cedar St, Boston, MA 02108",
         phone: "617-555-0185",
      },

      products: [
         {
            id: "PRD014",
            name: "Portable SSD",
            code: "PRD014",
            quantity: 1,
            price: 89.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 89.99,
         deliveryCharge: 0,
         discount: 0,
         total: 96.74,
      },
   },

   {
      id: 9,
      color: "default",

      orderId: "#6020",
      invoiceNo: "INV-6020",
      status: "Hold",
      orderNote: "Check delivery slot",
      orderSource: "Mobile App",
      createdAt: "2025-09-14T19:00:00Z",

      timestamps: {
         createdAt: "2025-09-14T19:00:00Z",
         updatedAt: "2025-09-14T19:00:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP009", name: "Liam Thompson" },
      customer: {
         id: "CUST009",
         name: "Isabella Johnson",
         email: "isabella.johnson@example.com",
         address: "606 Spruce Ln, Portland, OR 97201",
         phone: "503-555-0142",
      },

      products: [
         {
            id: "PRD015",
            name: "Ergonomic Chair",
            code: "PRD015",
            quantity: 1,
            price: 249.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-2.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 249.99,
         deliveryCharge: 20,
         discount: 30,
         total: 258.89,
      },
   },

   {
      id: 10,
      color: "primary",

      orderId: "#6021",
      invoiceNo: "INV-6021",
      status: "Confirmed",
      orderNote: "Customer prefers evening delivery",
      orderSource: "Website",
      createdAt: "2025-09-13T17:30:00Z",

      timestamps: {
         createdAt: "2025-09-13T17:30:00Z",
         updatedAt: "2025-09-13T17:30:00Z",
         deliveryTime: null,
      },

      employee: { id: "EMP010", name: "Sophia Davis" },
      customer: {
         id: "CUST010",
         name: "William Scott",
         email: "william.scott@example.com",
         address: "707 Aspen Ct, Phoenix, AZ 85001",
         phone: "602-555-0176",
      },

      products: [
         {
            id: "PRD016",
            name: "Mechanical Keyboard",
            code: "PRD016",
            quantity: 1,
            price: 109.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-3.webp",
         },
         {
            id: "PRD017",
            name: "Gaming Mouse Pad",
            code: "PRD017",
            quantity: 1,
            price: 19.99,
            images:
               "https://pub-c5e31b5cdafb419fb247a8ac2e78df7a.r2.dev/public/assets/images/mock/m-product/product-1.webp",
         },
      ],

      pricing: {
         paymentMethod: "Cash on Delivery",
         subtotal: 129.98,
         deliveryCharge: 0,
         discount: 10,
         total: 129.57,
      },
   },
];
