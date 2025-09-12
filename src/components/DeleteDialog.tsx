import React from "react";
import CustomModal from "./Modal";
import { Stack, Typography, Button } from "@mui/material";

interface DeleteDialogProps {
  open: boolean;
  onClose: Function;
  title: string;
  onDelete: () => void;
}

const DeleteDialog = ({
  open,
  onClose,
  title,
  onDelete,
}: DeleteDialogProps) => {
  return (
    <CustomModal
      // sx={{ width: { xs: "90%", md: 900 } }}
      open={open}
      onClose={() => onClose()}
      title={"Delete User"}
    >
      <Stack>
        <Typography>
          Are you sure you want to delete <strong>{title || ""}</strong>?
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="flex-end" mt={3}>
          <Button onClick={() => onClose()} color="inherit">
            Cancel
          </Button>
          <Button onClick={onDelete} color="error" variant="contained">
            Delete
          </Button>
        </Stack>
      </Stack>
    </CustomModal>
  );
};

export default DeleteDialog;
