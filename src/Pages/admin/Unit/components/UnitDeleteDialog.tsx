"use client";

import React from "react";
import {
   Stack,
   Typography,
   Button,
   Box,
   Alert,
   CircularProgress,
   useTheme,
   useMediaQuery,
} from "@mui/material";
import CustomModal from "@src/components/Modal";
import Icon from "@src/components/Icon";
import { UnitType } from "../types";

interface UnitDeleteDialogProps {
   open: boolean;
   onClose: () => void;
   unit: UnitType | null;
   onConfirm: () => void;
   isDeleting?: boolean;
}

export const UnitDeleteDialog: React.FC<UnitDeleteDialogProps> = ({
   open,
   onClose,
   unit,
   onConfirm,
   isDeleting = false,
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   if (!unit) return null;

   const hasReferencingProducts = (unit.productCount || 0) > 0;

   return (
      <CustomModal
         sx={{
            width: { xs: "92%", sm: 440 },
            borderRadius: 1.5,
            p: 3,
         }}
         open={open}
         onClose={isDeleting ? () => {} : onClose}
         closeIcon={!isDeleting}
      >
         <Stack spacing={2.5}>
            {/* Header Icon & Title */}
            <Stack direction="row" spacing={1.5} alignItems="center">
               <Box
                  sx={{
                     display: "flex",
                     alignItems: "center",
                     justifyContent: "center",
                     width: 44,
                     height: 44,
                     borderRadius: "50%",
                     bgcolor: "error.lighter",
                     color: "error.main",
                  }}
               >
                  <Icon icon="solar:trash-bin-trash-bold" size="24px" />
               </Box>
               <Box>
                  <Typography variant="h6" fontWeight={700}>
                     Delete Unit
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     ID: {unit.customId || unit.id}
                  </Typography>
               </Box>
            </Stack>

            {/* Prompt Description */}
            <Typography variant="body2" color="text.secondary">
               Are you sure you want to delete unit{" "}
               <Typography
                  component="span"
                  fontWeight={600}
                  color="text.primary"
               >
                  &quot;{unit.name}&quot;
               </Typography>
               ? It will be safely moved to the Recycle Bin and can be restored at any time.
            </Typography>

            {/* Product Reference Notice */}
            {hasReferencingProducts && (
               <Alert severity="warning" sx={{ fontSize: "0.85rem" }}>
                  <strong>{unit.productCount} product(s)</strong> currently reference this unit. Moving it to the Recycle Bin will preserve product data, but will hide this unit from new product selections.
               </Alert>
            )}

            {/* Actions */}
            <Stack
               direction={isMobile ? "column" : "row"}
               spacing={1.5}
               justifyContent="flex-end"
               pt={1}
            >
               <Button
                  color="inherit"
                  variant="outlined"
                  onClick={onClose}
                  disabled={isDeleting}
                  fullWidth={isMobile}
                  sx={{ px: 2.5 }}
               >
                  Cancel
               </Button>
               <Button
                  variant="contained"
                  color="error"
                  onClick={onConfirm}
                  disabled={isDeleting}
                  startIcon={
                     isDeleting ? (
                        <CircularProgress size={16} color="inherit" />
                     ) : (
                        <Icon icon="solar:trash-bin-trash-bold" size="18px" />
                     )
                  }
                  fullWidth={isMobile}
                  sx={{ px: 3 }}
                  data-testid="confirm-delete-unit-button"
               >
                  {isDeleting ? "Deleting..." : "Move to Bin"}
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default UnitDeleteDialog;
