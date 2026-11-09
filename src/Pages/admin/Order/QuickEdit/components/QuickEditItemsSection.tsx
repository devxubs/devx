import React, { useState, useEffect } from "react";
import {
   Avatar,
   Box,
   Chip,
   CircularProgress,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableRow,
   TextField,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import CustomAutocomplete from "@src/components/Autocomplete";
import Icon from "@src/components/Icon";
import { ProductType } from "../../type";

interface QuickEditItemsSectionProps {
   items: ProductType[];
   onUpdateQuantity: (index: number, quantity: number) => void;
   onUpdatePrice: (index: number, price: number) => void;
   onUpdateSubtotal: (index: number, subtotal: number) => void;
   onRemoveItem: (index: number) => void;
   onAddItem: (product: any) => void;
   disabled?: boolean;
}

export const QuickEditItemsSection: React.FC<QuickEditItemsSectionProps> = ({
   items,
   onUpdateQuantity,
   onUpdatePrice,
   onUpdateSubtotal,
   onRemoveItem,
   onAddItem,
   disabled = false,
}) => {
   const theme = useTheme();

   const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
   const [isCatalogLoading, setIsCatalogLoading] = useState(false);
   const [selectedCatalogProduct, setSelectedCatalogProduct] =
      useState<any | null>(null);

   // Fetch active products from catalog
   useEffect(() => {
      let isMounted = true;
      setIsCatalogLoading(true);
      fetch("/api/products?limit=100")
         .then((res) => (res.ok ? res.json() : null))
         .then((data) => {
            if (isMounted && data?.products) {
               // Only active non-deleted products can be added
               setCatalogProducts(
                  data.products.filter((p: any) => !p.isDeleted),
               );
            }
         })
         .catch(() => {})
         .finally(() => {
            if (isMounted) setIsCatalogLoading(false);
         });

      return () => {
         isMounted = false;
      };
   }, []);

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: 1,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2}>
            {/* Section Header */}
            <Stack
               direction={{ xs: "column", sm: "row" }}
               spacing={1.5}
               alignItems={{ xs: "flex-start", sm: "center" }}
               justifyContent="space-between"
            >
               <Stack direction="row" spacing={1} alignItems="center">
                  <Icon
                     icon="solar:box-minimalistic-bold"
                     size="small"
                     style={{
                        color: "var(--mui-palette-primary-main, #00A76F)",
                     }}
                  />
                  <Typography variant="subtitle2" fontWeight={700}>
                     Order Items & Products ({items.length})
                  </Typography>
               </Stack>

               {/* Catalog Autocomplete Search using existing CustomAutocomplete */}
               <Box sx={{ width: { xs: "100%", sm: 340 } }}>
                  <CustomAutocomplete
                     size="small"
                     arrow
                     options={catalogProducts}
                     loading={isCatalogLoading}
                     value={selectedCatalogProduct}
                     disabled={disabled}
                     placeholder="+ Add Product to Order..."
                     onChange={(newValue) => {
                        if (
                           newValue &&
                           typeof newValue === "object" &&
                           (newValue.id || newValue.productName)
                        ) {
                           onAddItem(newValue);
                           setSelectedCatalogProduct(null);
                        }
                     }}
                     getOptionLabel={(option: any) => {
                        if (!option) return "";
                        if (typeof option === "string") return option;
                        const code =
                           option.productCode ||
                           option.customId ||
                           option.code ||
                           "";
                        const price = Number(
                           option.salePrice ??
                              option.regularPrice ??
                              option.price ??
                              0,
                        );
                        return `${option.productName || option.name || "Product"} ${code ? `(${code})` : ""} - ৳${price}`;
                     }}
                     isOptionEqualToValue={(option: any, val: any) => {
                        if (!option || !val) return false;
                        return option.id === val.id;
                     }}
                     renderOption={(props: any, option: any) => {
                        const { key, ...restProps } = props;
                        const price = Number(
                           option.salePrice ??
                              option.regularPrice ??
                              option.price ??
                              0,
                        );
                        return (
                           <Box
                              component="li"
                              key={key || option.id}
                              {...restProps}
                              sx={{
                                 display: "flex",
                                 alignItems: "center",
                                 gap: 1.5,
                                 py: 0.8,
                                 px: 1.5,
                              }}
                           >
                              <Avatar
                                 src={option.images?.[0] || option.image}
                                 variant="rounded"
                                 sx={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: 0.75,
                                 }}
                              >
                                 {(option.productName || option.name || "P")[0]}
                              </Avatar>
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                 <Typography
                                    variant="body2"
                                    fontWeight={600}
                                    noWrap
                                    sx={{ fontSize: "0.82rem" }}
                                 >
                                    {option.productName || option.name}
                                 </Typography>
                                 <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ fontSize: "0.72rem" }}
                                 >
                                    Code:{" "}
                                    {option.productCode ||
                                       option.customId ||
                                       option.code ||
                                       "N/A"}{" "}
                                    • Stock: {option.quantity ?? 0}
                                 </Typography>
                              </Box>
                              <Typography
                                 variant="body2"
                                 fontWeight={700}
                                 color="primary.main"
                                 sx={{ fontSize: "0.82rem" }}
                              >
                                 ৳{price.toLocaleString()}
                              </Typography>
                           </Box>
                        );
                     }}
                  />
               </Box>
            </Stack>

            {/* Items Table Container with hidden scrollbar */}
            <Box
               sx={{
                  width: "100%",
                  overflowX: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  scrollbarWidth: "none !important",
                  msOverflowStyle: "none !important",
                  "&::-webkit-scrollbar": {
                     display: "none !important",
                  },
               }}
            >
               <Table size="small" sx={{ minWidth: 540 }}>
                  <TableHead>
                     <TableRow sx={{ bgcolor: "action.hover" }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.75rem" }}>
                           Item / SKU
                        </TableCell>
                        <TableCell
                           align="center"
                           sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              width: 130,
                           }}
                        >
                           Quantity
                        </TableCell>
                        <TableCell
                           align="right"
                           sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              width: 100,
                           }}
                        >
                           Price (৳)
                        </TableCell>
                        <TableCell
                           align="right"
                           sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              width: 110,
                           }}
                        >
                           Subtotal (৳)
                        </TableCell>
                        <TableCell
                           align="center"
                           sx={{
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              width: 48,
                           }}
                        >
                           Action
                        </TableCell>
                     </TableRow>
                  </TableHead>
                  <TableBody>
                     {items.map((item, idx) => {
                        const imageSrc =
                           typeof item.images === "string" && item.images
                              ? item.images
                              : Array.isArray(item.images) &&
                                  item.images.length > 0
                                ? item.images[0]
                                : "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp";

                        return (
                           <TableRow
                              key={`${item.id || item.productId || idx}-${idx}`}
                              hover
                              sx={{
                                 "&:last-child td, &:last-child th": {
                                    border: 0,
                                 },
                              }}
                           >
                              {/* Product Info */}
                              <TableCell component="th" scope="row">
                                 <Stack
                                    direction="row"
                                    spacing={1.2}
                                    alignItems="center"
                                 >
                                    <Avatar
                                       variant="rounded"
                                       src={imageSrc}
                                       sx={{
                                          width: 38,
                                          height: 38,
                                          borderRadius: 1,
                                          bgcolor: "action.selected",
                                       }}
                                    />
                                    <Stack spacing={0.2} sx={{ minWidth: 0 }}>
                                       <Stack
                                          direction="row"
                                          spacing={0.8}
                                          alignItems="center"
                                       >
                                          <Tooltip
                                             title={item.name}
                                             disableInteractive
                                          >
                                             <Typography
                                                variant="body2"
                                                fontWeight={600}
                                                noWrap
                                                sx={{
                                                   maxWidth: {
                                                      xs: 120,
                                                      sm: 180,
                                                      md: 220,
                                                   },
                                                }}
                                             >
                                                {item.name}
                                             </Typography>
                                          </Tooltip>
                                          {item.isDeleted && (
                                             <Chip
                                                label="Archived"
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                                sx={{
                                                   height: 18,
                                                   fontSize: "0.625rem",
                                                   fontWeight: 600,
                                                }}
                                             />
                                          )}
                                       </Stack>
                                       {item.code && (
                                          <Typography
                                             variant="caption"
                                             color="text.secondary"
                                          >
                                             SKU: {item.code}
                                          </Typography>
                                       )}
                                    </Stack>
                                 </Stack>
                              </TableCell>

                              {/* Quantity Stepper */}
                              <TableCell align="center">
                                 <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="center"
                                    spacing={0.5}
                                 >
                                    <IconButton
                                       size="small"
                                       disabled={item.quantity <= 1 || disabled}
                                       onClick={() =>
                                          onUpdateQuantity(
                                             idx,
                                             item.quantity - 1,
                                          )
                                       }
                                       sx={{ p: 0.5 }}
                                    >
                                       <Icon
                                          icon="solar:minus-circle-bold"
                                          size="small"
                                       />
                                    </IconButton>
                                    <TextField
                                       size="small"
                                       value={item.quantity}
                                       disabled={disabled}
                                       inputProps={{
                                          inputMode: "numeric",
                                          pattern: "[0-9]*",
                                          style: {
                                             textAlign: "center",
                                             padding: "4px 2px",
                                             width: "32px",
                                             fontSize: "0.85rem",
                                             fontWeight: 600,
                                          },
                                       }}
                                       onChange={(e) => {
                                          const val = parseInt(
                                             e.target.value,
                                             10,
                                          );
                                          onUpdateQuantity(
                                             idx,
                                             isNaN(val) ? 1 : Math.max(1, val),
                                          );
                                       }}
                                    />
                                    <IconButton
                                       size="small"
                                       disabled={disabled}
                                       onClick={() =>
                                          onUpdateQuantity(
                                             idx,
                                             item.quantity + 1,
                                          )
                                       }
                                       sx={{ p: 0.5 }}
                                    >
                                       <Icon
                                          icon="solar:add-circle-bold"
                                          size="small"
                                       />
                                    </IconButton>
                                 </Stack>
                              </TableCell>

                              {/* Unit Price */}
                              <TableCell align="right">
                                 <TextField
                                    size="small"
                                    value={item.price}
                                    disabled={disabled}
                                    inputProps={{
                                       type: "number",
                                       min: 0,
                                       step: "any",
                                       style: {
                                          textAlign: "right",
                                          padding: "4px 6px",
                                          fontSize: "0.85rem",
                                       },
                                    }}
                                    sx={{ width: 85 }}
                                    onChange={(e) => {
                                       const val = parseFloat(e.target.value);
                                       onUpdatePrice(
                                          idx,
                                          isNaN(val) ? 0 : Math.max(0, val),
                                       );
                                    }}
                                 />
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell align="right">
                                 <TextField
                                    size="small"
                                    value={
                                       item.subtotal != null
                                          ? item.subtotal
                                          : item.price * item.quantity
                                    }
                                    disabled={disabled}
                                    inputProps={{
                                       type: "number",
                                       min: 0,
                                       step: "any",
                                       style: {
                                          textAlign: "right",
                                          padding: "4px 6px",
                                          fontSize: "0.85rem",
                                          fontWeight: 600,
                                       },
                                    }}
                                    sx={{ width: 95 }}
                                    onChange={(e) => {
                                       const val = parseFloat(e.target.value);
                                       onUpdateSubtotal(
                                          idx,
                                          isNaN(val) ? 0 : Math.max(0, val),
                                       );
                                    }}
                                 />
                              </TableCell>

                              {/* Delete Button */}
                              <TableCell align="center">
                                 <Tooltip
                                    title={
                                       items.length <= 1
                                          ? "Order must have at least one product"
                                          : "Remove item from order"
                                    }
                                    disableInteractive
                                 >
                                    <span>
                                       <IconButton
                                          size="small"
                                          color="error"
                                          disabled={items.length <= 1 || disabled}
                                          onClick={() => onRemoveItem(idx)}
                                          sx={{ p: 0.5 }}
                                       >
                                          <Icon
                                             icon="solar:trash-bin-trash-bold"
                                             size="small"
                                          />
                                       </IconButton>
                                    </span>
                                 </Tooltip>
                              </TableCell>
                           </TableRow>
                        );
                     })}
                  </TableBody>
               </Table>
            </Box>
         </Stack>
      </Paper>
   );
};

export default QuickEditItemsSection;
