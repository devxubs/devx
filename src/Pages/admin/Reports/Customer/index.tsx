import { Grid, Stack, Typography } from "@mui/material";
import CustomerInfo from "@src/Pages/admin/Customers/CustomerInfo";
import CustomTable from "@src/components/Table";
import React from "react";
import Filter from "./Filter";
import AnalyticsCard from "@cmp/AnalyticsCard";
import AnalyticsGraph from "@cmp/AnalyticsGraph";

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
   const columns = [
      {
         field: "id",
         headerName: "ID",
         width: 100,
      },
      {
         field: "customerName",
         headerName: "Customer",
         width: 200,
         renderCell: (params: any) => (
            <CustomerInfo
               name={params.row.customerName}
               phone={params.row.phone}
            />
         ),
      },
      {
         field: "lastOrderAt",
         headerName: "Last Order At",
         width: 150,
         renderCell: (params: any) => (
            <Stack justifyContent="center" height={"100%"}>
               <Typography variant="body2" color="textPrimary">
                  {new Date(params.row.lastOrderAt).toLocaleDateString() ||
                     "N/A"}
               </Typography>
            </Stack>
         ),
      },
      {
         field: "totalOrders",
         headerName: "Total Orders",
         width: 150,
      },
      {
         field: "completedOrders",
         headerName: "Completed Orders",
         width: 150,
      },
      {
         field: "failedOrders",
         headerName: "Failed Orders",
         width: 150,
      },
      {
         field: "address",
         headerName: "Address",
         width: 300,
      },
   ];
   return (
      <Stack>
         <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Total Customer"}
                  isPositive={true}
                  data={[10, 30, 40, 40, 30, 10, 20]}
                  value={"1000"}
                  percentage={"90%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"New Customer"}
                  isPositive={true}
                  data={[1, 4, 2, 9, 30, 10, 20]}
                  value={"189"}
                  percentage={"70%"}
               />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
               <AnalyticsCard
                  title={"Repeat Customer"}
                  isPositive={true}
                  data={[1, 9, 5, 2, 10, 30]}
                  value={"50"}
                  percentage={"40%"}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <AnalyticsGraph
                  title={"Customer Growth"}
                  isPositive={true}
                  type="day"
                  data={[
                     { x: "2026-1-01", y: 10 },
                     { x: "2026-1-02", y: 20 },
                     { x: "2026-1-03", y: 15 },
                     { x: "2026-1-04", y: 25 },
                     { x: "2026-1-05", y: 30 },
                     { x: "2026-1-06", y: 28 },
                     { x: "2026-1-07", y: 35 },
                     { x: "2026-1-08", y: 40 },
                     { x: "2026-1-09", y: 38 },
                     { x: "2026-1-10", y: 45 },
                     { x: "2026-1-11", y: 50 },
                     { x: "2026-1-12", y: 48 },
                  ]}
               />
            </Grid>
            <Grid size={{ xs: 12 }}>
               <Stack
                  spacing={2}
                  bgcolor={"background.paper"}
                  sx={{
                     borderRadius: 1.5,
                  }}
               >
                  <Typography
                     variant="h5"
                     fontWeight={700}
                     sx={{
                        px: 3,
                        pt: 2,
                        pb: 0,
                     }}
                  >
                     Repeat Customer
                  </Typography>

                  <CustomTable
                     rows={customerOrderData}
                     columns={columns}
                     filter={(data, onChange) => (
                        <Filter data={data} onChange={onChange} />
                     )}
                  />
               </Stack>
            </Grid>
         </Grid>
      </Stack>
   );
};

export default Customer;
