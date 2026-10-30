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
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { GridRenderCellParams } from "@mui/x-data-grid";

const productSchema = z.object({
   name: z.string().min(1, "Name is required!"),
});

type CategoryType = {
   id: string;
   customId?: string;
   name: string;
};

type FormValues = z.infer<typeof productSchema>;

export const categoriesData: CategoryType[] = [
   { id: "1", customId: "CAT_1", name: "Beverages" },
   { id: "2", customId: "CAT_2", name: "Snacks" },
   { id: "3", customId: "CAT_3", name: "Dairy" },
   { id: "4", customId: "CAT_4", name: "Smart Fitness Watch" },
   { id: "5", customId: "CAT_5", name: "Wireless Earbuds" },
   { id: "6", customId: "CAT_6", name: "Portable Bluetooth Speaker" },
   { id: "7", customId: "CAT_7", name: "Noise-Canceling Headphones" },
];

const Categories = () => {
   const theme = useTheme();
   const [categories, setCategories] = useState<CategoryType[]>([]);
   const [loading, setLoading] = useState(false);

   const loadCategories = React.useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/categories");
         if (res.ok) {
            const data = await res.json();
            setCategories(data);
         }
      } catch {
         // fallback
      } finally {
         setLoading(false);
      }
   }, []);

   React.useEffect(() => {
      loadCategories();
   }, [loadCategories]);

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
   const onSubmit: SubmitHandler<FormValues> = async (data) => {
      try {
         if (selectedCategory) {
            await fetch(`/api/categories/${selectedCategory.id}`, {
               method: "PUT",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ name: data.name }),
            });
         } else {
            await fetch("/api/categories", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ name: data.name }),
            });
         }
         loadCategories();
      } catch {}
      closeModal();
   };

   // Delete handler
   const handleDelete = async () => {
      if (selectedCategory) {
         try {
            await fetch(`/api/categories/${selectedCategory.id}`, {
               method: "DELETE",
            });
            loadCategories();
         } catch {}
         setSelectedCategory(null);
         setIsDeleteDialogOpen(false);
      }
   };

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         flex: 0,
         renderCell: (params: GridRenderCellParams) => (
            <Typography variant="body2" fontWeight={600} color="primary.main">
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
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
         {loading ? (
            <TableSkeleton rows={5} cols={3} />
         ) : (
            <CustomTable
               rows={categories}
               columns={columns}
               checkBox
               canPrint={false}
               canExport={false}
               menuItems={[
                  {
                     label: "edit",
                     icon: <Icon icon="solar:pen-bold" size="small" />,
                     onClick: (p: GridRenderCellParams) => {
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
         )}

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
