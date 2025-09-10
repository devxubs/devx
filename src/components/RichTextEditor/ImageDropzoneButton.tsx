"use client";
import { Button, useTheme } from "@mui/material";
import { useDropzone } from "react-dropzone";
import Icon from "../Icon";

function ImageDropzoneButton({ editor }: { editor: any }) {
  const theme = useTheme();
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      editor.chain().focus().setImage({ src: base64, width: "100%" }).run();
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    noClick: true, // prevent auto file dialog
    onDrop,
  });

  return (
    <div {...getRootProps()} style={{ display: "inline-block" }}>
      <input {...getInputProps()} />
      <Button
        size="small"
        onClick={open}
        color={"inherit"}
        sx={{
          minWidth: "0px!important",
          height: "28px",
          width: "28px",
          borderRadius: "6px",
          boxShadow: "none",
          border: 1,
          borderColor: "transparent",
          bgcolor: "transparent",
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
        }}
      >
        <Icon icon="mdi:image-plus" />
      </Button>
    </div>
  );
}

export default ImageDropzoneButton;
