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
import CustomTable, { ColumnConfig } from "@src/components/Table";

const productSchema = z.object({
   name: z.string().min(1, "Name is required!"),
   short: z.string().min(1, "Name is required!"),
});

type UnitType = {
   id: string;
   name: string;
   short: string;
};

type FormValues = z.infer<typeof productSchema>;

export const productUnits = [
   { id: "UN001", name: "Piece", short: "pc" },
   { id: "UN002", name: "Kilogram", short: "kg" },
   { id: "UN003", name: "Gram", short: "g" },
   { id: "UN004", name: "Liter", short: "l" },
   { id: "UN005", name: "Milliliter", short: "ml" },
   { id: "UN006", name: "Meter", short: "m" },
   { id: "UN007", name: "Centimeter", short: "cm" },
   { id: "UN008", name: "Inch", short: "in" },
   { id: "UN009", name: "Foot", short: "ft" },
   { id: "UN010", name: "Dozen", short: "dz" },
   { id: "UN011", name: "Pack", short: "pk" },
   { id: "UN012", name: "Box", short: "box" },
   { id: "UN013", name: "Carton", short: "ctn" },
   { id: "UN014", name: "Bottle", short: "btl" },
   { id: "UN015", name: "Bag", short: "bag" },
   { id: "UN016", name: "Roll", short: "roll" },
   { id: "UN017", name: "Sheet", short: "sht" },
   { id: "UN018", name: "Pair", short: "pr" },
   { id: "UN019", name: "Set", short: "set" },
   { id: "UN020", name: "Bundle", short: "bndl" },
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
      const UNId =
         unit.length >= 10 ? "0" + unit.length + 1 : "00" + unit.length + 1;
      if (selectedUnit) {
         // Edit
         setUnit((prev) =>
            prev.map((cat) =>
               cat.id === selectedUnit.id ? { ...cat, name: data.name } : cat,
            ),
         );
      } else {
         // Add
         const newUnit: UnitType = {
            id: `UN${UNId}`, // simple id generator
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

   const columns: ColumnConfig[] = [
      { field: "id", headerName: "ID", flex: 0.3 },
      { field: "name", headerName: "Name", flex: 1 },
      { field: "short", headerName: "Short", flex: 1 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

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
               rows={unit}
               columns={columns}
               checkBox
               menuItems={[
                  {
                     label: "edit",
                     icon: <Icon icon="solar:pen-bold" size="small" />,
                     onClick: (p) => openModal(p.row),
                  },
                  {
                     label: "delete",
                     color: "error",
                     icon: (
                        <Icon
                           icon="solar:trash-bin-trash-bold"
                           size="small"
                           color="error"
                        />
                     ),
                     onClick: (p) => {
                        setSelectedUnit(p.row);
                        setIsDeleteDialogOpen(true);
                     },
                  },
               ]}
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
