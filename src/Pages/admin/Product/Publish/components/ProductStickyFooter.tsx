"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Paper,
   Stack,
   Typography,
   useTheme,
} from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";

interface ProductStickyFooterProps {
   isEdit: boolean;
   isSubmitting: boolean;
   onCancel: () => void;
   serverError?: string | null;
   completedRequiredCount: number;
   totalRequiredCount: number;
   isDirty: boolean;
   onSaveDraft: () => void;
   onPublish: () => void;
}

export const ProductStickyFooter: React.FC<ProductStickyFooterProps> = ({
   isEdit,
   isSubmitting,
   onCancel,
   serverError,
   completedRequiredCount,
   totalRequiredCount,
   isDirty,
   onSaveDraft,
   onPublish,
}) => {
   const theme = useTheme();
   const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);

   const isReady = completedRequiredCount >= totalRequiredCount;

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            border: 1,
            borderColor: "divider",
            boxShadow: theme.shadows[1],
            mt: 3,
            mb: 2,
         }}
      >
         <Stack spacing={1}>
            {serverError && (
               <Typography
                  color="error"
                  variant="body2"
                  sx={{ px: 1, fontWeight: 600 }}
               >
                  {serverError}
               </Typography>
            )}

            <Stack
               direction={{ xs: "column", md: "row" }}
               justifyContent="space-between"
               alignItems={{ xs: "stretch", md: "center" }}
               gap={1}
            >
               {/* Left Side: Subtle form status and unsaved edits indicator */}
               <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                  sx={{
                     flex: 0.5,
                  }}
               >
                  <Stack justifyContent="center">
                     <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Box
                           sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: isReady
                                 ? "success.main"
                                 : "warning.main",
                           }}
                        />
                        <Typography
                           variant="body2"
                           fontWeight={600}
                           color="text.primary"
                        >
                           {isReady
                              ? "Ready to publish"
                              : "Complete required fields"}
                        </Typography>
                     </Stack>
                     <Typography variant="caption" color="text.secondary">
                        ({completedRequiredCount}/{totalRequiredCount} required)
                     </Typography>
                  </Stack>

                  {isDirty && (
                     <Chip
                        size="small"
                        label="Unsaved changes"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 22, fontSize: "0.7rem", fontWeight: 500 }}
                     />
                  )}
               </Stack>

               {/* Right Side: Secondary Actions & Primary Submit */}
               <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems="center"
                  justifyContent={"flex-end"}
                  sx={{
                     flex: 0.8,
                  }}
               >
                  <Button
                     variant="outlined"
                     color="inherit"
                     disabled={isSubmitting}
                     onClick={onCancel}
                     sx={{
                        height: 42,
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "divider",
                        width: { xs: "100%", sm: "auto" },
                        "&:hover": {
                           borderColor: "text.primary",
                        },
                     }}
                  >
                     Cancel
                  </Button>

                  {!isEdit && (
                     <>
                        <Button
                           variant="outlined"
                           color="inherit"
                           disabled={isSubmitting}
                           onClick={onSaveDraft}
                           sx={{
                              height: 42,
                              textTransform: "none",
                              fontWeight: 600,
                              borderColor: "divider",
                              width: { xs: "100%", sm: "auto" },
                              "&:hover": {
                                 borderColor: "text.primary",
                              },
                           }}
                        >
                           Save as Draft
                        </Button>
                     </>
                  )}

                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     disabled={isSubmitting}
                     sx={{
                        height: 42,
                        fontWeight: 700,
                        textTransform: "none",
                        px: 3.5,
                        width: { xs: "100%", sm: "auto" },
                     }}
                  >
                     {isSubmitting
                        ? "Saving..."
                        : isEdit
                          ? "Update Product"
                          : "Publish Product"}
                  </Button>
               </Stack>
            </Stack>
         </Stack>

         {/* Confirm Dialog */}
         <AlertDialog
            open={publishConfirmOpen}
            onClose={() => setPublishConfirmOpen(false)}
            type="confirm"
            title="Publish Product to Catalog? This product will immediately become active and available on the POS register."
            confirmText="Publish"
            cancelText="Keep as Draft"
            onConfirm={() => {
               setPublishConfirmOpen(false);
               onPublish();
            }}
         />
      </Paper>
   );
};

export default ProductStickyFooter;
