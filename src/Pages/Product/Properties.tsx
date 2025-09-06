import {
  Accordion,
  AccordionSummary,
  accordionSummaryClasses,
  Stack,
  Typography,
  AccordionDetails,
  TextField,
  Grid,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import React from "react";

const Properties = () => {
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
            Properties
          </Typography>
          <Typography
            variant="body2"
            fontSize={13}
            fontWeight={400}
            color="textSecondary"
          >
            Additional functions and attributes...
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Product code
              </Typography>
              <TextField
                label="Product code"
                variant="outlined"
                required
                // onChange={(e) => {
                //   onDetailsDataChange("name", e.target.value);
                // }}
                // value={detailsData.name}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Product sku
              </Typography>
              <TextField
                label="Product sku"
                variant="outlined"
                required
                // onChange={(e) => {
                //   onDetailsDataChange("name", e.target.value);
                // }}
                // value={detailsData.name}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Quantity
              </Typography>
              <TextField
                label="Quantity"
                variant="outlined"
                type="number"
                required
                sx={{
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      display: "none",
                    },
                }}
                // onChange={(e) => {
                //   onDetailsDataChange("name", e.target.value);
                // }}
                // value={detailsData.name}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
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
                  //   onDetailsDataChange("category", v);
                }}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
            <Stack spacing={1.5} flex={1}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Color
              </Typography>
              <CustomAutocomplete
                label="Color"
                option={[
                  "Red",
                  "Blue",
                  "Green",
                  "Yellow",
                  "Black",
                  "White",
                  "Gray",
                  "Purple",
                  "Orange",
                  "Pink",
                  "Brown",
                  "Cyan",
                  "Magenta",
                  "Lime",
                  "Maroon",
                  "Navy",
                  "Olive",
                  "Teal",
                  "Silver",
                  "Gold",
                  "Beige",
                  "Coral",
                  "Turquoise",
                  "Indigo",
                  "Violet",
                  "Amber",
                  "Crimson",
                  "Azure",
                  "Ivory",
                  "Lavender",
                  "Mint",
                  "Peach",
                  "Plum",
                  "Salmon",
                  "Tan",
                  "Chocolate",
                  "Charcoal",
                  "Emerald",
                  "Sapphire",
                  "Ruby",
                  "Onyx",
                  "Pearl",
                  "Bronze",
                  "Copper",
                  "Fuchsia",
                  "Khaki",
                  "Mauve",
                  "Ochre",
                  "Periwinkle",
                  "Sienna",
                  "Umber",
                  "Zinc",
                ]}
                multiple
                onChange={(v: any) => {
                  //   onDetailsDataChange("category", v);
                }}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }} spacing={2}>
            <Stack spacing={1.5} flex={1}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Size
              </Typography>
              <CustomAutocomplete
                label="Size"
                option={[
                  "66 inch",
                  "45 inch",
                  "34 inch",
                  "24 inch",
                  "400 ml",
                  "200 ml",
                  "100 ml",
                  "200 g",
                  "180 g",
                  "100 g",
                  "50 g",
                  "0.5 kg",
                  "1 kg",
                ]}
                multiple
                onChange={(v: any) => {
                  //   onDetailsDataChange("category", v);
                }}
              />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 12 }} spacing={2}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Tags
              </Typography>
              <TextField
                label="Tags"
                variant="outlined"
                type="number"
                required
                sx={{
                  "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                    {
                      display: "none",
                    },
                }}
                // onChange={(e) => {
                //   onDetailsDataChange("name", e.target.value);
                // }}
                // value={detailsData.name}
              />
            </Stack>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};

export default Properties;
