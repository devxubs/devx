import {
   Paper,
   Stack,
   Typography,
   TextField,
   IconButton,
   Collapse,
   FormControl,
   Grid,
   MenuItem,
   Select,
   alpha,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow as TableRowMUI,
   useTheme,
} from "@mui/material";
import React, { useState } from "react";
import { Controller } from "react-hook-form";
import Icon from "@src/components/Icon";
import CustomAutocomplete from "@src/components/Autocomplete";
import { PurchaseTypes } from "..";
import type { ProductOption, SupplierOption } from "./index";

interface DetailsProps {
   control: any;
   errors: any;
   data: PurchaseTypes;
   // Phase 2 (2.4): options come from the real suppliers/products APIs
   // (fetched by the Publish page). The previous sources were the
   // `suppliersData` / `productsData` exports — both empty arrays.
   supplierOptions?: SupplierOption[];
   productOptions?: ProductOption[];
   onSupplierSelect?: (name: string) => void;
}

const Details = ({
   control,
   errors,
   data,
   supplierOptions = [],
   productOptions = [],
   onSupplierSelect,
}: DetailsProps) => {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(true);

   const supplierName = supplierOptions.map((sd) => sd.name);
   const productName = productOptions.map((pd) => pd.name);

   return (
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         {/* Header */}
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            p={3}
         >
            <Stack spacing={0.5}>
               <Typography variant="body1" fontSize={18} color="textPrimary">
                  Details
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Supplier, Products...
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
            <Grid container spacing={3} p={2}>
               <Grid size={{ xs: 12, md: 6 }}>
                  {/* Supplier */}
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Supplier
                     </Typography>
                     <Controller
                        name="supplier"
                        control={control}
                        defaultValue={data.supplier || ""}
                        render={({ field }) => (
                           <CustomAutocomplete
                              {...field}
                              placeholder="Supplier"
                              arrow
                              label="Supplier"
                              options={supplierName}
                              value={field.value || []} // ✅ always controlled
                              onChange={(val: any, e: any) => {
                                 field.onChange(val);
                                 onSupplierSelect?.(
                                    typeof val === "string" ? val : "",
                                 );
                              }}
                              error={!!errors.supplier}
                              helperText={errors.supplier?.message}
                              getOptionLabel={(option) => option.toString()}
                           />
                        )}
                     />
                  </Stack>
               </Grid>
               <Grid size={{ xs: 12, md: 6 }}>
                  {/* Product */}
                  <Stack spacing={1.5}>
                     <Typography
                        variant="h6"
                        fontSize={"13px!important"}
                        fontWeight={500}
                     >
                        Product
                     </Typography>
                     <Controller
                        name="product"
                        control={control}
                        defaultValue={data.product || ""}
                        render={({ field }) => {
                           const allProducts = field.value || [];
                           return (
                              <>
                                 <CustomAutocomplete
                                    value={
                                       allProducts.map((p: any) => p.name) || []
                                    } // always array
                                    onChange={(val: string[]) => {
                                       const newProducts = val.map((name) => {
                                          const existing = allProducts.find(
                                             (p: any) => p.name === name,
                                          );
                                          if (existing) return existing;

                                          const found = productOptions.find(
                                             (p) => p.name === name,
                                          );

                                          // Phase 2 (2.4): the line item
                                          // carries its productId so the
                                          // API can credit/debit the real
                                          // product's stock. INV-02: it
                                          // also carries the product's
                                          // variants so a variant can be
                                          // picked per line below.
                                          return found
                                             ? {
                                                  id: found.id,
                                                  productId: found.id,
                                                  variantId: null,
                                                  variantName: null,
                                                  variants: found.variants || [],
                                                  name: found.name,
                                                  code: found.code,
                                                  quantity: 1,
                                                  price: found.price,
                                               }
                                             : null;
                                       });
                                       field.onChange(
                                          newProducts.filter(Boolean),
                                       ); // remove nulls
                                    }}
                                    error={!!errors.products}
                                    helperText={errors.products?.message}
                                    arrow
                                    option={productName}
                                    placeholder="Search product..."
                                    label="Search"
                                    multiple
                                    getOptionLabel={(option) =>
                                       option?.toString() || ""
                                    }
                                    limitTags={1}
                                 />

                                 {errors.products && (
                                    <Typography
                                       color="error"
                                       variant="caption"
                                       sx={{ mt: 0.5 }}
                                    >
                                       {errors.products.message}
                                    </Typography>
                                 )}
                              </>
                           );
                        }}
                     />
                  </Stack>
               </Grid>
            </Grid>
            <Stack p={2}>
               <Controller
                  name="product"
                  control={control}
                  render={({ field }) => {
                     const allProducts = field.value || [];

                     if (!allProducts.length) {
                        return (
                           <Stack
                              alignItems="center"
                              justifyContent="center"
                              p={3}
                              sx={{ color: theme.palette.text.secondary }}
                           >
                              <Typography>No item added</Typography>
                           </Stack>
                        );
                     }
                     return (
                        <TableContainer
                           component={Paper}
                           sx={[
                              {
                                 maxHeight: 300,
                                 overflowY: "auto",
                                 scrollbarWidth: "none!important",
                                 backgroundColor: alpha(
                                    theme.palette.grey[400],
                                    0.1,
                                 ),
                                 "&::-webkit-scrollbar": { display: "none" },
                              },
                              theme.applyStyles("dark", {
                                 backgroundColor: alpha(
                                    theme.palette.background.default,
                                    0.1,
                                 ),
                              }),
                           ]}
                        >
                           <Table stickyHeader sx={{ minWidth: 650 }}>
                              <TableHead
                                 sx={{
                                    "& th": {
                                       backgroundColor: theme.palette.grey[300],
                                       ...theme.applyStyles("dark", {
                                          backgroundColor:
                                             theme.palette.grey[800], // dark mode
                                       }),
                                    },
                                 }}
                              >
                                 <TableRowMUI>
                                    <TableCell>Name</TableCell>
                                    <TableCell align="left">Quantity</TableCell>
                                    <TableCell align="left">Price</TableCell>
                                    <TableCell align="left">Subtotal</TableCell>
                                    <TableCell align="left"></TableCell>
                                 </TableRowMUI>
                              </TableHead>
                              <TableBody>
                                 {allProducts.map((row: any, idx: number) => {
                                    // INV-02: variants come from the line
                                    // itself (set when the product was
                                    // picked) or from the product option.
                                    const opt = productOptions.find(
                                       (o) =>
                                          o.id === (row.productId || row.id),
                                    );
                                    const lineVariants: any[] =
                                       row.variants?.length
                                          ? row.variants
                                          : opt?.variants || [];
                                    return (
                                    <TableRowMUI key={idx}>
                                       <TableCell>
                                          <Stack spacing={0.5}>
                                             <Typography variant="body2">
                                                {row.name}
                                             </Typography>
                                             {lineVariants.length > 0 ? (
                                                <FormControl
                                                   size="small"
                                                   sx={{ minWidth: 170, maxWidth: 230 }}
                                                >
                                                   <Select
                                                      value={row.variantId || ""}
                                                      displayEmpty
                                                      onChange={(e) => {
                                                         const v = lineVariants.find(
                                                            (x: any) =>
                                                               x.id ===
                                                               String(e.target.value),
                                                         );
                                                         const updated = [
                                                            ...allProducts,
                                                         ];
                                                         updated[idx] = {
                                                            ...updated[idx],
                                                            variantId: v ? v.id : null,
                                                            variantName: v
                                                               ? v.variantName
                                                               : null,
                                                            code: v
                                                               ? v.sku
                                                               : updated[idx].code,
                                                            price: v
                                                               ? Number(v.costPrice) || updated[idx].price
                                                               : updated[idx].price,
                                                         };
                                                         field.onChange(updated);
                                                      }}
                                                      sx={{
                                                         height: 28,
                                                         fontSize: "0.78rem",
                                                         "& .MuiSelect-select": {
                                                            py: "3px",
                                                         },
                                                      }}
                                                      renderValue={(selected) => {
                                                         if (!selected) {
                                                            return (
                                                               <Typography
                                                                  variant="body2"
                                                                  color="warning.main"
                                                                  fontSize="0.78rem"
                                                               >
                                                                  Select variant
                                                               </Typography>
                                                            );
                                                         }
                                                         const v = lineVariants.find(
                                                            (x: any) => x.id === selected,
                                                         );
                                                         return v
                                                            ? `${v.variantName} (${v.sku})`
                                                            : row.variantName || "Select variant";
                                                      }}
                                                   >
                                                      {lineVariants.map((v: any) => {
                                                         const attrs = v.attributes
                                                            ? Object.values(v.attributes)
                                                                 .filter(Boolean)
                                                                 .join(" · ")
                                                            : "";
                                                         return (
                                                            <MenuItem key={v.id} value={v.id}>
                                                               <Stack>
                                                                  <Typography variant="body2">
                                                                     {v.variantName}
                                                                     {attrs ? ` — ${attrs}` : ""}
                                                                  </Typography>
                                                                  <Typography
                                                                     variant="caption"
                                                                     color="text.secondary"
                                                                  >
                                                                     SKU: {v.sku} · Stock:{" "}
                                                                     {Number(v.quantity) || 0}
                                                                  </Typography>
                                                               </Stack>
                                                            </MenuItem>
                                                         );
                                                      })}
                                                   </Select>
                                                </FormControl>
                                             ) : row.variantName ? (
                                                <Typography
                                                   variant="caption"
                                                   color="primary.main"
                                                   fontWeight={600}
                                                >
                                                   Variant: {row.variantName}
                                                </Typography>
                                             ) : null}
                                          </Stack>
                                       </TableCell>
                                       <TableCell align="left">
                                          <TextField
                                             type="number"
                                             size="small"
                                             value={row.quantity}
                                             onChange={(e) => {
                                                const newQuantity =
                                                   parseInt(
                                                      e.target.value,
                                                      10,
                                                   ) || 1;
                                                const updated = [
                                                   ...allProducts,
                                                ];
                                                updated[idx] = {
                                                   ...updated[idx],
                                                   quantity: newQuantity,
                                                };
                                                field.onChange(updated);
                                             }}
                                             sx={{ width: 70 }}
                                          />
                                       </TableCell>
                                       <TableCell align="left">
                                          <TextField
                                             type="number"
                                             size="small"
                                             value={row.price}
                                             onChange={(e) => {
                                                const newPrice =
                                                   e.target.value === ""
                                                      ? 0
                                                      : parseFloat(
                                                           e.target.value,
                                                        );
                                                const updated = [
                                                   ...allProducts,
                                                ];
                                                updated[idx] = {
                                                   ...updated[idx],
                                                   price: newPrice,
                                                };
                                                field.onChange(updated);
                                             }}
                                             sx={{ width: 80 }}
                                          />
                                       </TableCell>
                                       <TableCell align="left">
                                          {(
                                             Number(row.price) *
                                             Number(row.quantity)
                                          ).toFixed(2)}
                                       </TableCell>
                                       <TableCell align="left">
                                          <IconButton
                                             onClick={() => {
                                                const updated =
                                                   allProducts.filter(
                                                      (_: any, i: number) =>
                                                         i !== idx,
                                                   );
                                                field.onChange(updated);
                                             }}
                                          >
                                             <Icon icon="carbon:close" />
                                          </IconButton>
                                       </TableCell>
                                    </TableRowMUI>
                                    );
                                 })}
                              </TableBody>
                           </Table>
                        </TableContainer>
                     );
                  }}
               />
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default Details;
