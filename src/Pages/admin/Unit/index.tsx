"use client";

import { Stack, Button, TextField, Typography, useTheme } from "@mui/material";
import React, { useState } from "react";
import Scrollbar from "react-browser-scrollbar";
import { Controller, useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { TableProps } from "@src/components/Table";

const productSchema = z.object({
   name: z.string().min(1, "Name is required!"),
   short: z.string().min(1, "Name is required!"),
});

type UnitType = {
   id: number;
   name: string;
   short: string;
};

type FormValues = z.infer<typeof productSchema>;
const productUnits = [
   { id: 1, name: "Piece", short: "pc" },
   { id: 2, name: "Kilogram", short: "kg" },
   { id: 3, name: "Gram", short: "g" },
   { id: 4, name: "Liter", short: "l" },
   { id: 5, name: "Milliliter", short: "ml" },
   { id: 6, name: "Meter", short: "m" },
   { id: 7, name: "Centimeter", short: "cm" },
   { id: 8, name: "Inch", short: "in" },
   { id: 9, name: "Foot", short: "ft" },
   { id: 10, name: "Dozen", short: "dz" },
   { id: 11, name: "Pack", short: "pk" },
   { id: 12, name: "Box", short: "box" },
   { id: 13, name: "Carton", short: "ctn" },
   { id: 14, name: "Bottle", short: "btl" },
   { id: 15, name: "Bag", short: "bag" },
   { id: 16, name: "Roll", short: "roll" },
   { id: 17, name: "Sheet", short: "sht" },
   { id: 18, name: "Pair", short: "pr" },
   { id: 19, name: "Set", short: "set" },
   { id: 20, name: "Bundle", short: "bndl" },
];
const Unit = () => {
   const theme = useTheme();
   const [unit, setUnit] = useState<UnitType[]>(productUnits);

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<FormValues>({
      resolver: zodResolver(productSchema),
      defaultValues: { name: "", short: "" },
   });

   // Open modal for Add or Edit
   const openModal = (unit?: UnitType) => {
      if (unit) {
         setSelectedUnit(unit);
         reset({ name: unit.name, short: unit.short });
      } else {
         setSelectedUnit(null);
         reset({ name: "", short: "" });
      }
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedUnit(null);
      reset({ name: "", short: "" });
   };

   // Add / Edit submit handler
   const onSubmit: SubmitHandler<FormValues> = (data) => {
      if (selectedUnit) {
         // Edit
         setUnit((prev) =>
            prev.map((cat) =>
               cat.id === selectedUnit.id ? { ...cat, name: data.name } : cat
            )
         );
      } else {
         // Add
         const newUnit: UnitType = {
            id: Date.now(), // simple id generator
            name: data.name,
            short: data.short,
         };
         setUnit((prev) => [...prev, newUnit]);
      }
      closeModal();
   };

   // Delete handler
   const handleDelete = () => {
      if (selectedUnit) {
         setUnit((prev) => prev.filter((cat) => cat.id !== selectedUnit.id));
         setSelectedUnit(null);
         setIsDeleteDialogOpen(false);
      }
   };

   // Action menu for each row
   const actionMenu = (row: UnitType) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => openModal(row),
      },
      {
         label: "delete",
         color: "error",
         onClick: () => {
            setSelectedUnit(row);
            setIsDeleteDialogOpen(true);
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

   const tableProps: Omit<TableProps, "type"> = {
      head: ["@check", "Name", "Short", "@action"],
      body: unit,
   };

   return (
      <Scrollbar autoHide thumbSize={6} darkMode>
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
                  onClick={() => openModal()}
               >
                  Add Unit
               </Button>
            </Stack>

            {/* Table */}
            <CustomTable
               type="default"
               head={tableProps.head}
               body={tableProps.body}
               actionMenu={(row) => actionMenu(row as any)}
            />

            {/* Modal */}
            <CustomModal
               sx={{ width: { xs: "90%", sm: 500 }, borderRadius: 1 }}
               open={isModalOpen}
               onClose={closeModal}
               title={selectedUnit ? "Update Unit" : "Create Unit"}
            >
               <Stack spacing={2}>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Unit name
                     </Typography>
                     <Controller
                        name="name"
                        control={control}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="text"
                              label="Unit name"
                              variant="outlined"
                              error={!!errors.name}
                              helperText={errors.name?.message}
                           />
                        )}
                     />
                  </Stack>
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Unit short name
                     </Typography>
                     <Controller
                        name="short"
                        control={control}
                        render={({ field }) => (
                           <TextField
                              {...field}
                              value={field.value ?? ""}
                              type="text"
                              label="Unit short name"
                              variant="outlined"
                              error={!!errors.short}
                              helperText={errors.short?.message}
                           />
                        )}
                     />
                  </Stack>
                  <Stack direction="row" justifyContent="flex-end" spacing={2}>
                     <Button color="inherit" onClick={closeModal}>
                        Cancel
                     </Button>
                     <Button
                        variant="contained"
                        onClick={handleSubmit(onSubmit)}
                     >
                        {selectedUnit ? "Update Unit" : "Add Unit"}
                     </Button>
                  </Stack>
               </Stack>
            </CustomModal>

            {/* Delete Dialog */}
            <AlertDialog
               type="delete"
               open={isDeleteDialogOpen}
               onClose={() => setIsDeleteDialogOpen(false)}
               title={`Are you sure want to delete "${selectedUnit?.name}"?`}
               onConfirm={handleDelete}
            />
         </Stack>
      </Scrollbar>
   );
};

export default Unit;
