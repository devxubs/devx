"use client";

import {
   Paper,
   Stack,
   Typography,
   TextField,
   IconButton,
   Collapse,
   useTheme,
   alpha,
} from "@mui/material";
import React, { useState } from "react";
import Icon from "@src/components/Icon";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import CustomAutocomplete from "@src/components/Autocomplete";
import { productsData } from "@src/Pages/Product";

const ProductDetails = () => {
   const theme = useTheme();
   const [expanded, setExpanded] = useState(true);
   const [products, setProducts] = useState<any[]>([]);
   const [selected, setSelected] = useState<string[]>([]);

   const products_name = productsData.map((p) => p.product_name);

   // Handle quantity or price change
   const handleProductChange = (
      index: number,
      field: "quantity" | "price",
      value: number
   ) => {
      const newProducts = [...products];
      newProducts[index][field] = value;
      setProducts(newProducts);
   };

   // Handle product removal
   const handleRemoveProduct = (index: number) => {
      const newProducts = [...products];
      newProducts.splice(index, 1);
      setProducts(newProducts);
      setSelected(newProducts.map((p) => p.name));
   };

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
                  Products
               </Typography>
               <Typography variant="body2" color="textSecondary">
                  Add Product(s) (search by name)
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
            <Stack spacing={3} p={2} pt={0}>
               {/* Autocomplete */}
               <Stack>
                  <CustomAutocomplete
                     option={products_name}
                     size="small"
                     placeholder="Search product..."
                     label="Search"
                     value={selected}
                     multiple
                     onChange={(d: string[]) => {
                        setSelected(d);

                        const newProducts = d
                           .map((name) => {
                              const p = productsData.find(
                                 (prod) => prod.product_name === name
                              );
                              if (p) {
                                 return {
                                    name: p.product_name,
                                    image: p.images[0],
                                    quantity: 1,
                                    price: parseFloat(p.salePrice),
                                 };
                              }
                              return null;
                           })
                           .filter(Boolean); // remove nulls

                        setProducts(newProducts);
                     }}
                  />
               </Stack>
               {/* Product Table */}

               {!products.length ? (
                  <Stack
                     alignItems="center"
                     justifyContent="center"
                     p={3}
                     sx={{ color: theme.palette.text.secondary }}
                  >
                     <Typography>No item added</Typography>
                  </Stack>
               ) : (
                  <TableContainer
                     component={Paper}
                     sx={{
                        maxHeight: 300, // set the height you want
                        overflowY: "auto",
                        scrollbarWidth: "none!important", // Firefox
                        "&::-webkit-scrollbar": {
                           display: "none!important", // Chrome, Safari, Edge
                        },
                     }}
                  >
                     <Table stickyHeader sx={{ minWidth: 650 }}>
                        <TableHead
                           sx={{
                              "& th": {
                                 backgroundColor:
                                    alpha(theme.palette.grey[700], 0.1) +
                                    "!important",
                                 ...theme.applyStyles("dark", {
                                    backgroundColor: theme.palette.grey[700],
                                 }),
                              },
                           }}
                        >
                           <TableRow>
                              <TableCell>Name</TableCell>
                              <TableCell align="left">Quantity</TableCell>
                              <TableCell align="left">Price</TableCell>
                              <TableCell align="left">Subtotal</TableCell>
                              <TableCell align="left"></TableCell>
                           </TableRow>
                        </TableHead>
                        <TableBody
                           sx={{
                              "& tr": {
                                 backgroundColor:
                                    alpha(theme.palette.grey[400], 0.1) +
                                    "!important",
                                 ...theme.applyStyles("dark", {
                                    backgroundColor: theme.palette.grey[800],
                                 }),
                              },
                           }}
                        >
                           {products.map((row, idx) => (
                              <TableRow
                                 key={idx}
                                 sx={{
                                    "&:last-child td, &:last-child th": {
                                       border: 0,
                                    },
                                 }}
                              >
                                 <TableCell component="th" scope="row">
                                    {row.name}
                                 </TableCell>
                                 <TableCell align="left">
                                    <TextField
                                       variant="outlined"
                                       type="number"
                                       value={row.quantity}
                                       size="small"
                                       onChange={(e) =>
                                          handleProductChange(
                                             idx,
                                             "quantity",
                                             parseInt(e.target.value, 10) || 0
                                          )
                                       }
                                       sx={{
                                          width: 50,
                                          "& .MuiOutlinedInput-root": {
                                             padding: "2px 8px",
                                             borderRadius: 0.5,
                                             fontSize: 14,
                                          },
                                          "& .MuiOutlinedInput-input": {
                                             padding: "4px 0",
                                          },
                                       }}
                                       InputProps={{
                                          sx: { fontSize: 14, padding: 0 },
                                       }}
                                    />
                                 </TableCell>
                                 <TableCell align="left">
                                    <TextField
                                       variant="outlined"
                                       type="number"
                                       value={row.price}
                                       size="small"
                                       onChange={(e) =>
                                          handleProductChange(
                                             idx,
                                             "price",
                                             parseFloat(e.target.value) || 0
                                          )
                                       }
                                       sx={{
                                          width: 80,
                                          "& .MuiOutlinedInput-root": {
                                             padding: "2px 8px",
                                             borderRadius: 0.5,
                                             fontSize: 14,
                                          },
                                          "& .MuiOutlinedInput-input": {
                                             padding: "4px 0",
                                          },
                                       }}
                                       InputProps={{
                                          sx: { fontSize: 14, padding: 0 },
                                       }}
                                    />
                                 </TableCell>
                                 <TableCell align="left">
                                    {(row.price * row.quantity).toFixed(2)}
                                 </TableCell>
                                 <TableCell align="left">
                                    <IconButton
                                       onClick={() => handleRemoveProduct(idx)}
                                    >
                                       <Icon icon="carbon:close" />
                                    </IconButton>
                                 </TableCell>
                              </TableRow>
                           ))}
                        </TableBody>
                     </Table>
                  </TableContainer>
               )}
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default ProductDetails;
