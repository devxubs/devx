"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
   Box,
   Typography,
   Paper,
   useTheme,
   alpha,
   Stack,
   IconButton,
} from "@mui/material";
import Icon from "@src/components/Icon";
import UploadIcon from "@src/SvgIcon/UploadIcon";

interface AttachmentUploaderProps {
   error?: boolean;
   helperText?: string;
   value?: File[];
   onChange?: Function;
}

const AttachmentUploader = ({
   error,
   helperText,
   value,
   onChange,
}: AttachmentUploaderProps) => {
   const theme = useTheme();

   const [attachment, setAttachment] = useState<File[]>(value || []);

   const onDrop = (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setAttachment([...acceptedFiles, ...attachment]);
   };

   useEffect(() => {
      onChange?.(attachment);
   }, [attachment]);

   const handleRemove = (index: number) => {
      setAttachment(attachment.filter((_, i) => i !== index));
      onChange?.(value?.filter((_, i) => i !== index));
   };

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: {
         "image/*": [],
      },
      maxSize: 14 * 1024 * 1024,
      multiple: true,
   });

   return (
      <Stack spacing={1}>
         <Paper
            {...getRootProps()}
            sx={{
               border: "1px dashed",
               borderColor: error
                  ? "error.main"
                  : isDragActive
                  ? alpha(theme.palette.primary.main, 0.7)
                  : "divider",
               borderRadius: 1.5,
               textAlign: "center",
               cursor: "pointer",
               backgroundColor: error
                  ? alpha(theme.palette.error.main, 0.08)
                  : "background.paper",
               transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
               width: "100%",
               height: 200,
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
                  <Typography
                     variant="body1"
                     fontSize={13}
                     color={"textSecondary"}
                  >
                     Drag files here, or{" "}
                     <Typography
                        variant="body1"
                        fontSize={13}
                        component={"span"}
                        color="primary"
                        sx={{ textDecoration: "underline" }}
                     >
                        browse
                     </Typography>{" "}
                     your device.
                  </Typography>
               </Box>
            </Box>
         </Paper>

         <Typography variant="caption" color="error" ml={1.5} mt={0.6}>
            {helperText}
         </Typography>
         <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 0 }}>
            {(value || []).map((file, index) => {
               // const objectUrl = URL.createObjectURL(file);

               let url = "";

               if (typeof file === "string") {
                  url = file;
               } else {
                  url = URL.createObjectURL(file);
               }

               return (
                  <Box
                     key={index}
                     sx={{
                        position: "relative",
                        width: 80,
                        height: 80,
                        borderRadius: 1,
                        overflow: "hidden",
                     }}
                  >
                     <img
                        src={url}
                        alt={`img-${index}`}
                        style={{
                           width: "100%",
                           height: "100%",
                           objectFit: "cover",
                        }}
                     />
                     <IconButton
                        size="small"
                        onClick={() => handleRemove(index)}
                        sx={{
                           position: "absolute",
                           top: 2,
                           right: 2,
                           bgcolor: "rgba(0,0,0,0.6)",
                           color: "white",
                           "&:hover": { bgcolor: "rgba(0,0,0,0.8)" },
                           width: 22,
                           height: 22,
                        }}
                     >
                        <Icon icon="ic:round-close" />
                     </IconButton>
                  </Box>
               );
            })}
         </Box>
      </Stack>
   );
};

export default AttachmentUploader;
