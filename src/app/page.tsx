"use client";
import { Avatar, IconButton, Stack, Typography } from "@mui/material";
// import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
// import CustomPopover from "@src/components/CustomPopover";
// import Table from "@src/components/Table";
// import DataTable, { ColumnConfig } from "@src/components/Table/DataTable";
// import Layout from "@src/Layout";
import * as React from "react";

// const UserProfile = ({
//    name,
//    email,
//    url,
// }: {
//    name: string;
//    email: string;
//    url?: string;
// }) => {
//    return (
//       <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
//          <Avatar src={url} />
//          <Stack>
//             <Typography
//                variant="body1"
//                fontSize={16}
//                color="textPrimary"
//                sx={{
//                   "&:hover": {
//                      cursor: "pointer",
//                      textDecoration: "underline",
//                   },
//                }}
//             >
//                {name}
//             </Typography>
//             <Typography variant="body2" fontSize={14} color="textSecondary">
//                {email}
//             </Typography>
//          </Stack>
//       </Stack>
//    );
// };

// export const rows = [
//    {
//       id: 1,
//       name: "Jubayer Ahmed",
//       email: "devxub@gmail.com",
//       phone: "01325584606",
//       role: "Manager",
//       hireDateTime: "2021-05-10",
//       salary: 80000,
//       color: "primary",
//    },
//    {
//       id: 2,
//       name: "Najrul Ahmed",
//       email: "najrul787@gmail.com",
//       phone: "01818388585",
//       role: "CEO",
//       hireDateTime: "2019-03-22",
//       salary: 120000,
//       color: "secondary",
//    },
//    {
//       id: 3,
//       name: "John Doe",
//       email: "john.doe@example.com",
//       phone: "01325584606",
//       role: "Sales Manager",
//       hireDateTime: "2020-03-15",
//       salary: 75000,
//       color: "success",
//    },
//    {
//       id: 4,
//       name: "Jane Smith",
//       email: "jane.smith@example.com",
//       phone: "01818388585",
//       role: "HR Specialist",
//       hireDateTime: "2019-07-22",
//       salary: 65000,
//       color: "info",
//    },
//    {
//       id: 5,
//       name: "Mike Johnson",
//       email: "mike.johnson@example.com",
//       phone: "01711223344",
//       role: "Software Developer",
//       hireDateTime: "2021-11-05",
//       salary: 85000,
//       color: "warning",
//    },
// ];

// export const columns: ColumnConfig[] = [
//    {
//       field: "name",
//       headerName: "Name",
//       renderCell: (params: GridRenderCellParams) => (
//          <UserProfile name={params.row.name} email={params.row.email} />
//       ),
//    },
//    {
//       field: "phone",
//       headerName: "Phone Number",
//    },
//    {
//       field: "role",
//       headerName: "Role",
//       chip: true,
//    },
//    {
//       field: "hireDateTime",
//       headerName: "Hire Date Time",
//    },
//    {
//       field: "salary",
//       headerName: "Salary",
//       valueFormatter: (value: number) => `$${value.toLocaleString()}`,
//    },
//    {
//       field: "@actions",
//       headerName: "",
//       menu: [
//          { label: "Edit", onClick: () => {} },
//          { label: "Delete", color: "error", onClick: () => {} },
//       ],
//    },
// ];

export default function Home() {
   return (
      <Stack p={4}>
         {/* <DataTable rows={rows} columns={columns} checkBox={false} /> */}
      </Stack>
   );
}
