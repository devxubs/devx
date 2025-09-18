import {
  Grid,
  Stack,
  Typography,
  Button,
  TextField,
  InputAdornment,
} from "@mui/material";
import React from "react";
import UploadPhoto from "./imageUploader";
import CustomAutocomplete from "@src/components/Autocomplete";
import { TableRow } from "@src/components/Table";

interface ModalProps {
  mode: "add" | "edit";
  onClose?: () => void;
  userData?: TableRow;
  onChange?: (data: any) => void;
}

const Modal = ({ mode, onClose, userData, onChange }: ModalProps) => {
  return (
    <Stack direction={"row"} alignItems={"center"} spacing={4} p={2}>
      <Stack direction={"row"}>
        <UploadPhoto />
      </Stack>
      <Stack width={"100%"}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography variant="body2">Full Name</Typography>
              <TextField
                label="Full Name"
                variant="outlined"
                required
                onChange={(e) => {
                  onChange?.({ name: e.target.value });
                }}
                value={userData?.name || ""}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography variant="body2">E-mail</Typography>
              <TextField
                label="E-mail"
                variant="outlined"
                required
                onChange={(e) => {
                  onChange?.({ email: e.target.value });
                }}
                value={userData?.email || ""}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography variant="body2">Phone Number</Typography>
              <TextField
                label="Phone Number"
                type="number"
                variant="outlined"
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">+880</InputAdornment>
                  ),
                }}
                onChange={(e) => {
                  onChange?.({ phone_number: e.target.value });
                }}
                value={userData?.phone_number || ""}
                sx={{
                  "input::-webkit-outer-spin-button, input::-webkit-inner-spin-button":
                    {
                      WebkitAppearance: "none",
                    },
                }}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={1.5}>
              <Typography variant="body2">Role</Typography>
              <CustomAutocomplete
                label="Role"
                option={["Active", "Inactive"]}
                onChange={(v: any) => {
                  console.log(v);
                }}
              />
            </Stack>
          </Grid>
        </Grid>
        <Stack
          spacing={2}
          direction={"row"}
          justifyContent={"flex-end"}
          width={"100%"}
          mt={2}
        >
          <Button variant="text" color="inherit" onClick={onClose}>
            Cancel
          </Button>

          <Button variant="contained" color="primary">
            {mode === "edit" ? "Update user" : "Add user"}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default Modal;
