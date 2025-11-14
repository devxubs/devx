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

type ExpenseItem = {
   id: number;
   type: string;
   date: string;
   amount: string;
   note: string;
};

const expenses: ExpenseItem[] = [
   {
      id: 1,
      type: "Food",
      date: "2025-10-20",
      amount: "15.99",
      note: "Lunch at local restaurant",
   },
   {
      id: 2,
      type: "Transport",
      date: "2025-10-21",
      amount: "8.5",
      note: "Uber ride to office",
   },
   {
      id: 3,
      type: "Utilities",
      date: "2025-10-18",
      amount: "60",
      note: "Electricity bill payment",
   },
   {
      id: 4,
      type: "Groceries",
      date: "2025-10-19",
      amount: "45.75",
      note: "Weekly grocery shopping",
   },
   {
      id: 5,
      type: "Entertainment",
      date: "2025-10-17",
      amount: "25",
      note: "Netflix subscription renewal",
   },
   {
      id: 6,
      type: "Health",
      date: "2025-10-22",
      amount: "12.99",
      note: "Medicine purchase",
   },
   {
      id: 7,
      type: "Education",
      date: "2025-10-16",
      amount: "120",
      note: "Online course fee",
   },
   {
      id: 8,
      type: "Clothing",
      date: "2025-10-15",
      amount: "75.49",
      note: "New pair of jeans",
   },
   {
      id: 9,
      type: "Rent",
      date: "2025-10-01",
      amount: "500",
      note: "Monthly apartment rent",
   },
   {
      id: 10,
      type: "Miscellaneous",
      date: "2025-10-23",
      amount: "9.99",
      note: "Stationery purchase",
   },
];

const expenseSchema = yup.object({
   id: yup.number().required(),
   type: yup.string().required("Type is required"),
   date: yup.string().required("Date is required"),
   amount: yup.string().required("Amount is required"),
   note: yup.string().required("Note is required"),
});

const Expense = () => {
   const theme = useTheme();
   const tableData: Omit<TableProps, "type"> = {
      head: ["@check", "Id", "Type", "Date", "Amount", "Note", "@action"],
      body: expenses as any,
   };

   const [open, setOpen] = useState(false);
   const [expense, setExpense] = useState<ExpenseItem>({} as ExpenseItem);
   const [isEditMode, setIsEditMode] = useState(false);
   const [openDelete, setOpenDelete] = useState(false);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<ExpenseItem>({
      resolver: yupResolver<ExpenseItem, any, any>(expenseSchema),
      defaultValues: {
         type: "",
         amount: "",
         note: "",
      },
   });

   // Action menu for each row
   const actionMenu = (row: ExpenseItem) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => {
            setExpense(row);
            setIsEditMode(true);
            setOpen(true);
            reset(row);
         },
      },
      {
         label: "print",
         icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
         onClick: () => {
            setExpense(row);
            setIsEditMode(true);
            setOpen(true);
            reset(row);
         },
      },
      {
         label: "delete",
         color: "error",
         onClick: () => {
            setExpense(row);
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

   const onSubmit: SubmitHandler<ExpenseItem> = (formData) => {
      const newOrder: ExpenseItem = {
         ...formData,
      };
      setExpense(newOrder);
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
               Add Expense
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
            title="Add expense"
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
                           Type
                        </Typography>
                        <Controller
                           name="type"
                           control={control}
                           defaultValue={expense.type}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Type"
                                 label="Type"
                                 error={!!errors.type}
                                 helperText={errors.type?.message}
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
                           Amount
                        </Typography>
                        <Controller
                           name="amount"
                           control={control}
                           defaultValue={expense.amount}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 placeholder="Amount"
                                 label="Amount"
                                 error={!!errors.amount}
                                 helperText={errors.amount?.message}
                                 type="number"
                              />
                           )}
                        />
                     </Stack>
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                     <Stack spacing={1.5}>
                        <Typography
                           variant="h6"
                           fontSize={"13px!important"}
                           fontWeight={500}
                        >
                           Note
                        </Typography>
                        <Controller
                           name="note"
                           control={control}
                           defaultValue={expense.note}
                           render={({ field }) => (
                              <TextField
                                 {...field}
                                 fullWidth
                                 multiline
                                 minRows={3}
                                 maxRows={4}
                                 placeholder="Note"
                                 label="Note"
                                 error={!!errors.note}
                                 helperText={errors.note?.message}
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
                     {isEditMode ? "Update Expense" : "Add Expense"}
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
            title={`Are you sure want to delete "${expense?.type}"?`}
         />
      </Stack>
   );
};

export default Expense;
