import {
  AccordionSummary,
  accordionSummaryClasses,
  Stack,
  Typography,
  AccordionDetails,
  TextField,
  Box,
  IconButton,
} from "@mui/material";
import Accordion from "@mui/material/Accordion";
import CustomAutocomplete from "@src/components/Autocomplete";
import React from "react";
import UploadPhoto from "./imageUploader";
import Icon from "@src/components/Icon";

interface DetailsProps {
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
  detailsData,
  handleRemove,
  onDetailsDataChange,
}: DetailsProps) => {
  return (
    <Accordion
      sx={{
        borderRadius: "16px!important",
        boxShadow: 15,
      }}
      defaultExpanded={false}
    >
      <AccordionSummary
        expandIcon={<Icon icon="solar:alt-arrow-right-broken" />}
        focusRipple={false}
        sx={{
          p: 2,
          "& .MuiAccordionSummary-content": {
            m: "0px!important",
          },
          [`& .${accordionSummaryClasses.expandIconWrapper}.${accordionSummaryClasses.expanded}`]:
            {
              transform: "rotate(90deg)",
            },
        }}
      >
        <Stack spacing={1} p={2}>
          <Typography
            variant="body1"
            fontSize={18}
            color="textPrimary"
            sx={{
              "&:hover": {
                cursor: "pointer",
                textDecoration: "underline",
              },
            }}
          >
            Details
          </Typography>
          <Typography
            variant="body2"
            fontSize={13}
            fontWeight={400}
            color="textSecondary"
          >
            Title, Category, short description, image...
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <Stack
            spacing={2}
            direction={"row"}
            alignItems={"center"}
            width={"100%"}
            mb={2}
          >
            <Stack spacing={1.5} flex={1}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Product Name
              </Typography>
              <TextField
                label="Product Name"
                variant="outlined"
                required
                onChange={(e) => {
                  onDetailsDataChange("name", e.target.value);
                }}
                value={detailsData.name}
              />
            </Stack>
            <Stack spacing={1.5} flex={1}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Category
              </Typography>
              <CustomAutocomplete
                label="Category"
                option={["Active", "Inactive"]}
                onChange={(v: any) => {
                  onDetailsDataChange("category", v);
                }}
              />
            </Stack>
          </Stack>
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Sub description
            </Typography>
            <TextField
              label="Sub description"
              variant="outlined"
              multiline
              rows={4}
              onChange={(e) => {
                onDetailsDataChange("subDescription", e.target.value);
              }}
              value={detailsData.subDescription}
              sx={{
                fontSize: 14,
              }}
            />
          </Stack>
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Content
            </Typography>
            <TextField
              label="Content"
              variant="outlined"
              placeholder="Write something about this product"
              multiline
              rows={4}
              onChange={(e) => {
                onDetailsDataChange("content", e.target.value);
              }}
              value={detailsData.content}
              sx={{
                fontSize: 14,
              }}
            />
          </Stack>
          <Stack spacing={1.5}>
            <Typography
              variant="h6"
              fontSize={"13px!important"}
              fontWeight={500}
            >
              Images
            </Typography>
            <UploadPhoto
              onImageUpload={(file) => {
                onDetailsDataChange("images", file);
              }}
            />
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
                mt: "24px!important",
              }}
            >
              {detailsData.images.map((src, index) => {
                const objectUrl = URL.createObjectURL(src);

                return (
                  <Box
                    key={index}
                    sx={{
                      position: "relative",
                      width: 80,
                      height: 80,
                      borderRadius: 0.8,
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={objectUrl}
                      alt={objectUrl}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleRemove(index)}
                      sx={{
                        position: "absolute",
                        top: 2,
                        right: 2,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        color: "white",
                        "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
                        width: 22,
                        height: 22,
                      }}
                    >
                      <Icon icon="ic:round-close" />
                      {/* <CloseIcon sx={{ fontSize: 14 }} /> */}
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          </Stack>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
};

export default Details;
