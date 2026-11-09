import React from "react";
import { Button, CircularProgress, Stack, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";

interface QuickEditFooterProps {
   onClose?: () => void;
   onSubmit: () => void;
   isBusy?: boolean;
}

export const QuickEditFooter: React.FC<QuickEditFooterProps> = ({
   onClose,
   onSubmit,
   isBusy = false,
}) => {
   const theme = useTheme();

   return (
      <Stack
         direction="row"
         spacing={1.5}
         alignItems="center"
         justifyContent="flex-end"
         pt={1.5}
         sx={{
            borderTop: "1px solid",
            borderColor: "divider",
         }}
      >
         <Button
            variant="outlined"
            color="inherit"
            disabled={isBusy}
            onClick={onClose}
         >
            Cancel
         </Button>
         <Button
            variant="contained"
            color="primary"
            disabled={isBusy}
            onClick={onSubmit}
            startIcon={
               isBusy ? (
                  <CircularProgress size={16} color="inherit" />
               ) : (
                  <Icon
                     icon="solar:check-read-bold"
                     size="small"
                     style={{ color: theme.palette.text.primary }}
                  />
               )
            }
            sx={{
               fontWeight: 600,
            }}
         >
            {isBusy ? "Saving..." : "Save Order Changes"}
         </Button>
      </Stack>
   );
};

export default QuickEditFooter;
