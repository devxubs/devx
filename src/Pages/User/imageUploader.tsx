"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Box, Typography, Paper, useTheme, alpha } from "@mui/material";
import Icon from "@src/components/Icon";

const UploadPhoto = () => {
  const theme = useTheme();
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxSize: 3 * 1024 * 1024, // 3 MB
    multiple: false, // only one image at a time
  });

  // Clean up the preview URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <Paper
      {...getRootProps()}
      sx={{
        border: "1px dashed",
        borderColor: isDragActive
          ? alpha(theme.palette.primary.main, 0.7)
          : "divider",
        borderRadius: "50%",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: "background.paper",
        transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
        width: 150,
        height: 150,
        overflow: "hidden",
        p: 1,
        position: "relative",
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          borderRadius: "50%",
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
        {preview && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent={"center"}
            gap={1}
            width="100%"
            height="100%"
          >
            <img
              src={preview}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                height: "100%",
                borderRadius: 8,
              }}
            />
          </Box>
        )}
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
          <Icon
            icon="solar:camera-add-bold"
            style={{
              color: preview
                ? theme.palette.text.primary
                : theme.palette.text.secondary,
            }}
            size="30"
          />
          <Typography
            variant="body1"
            fontSize={12}
            color={preview ? "textPrimary" : "textSecondary"}
          >
            Upload photo
          </Typography>
          {/* <Typography variant="caption" color="textSecondary">
              Allowed *.jpeg, *.jpg, *.png, *.gif <br />
              max size of 3 Mb
            </Typography> */}
        </Box>
      </Box>
    </Paper>
  );
};

export default UploadPhoto;
