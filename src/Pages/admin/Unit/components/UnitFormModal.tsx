"use client";

import React, { useEffect, useState } from "react";
import {
   Stack,
   Button,
   TextField,
   Typography,
   Alert,
   CircularProgress,
   Collapse,
   Box,
} from "@mui/material";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomModal from "@src/components/Modal";
import { UnitFormValues, UnitType, unitSchema } from "../types";

interface UnitFormModalProps {
   open: boolean;
   onClose: () => void;
   selectedUnit: UnitType | null;
   onSuccess: () => void;
}

export const UnitFormModal: React.FC<UnitFormModalProps> = ({
   open,
   onClose,
   selectedUnit,
   onSuccess,
}) => {
   const [apiError, setApiError] = useState<string | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   const {
      control,
      handleSubmit,
      reset,
      setValue,
      watch,
      formState: { errors },
   } = useForm<UnitFormValues>({
      resolver: zodResolver(unitSchema),
      defaultValues: {
         name: "",
         short: "",
      },
   });

   // Keep form in sync when modal opens or selectedUnit changes
   useEffect(() => {
      if (open) {
         setApiError(null);
         if (selectedUnit) {
            reset({
               name: selectedUnit.name,
               short: selectedUnit.short || "",
            });
         } else {
            reset({
               name: "",
               short: "",
            });
         }
      }
   }, [open, selectedUnit, reset]);

   const watchedName = watch("name");
   const watchedShort = watch("short");

   // Auto-suggest short name while typing unit name if short name is empty and adding a new unit
   const handleNameChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      fieldChange: (val: string) => void,
   ) => {
      const val = e.target.value;
      fieldChange(val);
      if (!selectedUnit && (!watchedShort || watchedShort.trim() === "")) {
         if (val.trim().length > 0 && val.trim().length <= 3) {
            setValue("short", val.trim().toLowerCase(), { shouldValidate: false });
         }
      }
   };

   const onSubmit = async (data: UnitFormValues) => {
      setApiError(null);
      setIsSubmitting(true);

      try {
         const payload = {
            name: data.name.trim(),
            short: data.short.trim(),
         };

         const url = selectedUnit
            ? `/api/units/${selectedUnit.id}`
            : "/api/units";
         const method = selectedUnit ? "PUT" : "POST";

         const res = await fetch(url, {
            method,
            headers: {
               "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
         });

         const responseData = await res.json().catch(() => ({}));

         if (!res.ok) {
            const errorMsg =
               responseData.error ||
               `Failed to ${selectedUnit ? "update" : "create"} unit (${res.status})`;
            setApiError(errorMsg);
            return;
         }

         // Successful creation or update
         onSuccess();
         handleClose();
      } catch (err: any) {
         setApiError(err?.message || "An unexpected network error occurred.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleClose = () => {
      if (isSubmitting) return;
      setApiError(null);
      reset({ name: "", short: "" });
      onClose();
   };

   return (
      <CustomModal
         sx={{
            width: { xs: "92%", sm: 480 },
            borderRadius: 1.5,
            p: 3,
         }}
         open={open}
         onClose={handleClose}
         title={selectedUnit ? "Update Unit" : "Create Unit"}
         closeIcon
      >
         <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ mt: 1 }}
         >
            <Stack spacing={2.5}>
               <Collapse in={Boolean(apiError)}>
                  {apiError && (
                     <Alert
                        severity="error"
                        onClose={() => setApiError(null)}
                        sx={{ fontSize: "0.85rem" }}
                     >
                        {apiError}
                     </Alert>
                  )}
               </Collapse>

               {/* Unit Name Field */}
               <Stack spacing={1}>
                  <Typography
                     variant="subtitle2"
                     fontWeight={600}
                     color="text.primary"
                  >
                     Unit Name <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <Controller
                     name="name"
                     control={control}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           value={field.value ?? ""}
                           onChange={(e) => handleNameChange(e, field.onChange)}
                           placeholder="e.g. Kilogram, Piece, Liter, Box"
                           variant="outlined"
                           fullWidth
                           size="medium"
                           autoFocus
                           disabled={isSubmitting}
                           error={Boolean(errors.name)}
                           helperText={errors.name?.message}
                           inputProps={{ "data-testid": "unit-name-input" }}
                        />
                     )}
                  />
               </Stack>

               {/* Unit Short Name Field */}
               <Stack spacing={1}>
                  <Typography
                     variant="subtitle2"
                     fontWeight={600}
                     color="text.primary"
                  >
                     Unit Short Name / Symbol <Typography component="span" color="error.main">*</Typography>
                  </Typography>
                  <Controller
                     name="short"
                     control={control}
                     render={({ field }) => (
                        <TextField
                           {...field}
                           value={field.value ?? ""}
                           placeholder="e.g. kg, pc, l, box"
                           variant="outlined"
                           fullWidth
                           size="medium"
                           disabled={isSubmitting}
                           error={Boolean(errors.short)}
                           helperText={
                              errors.short?.message ||
                              "Used on labels, receipts, and compact tables."
                           }
                           inputProps={{ "data-testid": "unit-short-input" }}
                        />
                     )}
                  />
               </Stack>

               {/* Form Actions */}
               <Stack
                  direction="row"
                  justifyContent="flex-end"
                  alignItems="center"
                  spacing={1.5}
                  pt={1}
               >
                  <Button
                     color="inherit"
                     onClick={handleClose}
                     disabled={isSubmitting}
                     variant="outlined"
                     sx={{ px: 2.5 }}
                  >
                     Cancel
                  </Button>
                  <Button
                     type="submit"
                     variant="contained"
                     color="primary"
                     disabled={isSubmitting}
                     startIcon={
                        isSubmitting ? (
                           <CircularProgress size={18} color="inherit" />
                        ) : null
                     }
                     sx={{ px: 3, minWidth: 120 }}
                     data-testid="unit-submit-button"
                  >
                     {isSubmitting
                        ? "Saving..."
                        : selectedUnit
                          ? "Update Unit"
                          : "Add Unit"}
                  </Button>
               </Stack>
            </Stack>
         </Box>
      </CustomModal>
   );
};

export default UnitFormModal;
