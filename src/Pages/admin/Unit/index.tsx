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
import { TableSkeleton } from "@src/components/SkeletonLoader";

const productSchema = z.object({
   name: z.string().min(1, "Name is required!"),
   short: z.string().min(1, "Name is required!"),
});

type UnitType = {
   id: string;
   customId?: string;
   name: string;
   short: string;
};

type FormValues = z.infer<typeof productSchema>;

export const productUnits = [
   { id: "1", customId: "UNIT_1", name: "Piece", short: "pc" },
   { id: "2", customId: "UNIT_2", name: "Kilogram", short: "kg" },
   { id: "3", customId: "UNIT_3", name: "Gram", short: "g" },
   { id: "4", customId: "UNIT_4", name: "Liter", short: "l" },
   { id: "5", customId: "UNIT_5", name: "Milliliter", short: "ml" },
   { id: "6", customId: "UNIT_6", name: "Meter", short: "m" },
   { id: "7", customId: "UNIT_7", name: "Centimeter", short: "cm" },
   { id: "8", customId: "UNIT_8", name: "Inch", short: "in" },
   { id: "9", customId: "UNIT_9", name: "Foot", short: "ft" },
   { id: "10", customId: "UNIT_10", name: "Dozen", short: "dz" },
   { id: "11", customId: "UNIT_11", name: "Pack", short: "pk" },
   { id: "12", customId: "UNIT_12", name: "Box", short: "box" },
   { id: "13", customId: "UNIT_13", name: "Carton", short: "ctn" },
   { id: "14", customId: "UNIT_14", name: "Bottle", short: "btl" },
   { id: "15", customId: "UNIT_15", name: "Bag", short: "bag" },
   { id: "16", customId: "UNIT_16", name: "Roll", short: "roll" },
   { id: "17", customId: "UNIT_17", name: "Sheet", short: "sht" },
   { id: "18", customId: "UNIT_18", name: "Pair", short: "pr" },
   { id: "19", customId: "UNIT_19", name: "Set", short: "set" },
   { id: "20", customId: "UNIT_20", name: "Bundle", short: "bndl" },
];

const Unit = () => {
   const theme = useTheme();
   const [unit, setUnit] = useState<UnitType[]>([]);
   const [loading, setLoading] = useState(false);

   const loadUnits = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/units");
         if (res.ok) {
            const data = await res.json();
            const mapped = data.map((u: any) => ({
               id: u.id,
               customId: u.customId,
               name: u.name,
               short: u.name.slice(0, 3).toLowerCase(),
            }));
            setUnit(mapped);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadUnits();
   }, [loadUnits]);

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
   const onSubmit: SubmitHandler<FormValues> = async (data) => {
      try {
         await fetch("/api/units", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: data.name }),
         });
         loadUnits();
      } catch {}
      closeModal();
   };

   // Delete handler
   const handleDelete = async () => {
      if (selectedUnit) {
         try {
            await fetch(`/api/units/${selectedUnit.id}`, { method: "DELETE" });
            loadUnits();
         } catch {}
         setSelectedUnit(null);
         setIsDeleteDialogOpen(false);
      }
   };

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         flex: 0.3,
         renderCell: (params: any) => (
            <Typography variant="body2" fontWeight={600} color="primary.main">
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
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
            {loading ? (
               <TableSkeleton rows={5} cols={4} />
            ) : (
               <CustomTable
                  rows={unit}
                  columns={columns}
                  checkBox
                  canPrint={false}
                  canExport={false}
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
            )}

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
