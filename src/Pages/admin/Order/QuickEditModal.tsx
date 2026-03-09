import React, { useState } from "react";
import {
   Avatar,
   Box,
   Button,
   Stack,
   TextField,
   Tooltip,
   Typography,
   useMediaQuery,
   useTheme,
   IconButton,
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { ProductType } from "./type";
import Icon from "@src/components/Icon";

interface QuickEditModalProps {
   products: ProductType[];
   onClose?: () => void;
   onUpdate?: (p: ProductType[]) => void;
}

const QuickEditModal = ({
   products,
   onClose,
   onUpdate,
}: QuickEditModalProps) => {
   const theme = useTheme();
   const isSmDown = useMediaQuery(theme.breakpoints.down("sm"));
   const isSmUp = useMediaQuery(theme.breakpoints.up("sm"));

   const [editableProducts, setEditableProducts] =
      useState<ProductType[]>(products);

   return (
      <Stack spacing={2}>
         <Stack width={"100%"} overflow={"scroll"}>
            <Table
               sx={{
                  bgcolor: "background.default",
                  borderRadius: 1,
               }}
            >
               <TableHead>
                  <TableRow>
                     <TableCell>Product</TableCell>
                     <TableCell>Quantity</TableCell>
                     <TableCell>Product Price</TableCell>
                     <TableCell>Subtotal</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {editableProducts.map((product, i) => {
                     product.subtotal = product.price * product.quantity;
                     return (
                        <TableRow
                           key={product.name}
                           sx={{
                              "&:last-child td, &:last-child th": { border: 0 },
                           }}
                        >
                           {/* Name */}
                           <TableCell component="th" scope="row">
                              <Stack
                                 spacing={1}
                                 direction="row"
                                 alignItems="center"
                                 height={"100%"}
                              >
                                 {!isSmDown && (
                                    <Avatar
                                       variant="rounded"
                                       src={product.images[0]}
                                       sx={{
                                          width: 50,
                                          height: 50,
                                       }}
                                    />
                                 )}
                                 <Stack>
                                    <Tooltip
                                       title={product.name}
                                       disableInteractive
                                    >
                                       <Typography
                                          variant="body1"
                                          fontSize={{
                                             xs: 14,
                                             sm: 15,
                                          }}
                                          color="textPrimary"
                                          sx={{
                                             "&:hover": {
                                                cursor: "pointer",
                                                textDecoration: "underline",
                                             },
                                          }}
                                       >
                                          {product.name.length >= 10 && isSmDown
                                             ? product.name.slice(0, 8) + "..."
                                             : isSmUp
                                               ? product.name.slice(0, 12)
                                               : product.name}
                                       </Typography>
                                    </Tooltip>
                                 </Stack>
                              </Stack>
                           </TableCell>

                           {/* Quantity */}
                           <TableCell>
                              <Stack
                                 direction={"row"}
                                 alignItems={"center"}
                                 spacing={0.5}
                              >
                                 {!isSmDown && (
                                    <IconButton
                                       size="small"
                                       disabled={product.quantity <= 1}
                                       onClick={() => {
                                          setEditableProducts((prev) =>
                                             prev.map((item, index) =>
                                                index === i
                                                   ? {
                                                        ...item,
                                                        quantity: Math.max(
                                                           1,
                                                           item.quantity - 1,
                                                        ),

                                                        //   price:
                                                        //      item.price *
                                                        //      (item.quantity - 1),
                                                     }
                                                   : item,
                                             ),
                                          );
                                       }}
                                    >
                                       <Icon
                                          icon="lets-icons:remove-fill"
                                          size="small"
                                       />
                                    </IconButton>
                                 )}
                                 <TextField
                                    size="small"
                                    value={product.quantity}
                                    type="text"
                                    inputProps={{
                                       inputMode: "numeric",
                                       pattern: "[0-9]*",
                                    }}
                                    sx={{
                                       "& .MuiInputBase-root": {
                                          p: "8px 4px !important",
                                       },
                                       "& .MuiInputBase-input": {
                                          p: "8px 4px !important",
                                          width: {
                                             xs: "30px !important",
                                             sm: "40px !important",
                                          },
                                          fontSize: "15px !important",
                                       },
                                    }}
                                    onChange={(e) => {
                                       const value = e.target.value;
                                       setEditableProducts((prev) =>
                                          prev.map((item, index) =>
                                             index === i
                                                ? {
                                                     ...item,
                                                     quantity:
                                                        Number(value || 1) || 1,

                                                     //   price:
                                                     //      item.price *
                                                     //      item.quantity,
                                                  }
                                                : item,
                                          ),
                                       );
                                    }}
                                 />
                                 {!isSmDown && (
                                    <IconButton
                                       size="small"
                                       onClick={() => {
                                          setEditableProducts((prev) =>
                                             prev.map((item, index) =>
                                                index === i
                                                   ? {
                                                        ...item,
                                                        quantity:
                                                           item.quantity + 1,
                                                        //   price:
                                                        //      item.price *
                                                        //      (item.quantity + 1),
                                                     }
                                                   : item,
                                             ),
                                          );
                                       }}
                                    >
                                       <Icon
                                          icon="solar:add-circle-bold"
                                          size="small"
                                       />
                                    </IconButton>
                                 )}
                              </Stack>
                           </TableCell>

                           {/* Price */}
                           <TableCell>
                              <TextField
                                 size="small"
                                 value={product.price}
                                 onChange={(e) => {
                                    const value = e.target.value;

                                    setEditableProducts((prev) =>
                                       prev.map((item, index) =>
                                          index === i
                                             ? {
                                                  ...item,
                                                  price:
                                                     Number(value || 0) || 0,
                                               }
                                             : item,
                                       ),
                                    );
                                 }}
                                 sx={{
                                    "& .MuiInputBase-root": {
                                       p: "8px 4px !important",
                                    },
                                    "& .MuiInputBase-input": {
                                       p: "8px 4px !important",
                                       width: {
                                          xs: "40px !important",
                                          sm: "80px !important",
                                       },
                                       fontSize: "15px !important",
                                    },
                                 }}
                              />
                           </TableCell>
                           <TableCell>
                              <TextField
                                 size="small"
                                 value={product.subtotal}
                                 onChange={(e) => {
                                    const value = e.target.value;

                                    setEditableProducts((prev) =>
                                       prev.map((item, index) =>
                                          index === i
                                             ? {
                                                  ...item,
                                                  subtotal:
                                                     Number(value || 0) || 0,
                                               }
                                             : item,
                                       ),
                                    );
                                 }}
                                 sx={{
                                    "& .MuiInputBase-root": {
                                       p: "8px 4px !important",
                                    },
                                    "& .MuiInputBase-input": {
                                       p: "8px 4px !important",
                                       width: {
                                          xs: "40px !important",
                                          sm: "80px !important",
                                       },
                                       fontSize: "15px !important",
                                    },
                                 }}
                              />
                           </TableCell>
                        </TableRow>
                     );
                  })}
               </TableBody>
            </Table>
         </Stack>
         <Stack
            spacing={2}
            direction={"row"}
            alignItems={"center"}
            justifyContent={"flex-end"}
         >
            <Button
               variant="text"
               color="inherit"
               onClick={() => {
                  onClose?.();
               }}
            >
               Cancel
            </Button>
            <Button
               variant="contained"
               color="primary"
               type="submit"
               // disabled={note.length === 0}
               onClick={() => {
                  onUpdate?.(editableProducts);
                  onClose?.();
               }}
            >
               Update
               {/* {noteModal?.orderNote.length ? "Update note" : "Add note"} */}
            </Button>
         </Stack>
      </Stack>
   );
};

export default QuickEditModal;
