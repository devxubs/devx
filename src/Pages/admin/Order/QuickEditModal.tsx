import React from "react";
import { Button, Stack, TextField } from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { ProductType } from "./type";
import { ProductsView } from "../Product";

interface QuickEditModalProps {
   products: ProductType[];
   onClose?: () => void;
}

const QuickEditModal = ({ products, onClose }: QuickEditModalProps) => {
   return (
      <Stack spacing={2}>
         <Table
            sx={{
               bgcolor: "background.default",
               borderRadius: 1,
            }}
         >
            <TableHead>
               <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Price</TableCell>
               </TableRow>
            </TableHead>
            <TableBody>
               {products.map((product, i) => {
                  return (
                     <TableRow
                        key={product.name}
                        sx={{
                           "&:last-child td, &:last-child th": { border: 0 },
                        }}
                     >
                        <TableCell component="th" scope="row">
                           <ProductsView name={product.name} description={""} />
                        </TableCell>
                        <TableCell align="right">{product.price}</TableCell>
                        <TableCell align="right">{product.quantity}</TableCell>
                     </TableRow>
                  );
               })}
            </TableBody>
         </Table>
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
               // onClick={}
            >
               Update
               {/* {noteModal?.orderNote.length ? "Update note" : "Add note"} */}
            </Button>
         </Stack>
      </Stack>
   );
};

export default QuickEditModal;
