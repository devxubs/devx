"use client";

import React, { useCallback } from "react";
import {
   Box,
   Chip,
   Divider,
   IconButton,
   Paper,
   Stack,
   Tooltip,
   Typography,
   alpha,
   useTheme,
} from "@mui/material";
import { useDropzone } from "react-dropzone";
import Icon from "@src/components/Icon";
import UploadIcon from "@src/SvgIcon/UploadIcon";

interface ProductMediaSectionProps {
   images: any[];
   onChangeImages: (imgs: any[]) => void;
   error?: string;
}

export const ProductMediaSection: React.FC<ProductMediaSectionProps> = ({
   images = [],
   onChangeImages,
   error,
}) => {
   const theme = useTheme();

   const onDrop = useCallback(
      (acceptedFiles: File[]) => {
         if (!acceptedFiles.length) return;
         // In Next.js POS client, convert to object URLs or data URLs
         const newUrls = acceptedFiles.map((file) => URL.createObjectURL(file));
         onChangeImages([...images, ...newUrls]);
      },
      [images, onChangeImages],
   );

   const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp", ".avif"] },
      maxSize: 5 * 1024 * 1024, // 5MB
      multiple: true,
   });

   const handleRemove = (index: number) => {
      const copy = [...images];
      copy.splice(index, 1);
      onChangeImages(copy);
   };

   const handleSetCover = (index: number) => {
      if (index === 0) return;
      const copy = [...images];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      onChangeImages(copy);
   };

   return (
      <Paper
         id="section-3-media"
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:gallery-linear"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography variant="subtitle1" fontWeight={700} sx={{ letterSpacing: "-0.01em" }}>
                        3. Product Images & Media
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     High-resolution photography, thumbnails, and cover image for customer displays
                  </Typography>
               </Stack>
               <Typography variant="caption" color="text.secondary">
                  {images.length} / 5 uploaded
               </Typography>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/* Dropzone Area */}
            <Paper
               {...getRootProps()}
               variant="outlined"
               sx={{
                  border: "1.5px dashed",
                  borderColor: error
                     ? "error.main"
                     : isDragActive
                     ? "primary.main"
                     : "divider",
                  borderRadius: 1.5,
                  p: { xs: 2, sm: 3 },
                  textAlign: "center",
                  cursor: "pointer",
                  bgcolor: isDragActive
                     ? alpha(theme.palette.primary.main, 0.05)
                     : alpha(theme.palette.background.default, 0.4),
                  transition: "all 0.2s ease",
                  "&:hover": {
                     borderColor: "primary.main",
                     bgcolor: alpha(theme.palette.primary.main, 0.02),
                  },
               }}
            >
               <input {...getInputProps()} />
               <Stack alignItems="center" spacing={1}>
                  <Box
                     sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "primary.main",
                     }}
                  >
                     <UploadIcon />
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="text.primary">
                     Drag & drop product images, or{" "}
                     <Typography component="span" variant="body2" color="primary" sx={{ textDecoration: "underline" }}>
                        browse device
                     </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                     Supports PNG, JPG, WebP up to 5MB each. First image becomes primary cover.
                  </Typography>
               </Stack>
            </Paper>

            {error && (
               <Typography variant="caption" color="error">
                  {error}
               </Typography>
            )}

            {/* Image Preview List */}
            {images.length > 0 && (
               <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 1 }}>
                  {images.map((item, index) => {
                     const src = typeof item === "string" ? item : URL.createObjectURL(item);
                     const isCover = index === 0;
                     return (
                        <Box
                           key={index}
                           sx={{
                              position: "relative",
                              width: 90,
                              height: 90,
                              borderRadius: 1.5,
                              overflow: "hidden",
                              border: "1.5px solid",
                              borderColor: isCover ? "primary.main" : "divider",
                              bgcolor: "background.default",
                              "&:hover .media-overlay": { opacity: 1 },
                           }}
                        >
                           <Box
                              component="img"
                              src={src}
                              alt={`product-${index}`}
                              sx={{
                                 width: "100%",
                                 height: "100%",
                                 objectFit: "cover",
                              }}
                           />

                           {/* Cover Badge */}
                           {isCover && (
                              <Chip
                                 size="small"
                                 label="Cover"
                                 color="primary"
                                 sx={{
                                    position: "absolute",
                                    top: 4,
                                    left: 4,
                                    height: 18,
                                    fontSize: "0.62rem",
                                    fontWeight: 700,
                                 }}
                              />
                           )}

                           {/* Hover Action Overlay */}
                           <Box
                              className="media-overlay"
                              sx={{
                                 position: "absolute",
                                 inset: 0,
                                 bgcolor: "rgba(0,0,0,0.6)",
                                 display: "flex",
                                 alignItems: "center",
                                 justifyContent: "center",
                                 gap: 0.5,
                                 opacity: 0,
                                 transition: "opacity 0.15s ease",
                              }}
                           >
                              {!isCover && (
                                 <Tooltip title="Set as primary cover" disableInteractive>
                                    <IconButton
                                       size="small"
                                       onClick={() => handleSetCover(index)}
                                       sx={{ color: "white" }}
                                    >
                                       <Icon icon="solar:star-linear" size="16px" />
                                    </IconButton>
                                 </Tooltip>
                              )}
                              <Tooltip title="Remove photo" disableInteractive>
                                 <IconButton
                                    size="small"
                                    onClick={() => handleRemove(index)}
                                    sx={{ color: "error.light" }}
                                 >
                                    <Icon icon="solar:trash-bin-trash-bold" size="16px" />
                                 </IconButton>
                              </Tooltip>
                           </Box>
                        </Box>
                     );
                  })}
               </Box>
            )}
         </Stack>
      </Paper>
   );
};
