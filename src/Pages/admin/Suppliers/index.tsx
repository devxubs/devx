"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Button,
   Stack,
   useTheme,
   Grid,
   TextField,
   Typography,
} from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import React, { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

type SuppliersTypes = {
   id: number;
   name: string;
   email: string;
   number: string; // 11 digit BD phone number
   address: string;
   total?: number;
   pay?: number;
   due?: number;
   advance?: number;
   pay_return?: number;
   due_return?: number;
};
export const suppliersData: SuppliersTypes[] = [
   {
      id: 1,
      name: "Md. Rahim",
      email: "md.rahim@example.com",
      number: "01710000001",
      address: "Dhaka, Bangladesh",
      total: 500.0,
      pay: 5000.0,
      due: 4000.0,
      advance: 0.0,
      pay_return: 1500.0,
      due_return: 1500.0,
   },
   {
      id: 2,
      name: "Abdul Karim",
      email: "abdul.karim@example.com",
      number: "01810000002",
      address: "Chittagong, Bangladesh",
      total: 0.0,
      pay: 3200.0,
      due: 3200.0,
      advance: 0.0,
      pay_return: 0.0,
      due_return: 0.0,
   },
   {
      id: 3,
      name: "Jubayer Hosen",
      email: "jubayer.hosen@example.com",
      number: "01610000003",
      address: "Khulna, Bangladesh",
      total: 200.0,
      pay: 2500.0,
      due: 2000.0,
      advance: 0.0,
      pay_return: 700.0,
      due_return: 700.0,
   },
   {
      id: 4,
      name: "Sakib Hasan",
      email: "sakib.hasan@example.com",
      number: "01710000004",
      address: "Sylhet, Bangladesh",
      total: 0.0,
      pay: 1500.0,
      due: 1000.0,
      advance: 200.0,
      pay_return: 300.0,
      due_return: 300.0,
   },
   {
      id: 5,
      name: "Hasan Ali",
      email: "hasan.ali@example.com",
      number: "01910000005",
      address: "Barishal, Bangladesh",
      total: 600.0,
      pay: 800.0,
      due: 700.0,
      advance: 0.0,
      pay_return: 700.0,
      due_return: 700.0,
   },
   {
      id: 6,
      name: "Iqbal Ahmed",
      email: "iqbal.ahmed@example.com",
      number: "01710000006",
      address: "Rajshahi, Bangladesh",
      total: 200.0,
      pay: 4000.0,
      due: 3500.0,
      advance: 0.0,
      pay_return: 700.0,
      due_return: 700.0,
   },
   {
      id: 7,
      name: "Nazmul Islam",
      email: "nazmul.islam@example.com",
      number: "01510000007",
      address: "Mymensingh, Bangladesh",
      total: 0.0,
      pay: 500.0,
      due: 500.0,
      advance: 0.0,
      pay_return: 0.0,
      due_return: 0.0,
   },
   {
      id: 8,
      name: "Rafiq",
      email: "rafiq@example.com",
      number: "01410000008",
      address: "Rangpur, Bangladesh",
      total: 100.0,
      pay: 1200.0,
      due: 1000.0,
      advance: 100.0,
      pay_return: 200.0,
      due_return: 200.0,
   },
   {
      id: 9,
      name: "Imran",
      email: "imran@example.com",
      number: "01310000009",
      address: "Tangail, Bangladesh",
      total: 250.0,
      pay: 900.0,
      due: 850.0,
      advance: 0.0,
      pay_return: 300.0,
      due_return: 300.0,
   },
   {
      id: 10,
      name: "Shakil",
      email: "shakil@example.com",
      number: "01710000010",
      address: "Jessore, Bangladesh",
      total: 0.0,
      pay: 1400.0,
      due: 1200.0,
      advance: 50.0,
      pay_return: 250.0,
      due_return: 250.0,
   },
];

export const SuppliersSchema = yup.object({
   name: yup
      .string()
      .min(2, "Name is too short")
      .max(50, "Name is too long")
      .required("Name is required"),

   number: yup
      .string()
      .matches(/^01[0-9]{9}$/, "Invalid Bangladeshi mobile number")
      .required("Mobile number is required"),

   email: yup
      .string()
      .email("Invalid email format")
      .required("Email is required"),

   address: yup.string().required("Address is required"),
});

export type SupplierFormValues = yup.InferType<typeof SuppliersSchema>;

const Suppliers = () => {
   const theme = useTheme();
   const columns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "Id",
         flex: 0.1,
      },
      {
         field: "name",
         headerName: "Name",
         flex: 1,
         renderCell: (params) => (
            <Stack height={"100%"} justifyContent={"center"}>
               <Typography
                  variant="subtitle2"
                  color="textPrimary"
                  fontSize={15}
                  fontWeight={500}
               >
                  {params.row.name}
               </Typography>
               <Typography
                  variant="subtitle1"
                  fontSize={13}
                  color="text.secondary"
               >
                  {params.row.number}
               </Typography>
            </Stack>
         ),
      },
      {
         field: "address",
         headerName: "Address",
         flex: 1,
      },
      {
         field: "total",
         headerName: "Total",
      },
      {
         field: "pay",
         headerName: "Pay",
      },
      {
         field: "due",
         headerName: "Due",
      },
      {
         field: "advance",
         headerName: "Advance",
      },
      {
         field: "pay_return",
         headerName: "Pay Return",
      },
      {
         field: "due_return",
         headerName: "Due Return",
      },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [suppliers, setSuppliers] = useState<SuppliersTypes[]>(suppliersData);

   // modal
   const [open, setModalOpen] = useState(false);

   // edit
   const [edit, setEdit] = useState<SuppliersTypes | null>(null);

   // delete
   const [deleteOpen, setDeleteOpen] = useState<SuppliersTypes | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<SupplierFormValues>({
      resolver: yupResolver<SupplierFormValues, any, any>(SuppliersSchema),
      defaultValues: {
         name: "",
         number: "",
         email: "",
         address: "",
      },
   });

   const onSubmit: SubmitHandler<SupplierFormValues> = (formData) => {
      const newSupplier: SuppliersTypes = {
         id: suppliers.length + 1,
         ...formData,
         advance: 0,
         due: 0,
         pay: 0,
         pay_return: 0,
         due_return: 0,
         total: 0,
      };

      if (!edit) {
         setSuppliers([...suppliers, newSupplier]);
      } else {
         setSuppliers(
            suppliers.map((s) =>
               s.id === edit.id ? { ...s, ...formData } : s,
            ),
         );
         setEdit(null);
      }

      setModalOpen(false);
   };

   return (
      <Stack spacing={2} py={2}>
         {/* Header */}
         <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button
               variant="contained"
               color="primary"
               startIcon={
                  <Icon
                     icon="mingcute:add-line"
                     style={{
                        color: theme.palette.common.white,
                     }}
                  />
               }
               onClick={() => {
                  reset({
                     name: "",
                     number: "",
                     email: "",
                     address: "",
                  });

                  setModalOpen(true);
               }}
            >
               Add Supplier
            </Button>
         </Stack>
         <CustomTable
            rows={suppliers}
            columns={columns}
            checkBox={true}
            menuItems={[
               {
                  label: "edit",
                  onClick: (p) => {
                     setEdit(p.row);
                     setModalOpen(true);
                  },
               },
               {
                  label: "print",
                  onClick: (p) => {},
               },
               {
                  label: "delete",
                  color: "error",
                  onClick: (p) => {
                     setDeleteOpen(p.row);
                  },
               },
            ]}
         />
         <CustomModal
            open={open}
            onClose={() => setModalOpen(false)}
            title="Add Supplier"
         >
            <Stack
               width={{
                  xs: "90vw",
                  sm: "500px",
               }}
               p={{
                  xs: 2,
                  sm: 1,
               }}
               component={"form"}
               onSubmit={handleSubmit(onSubmit)}
            >
               <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Full Name
                        </Typography>
                        <Controller
                           name="name"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Name"
                                 label="Name"
                                 error={!!errors.name}
                                 helperText={errors.name?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Mobile Number
                        </Typography>
                        <Controller
                           name="number"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Number"
                                 label="Number"
                                 error={!!errors.number}
                                 helperText={errors.number?.message}
                                 type="number"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Email
                        </Typography>
                        <Controller
                           name="email"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Email"
                                 label="Email"
                                 error={!!errors.email}
                                 helperText={errors.email?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Address
                        </Typography>
                        <Controller
                           name="address"
                           control={control}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 value={field.value}
                                 onChange={field.onChange}
                                 fullWidth
                                 placeholder="Address"
                                 label="Address"
                                 error={!!errors.address}
                                 helperText={errors.address?.message}
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
               </Grid>
               <Stack
                  spacing={2}
                  direction="row"
                  justifyContent="flex-end"
                  width="100%"
                  mt={2}
               >
                  <Button
                     variant="text"
                     color="inherit"
                     onClick={() => {
                        reset();
                        setModalOpen(false);
                        setEdit(null);
                     }}
                  >
                     Cancel
                  </Button>

                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     sx={{
                        position: "relative",
                        overflow: "hidden",
                     }}
                  >
                     {edit ? "Update Supplier" : "Add Supplier"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <AlertDialog
            open={Boolean(deleteOpen)}
            type={"error"}
            title={`Are you sure want to delete "${deleteOpen?.name}"?`}
            onConfirm={() => {
               setSuppliers(suppliers.filter((s) => s.id !== deleteOpen?.id));
               setDeleteOpen(null);
            }}
            onClose={function (): void {
               setDeleteOpen(null);
            }}
         />
      </Stack>
   );
};

export default Suppliers;
