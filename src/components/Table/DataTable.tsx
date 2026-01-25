"use client";

import {
   Stack,
   Avatar,
   Typography,
   Box,
   IconButton,
   alpha,
   useTheme,
} from "@mui/material";
import {
   DataGrid,
   GridRowsProp,
   GridColDef,
   GridRenderCellParams,
} from "@mui/x-data-grid";
import { useEffect, useState } from "react";

const UserProfile = ({
   name,
   email,
   url,
}: {
   name: string;
   email: string;
   url?: string;
}) => {
   return (
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
         <Avatar src={url} />
         <Stack>
            <Typography
               variant="body1"
               fontSize={16}
               color="textPrimary"
               sx={{
                  "&:hover": {
                     cursor: "pointer",
                     textDecoration: "underline",
                  },
               }}
            >
               {name}
            </Typography>
            <Typography variant="body2" fontSize={14} color="textSecondary">
               {email}
            </Typography>
         </Stack>
      </Stack>
   );
};

import MoreVertIcon from "@mui/icons-material/MoreVert";

export const rows = [
   {
      id: 1,
      name: "Jubayer Ahmed",
      email: "devxub@gmail.com",
      phone: "01325584606",
      role: "Manager",
      hireDate: "2021-05-10",
      salary: 80000,
   },
   {
      id: 2,
      name: "Najrul Ahmed",
      email: "najrul787@gmail.com",
      phone: "01818388585",
      role: "CEO",
      hireDate: "2019-03-22",
      salary: 120000,
   },
   {
      id: 3,
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "01325584606",
      role: "Sales Manager",
      hireDate: "2020-03-15",
      salary: 75000,
   },
   {
      id: 4,
      name: "Jane Smith",
      email: "jane.smith@example.com",
      phone: "01818388585",
      role: "HR Specialist",
      hireDate: "2019-07-22",
      salary: 65000,
   },
   {
      id: 5,
      name: "Mike Johnson",
      email: "mike.johnson@example.com",
      phone: "01711223344",
      role: "Software Developer",
      hireDate: "2021-11-05",
      salary: 85000,
   },
];

export const columns: GridColDef[] = [
   {
      field: "name",
      headerName: "Name",
      flex: 1.6,
      minWidth: 260,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
         <UserProfile name={params.row.name} email={params.row.email} />
      ),
   },
   {
      field: "phone",
      headerName: "Phone Number",
      flex: 1,
      minWidth: 160,
   },
   {
      field: "role",
      headerName: "Role",
      flex: 1,
      minWidth: 160,
   },
   {
      field: "hireDate",
      headerName: "Hire Date",
      flex: 1,
      minWidth: 140,
   },
   {
      field: "salary",
      headerName: "Salary",
      flex: 1,
      minWidth: 120,
      valueFormatter: (value: number) => `$${value.toLocaleString()}`,
   },
   {
      field: "actions",
      headerName: "",
      width: 50,
      sortable: false,
      filterable: false,
      renderCell: () => (
         <IconButton size="small">
            <MoreVertIcon fontSize="small" />
         </IconButton>
      ),
   },
];

export default function DataTable() {
   const theme = useTheme();
   const [mounted, setMounted] = useState(false);

   useEffect(() => {
      setMounted(true);
   }, []);

   if (!mounted) return null; // or loader

   return (
      <div style={{ height: 400, width: "100%" }}>
         <DataGrid
            rows={rows}
            columns={columns}
            checkboxSelection
            disableRowSelectionOnClick
            density="comfortable"
            autoHeight
            sx={{
               border: "none",

               "& .MuiDataGrid-columnHeaders > div": {
                  height: "auto!important",
                  p: 1,
                  backgroundColor:
                     alpha(theme.palette.grey[700], 0.1) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor: theme.palette.grey[700],
                  }),
               },
               "& .MuiDataGrid-columnHeader": {
                  backgroundColor:
                     alpha(theme.palette.grey[700], 0.1) + "!important",
                  ...theme.applyStyles("dark", {
                     backgroundColor: theme.palette.grey[700],
                  }),
               },

               "& .MuiDataGrid-columnHeader:focus": {
                  outline: "none",
               },
               "& .MuiDataGrid-columnHeader:focus-within": {
                  outline: "none",
               },

               /* column header title focus (extra safe) */
               "& .MuiDataGrid-columnHeaderTitleContainer:focus": {
                  outline: "none",
               },
               // "& .MuiDataGrid-columnHeaders": {
               //    backgroundColor: "rgba(255,255,255,0.04)",
               //    fontWeight: 600,
               // },
               "& .MuiDataGrid-row": {
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
               },
               "& .MuiDataGrid-cell": {
                  outline: "none !important",
                  border: 0,
               },
            }}
         />
      </div>
   );
}
