"use client";

import { Stack, Button, TextField, Typography, useTheme } from "@mui/material";
import React, { useState } from "react";
import { Controller, useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { GridRenderCellParams } from "@mui/x-data-grid";

const productSchema = z.object({
   name: z.string().min(1, "Name is required!"),
});

type CategoryType = {
   id: number;
   name: string;
};

type FormValues = z.infer<typeof productSchema>;

const Categories = () => {
   const theme = useTheme();
   const [categories, setCategories] = useState<CategoryType[]>([
      { id: 1, name: "Smart Fitness Watch" },
      { id: 2, name: "Smart Fitness Watch" },
      { id: 3, name: "Smart Fitness Watch" },
      { id: 4, name: "Smart Fitness Watch" },
   ]);

   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [selectedCategory, setSelectedCategory] =
      useState<CategoryType | null>(null);

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
   } = useForm<FormValues>({
      resolver: zodResolver(productSchema),
      defaultValues: { name: "" },
   });

   // Open modal for Add or Edit
   const openModal = (category?: CategoryType) => {
      if (category) {
         setSelectedCategory(category);
         reset({ name: category.name });
      } else {
         setSelectedCategory(null);
         reset({ name: "" });
      }
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedCategory(null);
      reset({ name: "" });
   };

   // Add / Edit submit handler
   const onSubmit: SubmitHandler<FormValues> = (data) => {
      if (selectedCategory) {
         // Edit
         setCategories((prev) =>
            prev.map((cat) =>
               cat.id === selectedCategory.id
                  ? { ...cat, name: data.name }
                  : cat,
            ),
         );
      } else {
         // Add
         const newCategory: CategoryType = {
            id: Date.now(), // simple id generator
            name: data.name,
         };
         setCategories((prev) => [...prev, newCategory]);
      }
      closeModal();
   };

   // Delete handler
   const handleDelete = () => {
      if (selectedCategory) {
         setCategories((prev) =>
            prev.filter((cat) => cat.id !== selectedCategory.id),
         );
         setSelectedCategory(null);
         setIsDeleteDialogOpen(false);
      }
   };

   const columns: ColumnConfig[] = [
      { field: "id", headerName: "ID", flex: 0 },
      { field: "name", headerName: "Name", flex: 1 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

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
               onClick={() => openModal()}
            >
               Add Category
            </Button>
         </Stack>

         {/* Table */}
         <CustomTable
            rows={categories}
            columns={columns}
            checkBox
            menuItems={[
               {
                  label: "edit",
                  icon: <Icon icon="solar:pen-bold" size="small" />,
                  onClick: (p: GridRenderCellParams) => {
                     console.log(p.row);

                     openModal(p.row as CategoryType);
                  },
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
                  onClick: (p: GridRenderCellParams) => {
                     setSelectedCategory(p.row as CategoryType);
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
         >
            <Stack spacing={2}>
               <Stack spacing={1.5}>
                  <Typography
                     variant="h6"
                     fontSize={"13px!important"}
                     fontWeight={500}
                  >
                     Category name
                  </Typography>
                  <Controller
                     name="name"
                     control={control}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           value={field.value ?? ""}
                           type="text"
                           label="Category name"
                           variant="outlined"
                           error={!!errors.name}
                           helperText={errors.name?.message}
                        />
                     )}
                  />
               </Stack>
               <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button color="inherit" onClick={closeModal}>
                     Cancel
                  </Button>
                  <Button variant="contained" onClick={handleSubmit(onSubmit)}>
                     {selectedCategory ? "Update Category" : "Add Category"}
                  </Button>
               </Stack>
            </Stack>
         </CustomModal>

         {/* Delete Dialog */}
         <AlertDialog
            type="delete"
            open={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            title={`Are you sure want to delete "${selectedCategory?.name}"?`}
            onConfirm={handleDelete}
         />
      </Stack>
   );
};

export default Categories;
