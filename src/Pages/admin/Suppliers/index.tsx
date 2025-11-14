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
import CustomTable, { Head, TableProps } from "@src/components/Table";
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
   id: yup
      .number()
      .integer("ID must be whole number")
      .required("ID is required"),

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
   const tableData: Omit<TableProps, "type"> = {
      head: [
         "@check",
         "Id",
         "Name",
         "Number",
         "Total",
         "Pay",
         "Due",
         "Advance",
         "Pay return",
         "Due return",
         "@action",
      ],
      body: suppliersData as any,
   };

   const [open, setOpen] = useState(false);
   const [supplier, setSuppliers] = useState<SuppliersTypes>(
      {} as SuppliersTypes
   );
   const [isEditMode, setIsEditMode] = useState(false);
   const [openDelete, setOpenDelete] = useState(false);

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
      },
   });

   // Action menu for each row
   const actionMenu = (row: SuppliersTypes) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => {
            setSuppliers(row);
            setIsEditMode(true);
            setOpen(true);
            reset(row);
         },
      },
      {
         label: "print",
         icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
         onClick: () => {
            setSuppliers(row);
            setIsEditMode(true);
            setOpen(true);
            reset(row);
         },
      },
      {
         label: "delete",
         color: "error",
         onClick: () => {
            setSuppliers(row);
            setOpenDelete(true);
         },
         icon: (
            <Icon
               icon="solar:trash-bin-trash-bold"
               size="small"
               color="error"
            />
         ),
      },
   ];

   const onSubmit: SubmitHandler<SuppliersTypes> = (formData) => {
      const newOrder: SuppliersTypes = {
         ...formData,
      };
      setSuppliers(newOrder);
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
                        color: theme.palette.text.primary,
                     }}
                  />
               }
               onClick={() => setOpen(true)}
            >
               Add Supplier
            </Button>
         </Stack>
         <CustomTable
            type={"default"}
            head={tableData.head}
            body={tableData.body}
            actionMenu={(row) => actionMenu(row as any)}
         />
         <CustomModal
            open={open}
            onClose={() => setOpen(false)}
            title="Add Supplier"
         >
            <Stack
               width={600}
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
                           defaultValue={supplier.name}
                           render={({ field }) => (
                              <TextField
                                 {...field}
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
                           defaultValue={supplier.number}
                           render={({ field }) => (
                              <TextField
                                 {...field}
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
                           defaultValue={supplier.email}
                           render={({ field }) => (
                              <TextField
                                 {...field}
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
                           defaultValue={supplier.address}
                           render={({ field }) => (
                              <TextField
                                 {...field}
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
                        setOpen(false);
                        setIsEditMode(false);
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
                     {isEditMode ? "Update Supplier" : "Add Supplier"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <AlertDialog
            open={openDelete}
            onClose={function (): void {
               setOpenDelete(false);
            }}
            type={"error"}
            title={`Are you sure want to delete "${supplier?.name}"?`}
         />
      </Stack>
   );
};

export default Suppliers;
