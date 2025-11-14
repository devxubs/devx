import React, { useState } from "react";
import {
  Tooltip,
  IconButton,
  Stack,
  TextField,
  Typography,
  Button,
} from "@mui/material";

import { Controller } from "react-hook-form";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";

interface NoteModalProps {
  note: string;
}

const productSchema = z.object({
  note: z.string().min(1, "Note is required!"),
});

type NoteValue = z.infer<typeof productSchema>;

const NoteModal = ({ note }: NoteModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof productSchema>,
    any,
    z.output<typeof productSchema>
  >({
    resolver: zodResolver(productSchema),
    defaultValues: {
      note: (note as any) || "",
    },
  });

  // 3. Submit handler
  const onSubmit: SubmitHandler<NoteValue> = (data) => {
    // onChange?.(data);
    setIsModalOpen(true);
  };

  return (
    <>
      <Tooltip title={note} disableInteractive>
        <IconButton onClick={() => setIsModalOpen(true)}>
          <Icon icon="solar:add-square-broken" size="small" />
        </IconButton>
      </Tooltip>
      <CustomModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sx={{ borderRadius: 1, width: 400 }}
        title="Note"
      >
        <Stack spacing={2}>
          <Controller
            name="note"
            control={control}
            defaultValue={note || ""}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ""}
                error={!!errors.note}
                helperText={errors.note?.message}
                label="Note"
                variant="outlined"
                required
              />
            )}
          />
          <Stack
            spacing={2}
            direction={"row"}
            alignItems={"center"}
            justifyContent={"flex-end"}
          >
            <Button
              variant="text"
              color="inherit"
              onClick={() => {
                setIsModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              onClick={handleSubmit(onSubmit)}
            >
              {note.length !== 0 ? "Update note" : "Add note"}
            </Button>
          </Stack>
        </Stack>
      </CustomModal>
    </>
  );
};

export default NoteModal;
