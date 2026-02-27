import React from "react";
import CustomModal from "./Modal";
import {
   Stack,
   Typography,
   Button,
   Box,
   useTheme,
   useMediaQuery,
} from "@mui/material";
import Icon from "./Icon";

type DialogType = "delete" | "confirm" | "success" | "error" | "warning";

interface AlertDialogProps {
   open: boolean;
   onClose: () => void;
   type: DialogType;
   title: string;
   onConfirm?: () => void;
   confirmText?: string;
   cancelText?: string;
}

const AlertDialog: React.FC<AlertDialogProps> = ({
   open,
   onClose,
   type,
   title,
   onConfirm,
   confirmText,
   cancelText,
}) => {
   const theme = useTheme();
   const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

   // Map each type to a button color and default confirm text
   const typeConfig: Record<
      DialogType,
      {
         color: "primary" | "error" | "success" | "warning";
         defaultText: string;
      }
   > = {
      delete: { color: "error", defaultText: "Delete" },
      confirm: { color: "primary", defaultText: "Confirm" },
      success: { color: "success", defaultText: "OK" },
      error: { color: "error", defaultText: "OK" },
      warning: { color: "warning", defaultText: "OK" },
   };

   const { color, defaultText } = typeConfig[type];

   return (
      <CustomModal
         sx={{
            width: { xs: "90%", sm: 400 },
            borderRadius: 2,
            overflow: "hidden",
         }}
         open={open}
         onClose={onClose}
      >
         {/* Header */}
         <Box>
            <Typography variant="h6">
               {type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}
            </Typography>
         </Box>

         {/* Content */}
         <Stack spacing={2} py={2}>
            <Typography
               variant="body2"
               dangerouslySetInnerHTML={{ __html: title }}
            />
            <Stack
               direction={isMobile ? "column" : "row"}
               spacing={2}
               justifyContent="flex-end"
            >
               <Button
                  color="inherit"
                  onClick={onClose}
                  sx={{ textTransform: "none" }}
                  fullWidth={isMobile}
               >
                  {cancelText || "Cancel"}
               </Button>

               <Button
                  variant="contained"
                  color={color}
                  onClick={onConfirm}
                  sx={{ textTransform: "none" }}
                  fullWidth={isMobile}
                  autoFocus
               >
                  {confirmText || defaultText}
               </Button>
            </Stack>
         </Stack>
      </CustomModal>
   );
};

export default AlertDialog;
