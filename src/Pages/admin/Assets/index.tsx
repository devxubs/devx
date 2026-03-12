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
import React, { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";

type AssetsItem = {
   id: number;
   type: string;
   date: string;
   amount: string;
   note: string;
};
type AssetForm = {
   type: string;
   amount: string;
   note: string;
};

const AssetsData: AssetsItem[] = [
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

const AssetsSchema = yup.object({
   type: yup.string().required("Type is required"),
   amount: yup.string().required("Amount is required"),
   note: yup.string().required("Note is required"),
});

const Asset = () => {
   const theme = useTheme();

   const columns: ColumnConfig[] = [
      { field: "id", headerName: "ID", width: 50 },
      { field: "type", headerName: "Type", flex: 1 },
      { field: "date", headerName: "Date", width: 150 },
      { field: "amount", headerName: "Amount", width: 150 },
      { field: "note", headerName: "Note", flex: 1 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   const [assets, setAssets] = useState(AssetsData);
   const [openModal, setOpenModal] = useState(false);

   // edit
   const [editItem, setEditItem] = useState<AssetsItem | null>(null);

   // delete
   const [deleteItem, setDeleteItem] = useState<AssetsItem | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<AssetForm>({
      resolver: yupResolver(AssetsSchema),
      defaultValues: {
         type: "",
         amount: "",
         note: "",
      },
   });

   useEffect(() => {
      if (editItem) {
         reset({
            type: editItem.type,
            amount: editItem.amount,
            note: editItem.note,
         });
      } else {
         reset({
            type: "",
            amount: "",
            note: "",
         });
      }
   }, [editItem, reset]);

   const onSubmit: SubmitHandler<AssetForm> = (formData) => {
      if (editItem) {
         // UPDATE
         setAssets((prev) =>
            prev.map((item) =>
               item.id === editItem.id ? { ...item, ...formData } : item,
            ),
         );
      } else {
         // ADD
         const newAsset: AssetsItem = {
            id: assets.length + 1,
            date: new Date().toISOString().split("T")[0],
            ...formData,
         };

         setAssets((prev) => [newAsset, ...prev]);
      }

      reset();
      setEditItem(null);
      setOpenModal(false);
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
               onClick={() => setOpenModal(true)}
            >
               Add Asset
            </Button>
         </Stack>
         <CustomTable
            rows={assets}
            columns={columns}
            checkBox
            menuItems={[
               {
                  label: "edit",
                  icon: <Icon icon="solar:pen-bold" size="small" />,
                  onClick: (params) => {
                     setOpenModal(true);
                     setEditItem(params.row);
                  },
               },
               {
                  label: "print",
                  icon: (
                     <Icon
                        icon="solar:printer-minimalistic-bold"
                        size="small"
                     />
                  ),
                  onClick: (params) => {},
               },
               {
                  label: "delete",
                  color: "error",
                  onClick: (params) => {
                     setDeleteItem(params.row);
                  },
                  icon: (
                     <Icon
                        icon="solar:trash-bin-trash-bold"
                        size="small"
                        color="error"
                     />
                  ),
               },
            ]}
         />
         <CustomModal
            open={openModal}
            onClose={() => setOpenModal(false)}
            title="Add Asset"
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
                        setOpenModal(false);
                        reset();
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
                     {editItem ? "Update Asset" : "Add Asset"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>
         <AlertDialog
            open={!!deleteItem}
            onClose={function (): void {
               setDeleteItem(null);
            }}
            onConfirm={() => {
               setAssets((prev) =>
                  prev.filter((item) => item.id !== deleteItem?.id),
               );
               setDeleteItem(null);
            }}
            type={"error"}
            title={`Are you sure want to delete "${deleteItem?.type}"?`}
         />
      </Stack>
   );
};

export default Asset;
