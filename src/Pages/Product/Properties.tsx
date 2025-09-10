import {
  Accordion,
  AccordionSummary,
  accordionSummaryClasses,
  Stack,
  Typography,
  AccordionDetails,
  TextField,
  Grid,
  IconButton,
  Collapse,
  Paper,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import { Controller } from "react-hook-form";

import Icon from "@src/components/Icon";
import React, { useState } from "react";

interface PricingProps {
  formControl: any;
  errors: any;
}

const Properties = ({ formControl, errors }: PricingProps) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p={3}
        sx={{ cursor: "pointer" }}
      >
        <Stack spacing={1}>
          <Typography variant="body1" fontSize={18} color="textPrimary">
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
      <Collapse in={expanded}>
        <Grid container spacing={3} p={2}>
          <Grid size={{ xs: 12 }} spacing={2}>
            <Stack spacing={1.5}>
              <Typography
                variant="h6"
                fontSize={"13px!important"}
                fontWeight={500}
              >
                Product code
              </Typography>
              <Controller
                name="product_code"
                control={formControl}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    error={!!errors.product_code}
                    helperText={errors.product_code?.message}
                    label="Product code"
                    variant="outlined"
                    required
                  />
                )}
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
              <Controller
                name="product_sku"
                control={formControl}
                defaultValue=""
                render={({ field }) => (
                  <TextField
                    {...field}
                    error={!!errors.product_sku}
                    helperText={errors.product_sku?.message}
                    label="Product sku"
                    variant="outlined"
                    required
                  />
                )}
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
              <Controller
                name="quantity"
                control={formControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    value={field.value ?? 0}
                    error={!!errors.quantity}
                    helperText={errors.quantity?.message}
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
                  />
                )}
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
              <Controller
                name="category"
                control={formControl}
                defaultValue={[]}
                render={({ field }) => (
                  <CustomAutocomplete
                    {...field}
                    value={field.value || []} // ✅ always controlled
                    onChange={(val: any, e: any) => field.onChange(val)}
                    error={!!errors.category}
                    helperText={errors.category?.message}
                    arrow
                    label="Category"
                    option={["Active", "Inactive"]}
                    getOptionLabel={(option) => option.toString()}
                  />
                )}
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
                Product type
              </Typography>
              <Controller
                name="product_type"
                control={formControl}
                defaultValue={[]}
                render={({ field }) => (
                  <CustomAutocomplete
                    {...field}
                    value={field.value || []} // ✅ always controlled
                    onChange={(val: any, e: any) => field.onChange(val)}
                    error={!!errors.product_type}
                    helperText={errors.product_type?.message}
                    arrow
                    label="Product type"
                    option={["Simple", "Variable", "Bundle"]}
                    getOptionLabel={(option) => option.toString()}
                  />
                )}
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
              <Controller
                name="color"
                control={formControl}
                defaultValue={[]}
                render={({ field }) => (
                  <CustomAutocomplete
                    {...field}
                    value={field.value || []} // ✅ always controlled
                    onChange={(val: any, e: any) => field.onChange(val)}
                    error={!!errors.color}
                    helperText={errors.color?.message}
                    arrow
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
                    getOptionLabel={(option) => option.toString()}
                  />
                )}
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
              <Controller
                name="size"
                control={formControl}
                defaultValue={[]}
                render={({ field }) => (
                  <CustomAutocomplete
                    {...field}
                    value={field.value || []} // ✅ always controlled
                    onChange={(val: any, e: any) => field.onChange(val)}
                    error={!!errors.size}
                    helperText={errors.size?.message}
                    arrow
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
                    getOptionLabel={(option) => option.toString()}
                  />
                )}
              />
            </Stack>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
};

export default Properties;
