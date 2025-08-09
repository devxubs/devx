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
}: {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  sx?: SxProps;
  title?: string;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      closeAfterTransition
      BackdropComponent={Backdrop}
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
            px: 3,
            borderRadius: 2,
            ...sx,
          }}
        >
          <Stack
            direction="row"
            justifyContent={title ? "space-between" : "flex-end"}
            alignItems="center"
            mb={2}
          >
            {title && <Typography variant="h6">{title}</Typography>}
            <IconButton onClick={onClose}>
              <Icon icon="eva:close-fill"></Icon>
            </IconButton>
          </Stack>
          {children}
        </Box>
      </Fade>
    </Modal>
  );
}
