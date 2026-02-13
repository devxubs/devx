import { Stack } from "@mui/material";
import CustomerInfo from "@src/Pages/admin/Customers/CustomerInfo";
import DateRangePickerCustom from "@src/components/DateRange";
import CustomTable from "@src/components/Table";
import { id } from "date-fns/locale";
import React from "react";
import Filter from "./Filter";

export const customerOrderData = [
   {
      id: "#001",
      customerName: "John Doe",
      phone: "+1 (555) 123-4567",
      totalOrders: 350,
      completedOrders: 320,
      failedOrders: 30,
      address: "123 Main Street, New York, NY 10001",
      lastOrderAt: "2025-10-12",
   },
   {
      id: "#002",
      customerName: "Alex Smith",
      phone: "+1 (555) 234-5678",
      totalOrders: 220,
      completedOrders: 200,
      failedOrders: 20,
      address: "45 Sunset Blvd, Los Angeles, CA 90028",
      lastOrderAt: "2025-10-08",
   },
   {
      id: "#003",
      customerName: "Michael Brown",
      phone: "+1 (555) 345-6789",
      totalOrders: 540,
      completedOrders: 500,
      failedOrders: 40,
      address: "78 Lake View Road, Chicago, IL 60616",
      lastOrderAt: "2025-10-15",
   },
   {
      id: "#004",
      customerName: "Emily Johnson",
      phone: "+1 (555) 456-7890",
      totalOrders: 180,
      completedOrders: 165,
      failedOrders: 15,
      address: "22 Park Avenue, Brooklyn, NY 11201",
      lastOrderAt: "2025-09-30",
   },
   {
      id: "#005",
      customerName: "David Wilson",
      phone: "+1 (555) 567-8901",
      totalOrders: 410,
      completedOrders: 380,
      failedOrders: 30,
      address: "9 Hill Street, Austin, TX 73301",
      lastOrderAt: "2025-10-16",
   },
   {
      id: "#006",
      customerName: "Sophia Miller",
      phone: "+1 (555) 678-9012",
      totalOrders: 260,
      completedOrders: 240,
      failedOrders: 20,
      address: "301 River Road, Miami, FL 33101",
      lastOrderAt: "2025-10-10",
   },
   {
      id: "#007",
      customerName: "Daniel Anderson",
      phone: "+1 (555) 789-0123",
      totalOrders: 330,
      completedOrders: 300,
      failedOrders: 30,
      address: "18 Market Street, San Francisco, CA 94103",
      lastOrderAt: "2025-09-25",
   },
   {
      id: "#008",
      customerName: "Olivia Thomas",
      phone: "+1 (555) 890-1234",
      totalOrders: 470,
      completedOrders: 435,
      failedOrders: 35,
      address: "56 Green Lane, Seattle, WA 98101",
      lastOrderAt: "2025-10-14",
   },
   {
      id: "#009",
      customerName: "James Taylor",
      phone: "+1 (555) 901-2345",
      totalOrders: 295,
      completedOrders: 270,
      failedOrders: 25,
      address: "402 Pine Street, Denver, CO 80202",
      lastOrderAt: "2025-10-05",
   },
   {
      id: "#010",
      customerName: "Isabella Moore",
      phone: "+1 (555) 012-3456",
      totalOrders: 390,
      completedOrders: 360,
      failedOrders: 30,
      address: "77 Ocean Drive, San Diego, CA 92101",
      lastOrderAt: "2025-10-11",
   },
];

const Customer = () => {
   const tableData = {
      head: [
         "ID",
         "Customer",
         "Last Order At",
         "Total Orders",
         "Completed Orders",
         "Failed Orders",
         "Address",
      ],

      body: customerOrderData.map((item) => ({
         id: item.id,
         customer: (
            <CustomerInfo name={item.customerName} number={item.phone} />
         ),
         last_order_at: item.lastOrderAt,
         total_orders: item.totalOrders,
         completed_orders: item.completedOrders,
         failed_orders: item.failedOrders,
         address: item.address,
      })),
   };

   return (
      <Stack>
         {/* --------------------------------
               ✅ TABLE
            -------------------------------- */}
         <CustomTable
            type="default"
            head={tableData.head}
            body={tableData.body}
            filter={(data, onChange) => (
               <Filter data={data} onChange={onChange} />
            )}
         />
      </Stack>
   );
};

export default Customer;
