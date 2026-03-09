import * as React from "react";
import { Stack, SxProps } from "@mui/material";
import {
   Modal,
   Box,
   Typography,
   Button,
   Fade,
   Backdrop,
   IconButton,
} from "@mui/material";
import Icon from "./Icon";

export default function CustomModal({
   open,
   onClose,
   children,
   sx,
   title,
   closeIcon = false,
}: {
   open: boolean;
   onClose: () => void;
   children?: React.ReactNode;
   sx?: SxProps;
   title?: string;
   closeIcon?: boolean;
}) {
   return (
      <Modal
         open={open}
         onClose={onClose}
         closeAfterTransition
         // BackdropComponent={Backdrop}
         BackdropProps={{
            timeout: 300, // backdrop fade animation time
         }}
      >
         <Fade in={open} timeout={300}>
            <Box
               sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  bgcolor: "background.paper",
                  boxShadow: 24,
                  p: 2,
                  px: {
                     xs: 1,
                     sm: 3,
                  },
                  borderRadius: 2,
                  ...sx,
               }}
            >
               {(title || closeIcon) && (
                  <Stack
                     direction="row"
                     justifyContent={title ? "space-between" : "flex-end"}
                     alignItems="center"
                     mb={2}
                     px={{ xs: 2, sm: 0 }}
                  >
                     {title && (
                        <Typography fontSize={22} fontWeight={600}>
                           {title}
                        </Typography>
                     )}
                     {closeIcon && (
                        <IconButton onClick={onClose}>
                           <Icon icon="eva:close-fill"></Icon>
                        </IconButton>
                     )}
                  </Stack>
               )}
               {children}
            </Box>
         </Fade>
      </Modal>
   );
}
