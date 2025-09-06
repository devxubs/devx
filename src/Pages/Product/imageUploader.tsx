"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Typography, Paper, useTheme, alpha } from "@mui/material";
import Icon from "@src/components/Icon";
import UploadIcon from "@src/SvgIcon/UploadIcon";

interface UploadPhotoProps {
  // You can add props if needed
  onImageUpload?: (file: File[]) => void;
}

const UploadPhoto = ({ onImageUpload }: UploadPhotoProps) => {
  const theme = useTheme();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    onImageUpload?.(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: 3 * 1024 * 1024, // 3 MB
    multiple: true,
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        border: "1px dashed",
        borderColor: isDragActive
          ? alpha(theme.palette.primary.main, 0.7)
          : "divider",
        borderRadius: 1.6,
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: "background.paper",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        width: "100%",
        height: 220,
        overflow: "hidden",
        position: "relative",
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          backgroundColor: isDragActive
            ? alpha(theme.palette.primary.main, 0.4)
            : alpha(theme.palette.grey[700], 0.2),
          color: "text.disabled",
          transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <input {...getInputProps()} />

        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent={"center"}
          gap={1}
          width={"100%"}
          height={"100%"}
          position={"absolute"}
          bgcolor={alpha(theme.palette.background.paper, 0.7)}
        >
          <UploadIcon />
          <Typography variant="h6" fontSize={16} color={"textPrimary"}>
            Drop or select files
          </Typography>
          <Typography variant="body1" fontSize={13} color={"textSecondary"}>
            Drag files here, or browse your device.
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default UploadPhoto;
