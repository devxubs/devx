import {
  Paper,
  Stack,
  Typography,
  TextField,
  Box,
  IconButton,
  Collapse,
} from "@mui/material";
import React, { useState } from "react";
import { Controller } from "react-hook-form";
import UploadPhoto from "./imageUploader";
import Icon from "@src/components/Icon";
// import RichTextEditor from "@src/components/RichTextEditor";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("@src/components/RichTextEditor"), {
  ssr: false,
});

interface DetailsProps {
  formControl: any;
  errors: any;
  detailsData: {
    name: string;
    category: string;
    subDescription: string;
    content: string;
    images: File[];
  };
  onDetailsDataChange: (field: string, value: any) => void;
  handleRemove: (index: number) => void;
}

const Details = ({
  formControl,
  errors,
  detailsData,
  handleRemove,
  onDetailsDataChange,
}: DetailsProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p={3}
        sx={{ cursor: "pointer" }}
      >
        <Stack spacing={0.5}>
          <Typography variant="body1" fontSize={18} color="textPrimary">
            Details
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Title, Category, short description, image...
          </Typography>
        </Stack>
        <IconButton onClick={() => setExpanded(!expanded)}>
          <Icon
            style={{
              transform: `rotate(${expanded ? 90 : 0}deg)`,
              transition: "all 0.2s",
            }}
            icon={"solar:alt-arrow-right-broken"}
          />
        </IconButton>
      </Stack>

      {/* Animated Content */}
      <Collapse in={expanded}>
        <Stack spacing={3} p={2}>
          {/* Product Name */}
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Product Name
            </Typography>
            <Controller
              name="product_name"
              control={formControl}
              defaultValue={""}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  error={!!errors.product_name}
                  helperText={errors.product_name?.message}
                  label="Product Name"
                  variant="outlined"
                  required
                />
              )}
            />
          </Stack>

          {/* Sub Description */}
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Sub Description
            </Typography>
            <Controller
              name="sub_description"
              control={formControl}
              defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value ?? ""}
                  error={!!errors.sub_description}
                  helperText={errors.sub_description?.message}
                  label="Sub Description"
                  variant="outlined"
                  multiline
                  rows={4}
                />
              )}
            />
          </Stack>

          {/* Content / RichText */}
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Content
            </Typography>
            <Stack>
              <Controller
                name="content"
                control={formControl}
                defaultValue=""
                render={({ field }) => (
                  <RichTextEditor
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.content}
                    helperText={errors.content?.message}
                  />
                )}
              />
              <Typography variant="caption" color="error" ml={1.5}>
                {errors.content?.message}
              </Typography>
            </Stack>
          </Stack>

          {/* Images */}
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Images
            </Typography>
            <Stack>
              <Controller
                name="images"
                control={formControl}
                defaultValue={[]}
                render={({ field }) => (
                  <UploadPhoto
                    {...field}
                    value={field.value ?? []}
                    error={!!errors.images}
                    helperText={errors.images?.message}
                    onImageUpload={(file) => field.onChange(file)}
                  />
                )}
              />
              <Typography variant="caption" color="error" ml={1.5} mt={0.6}>
                {errors.images?.message}
              </Typography>
            </Stack>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mt: 2 }}>
              {detailsData.images.map((file, index) => {
                const objectUrl = URL.createObjectURL(file);
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
                      src={objectUrl}
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
        </Stack>
      </Collapse>
    </Paper>
  );
};

export default Details;
