"use client";

import {
   TableRow,
   TableCell,
   IconButton,
   Chip,
   useTheme,
   alpha,
   Checkbox,
   Palette,
   Collapse,
   Stack,
   Typography,
   Avatar,
} from "@mui/material";
import React from "react";
import CustomPopover from "../CustomPopover";
import { ActionItem, TableRow as TableRowProps, Type } from ".";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import Menu from "../Menu";
import Icon from "../Icon";

interface RowProps {
   head: string[];
   row: TableRowProps;
   type: Type;
   checked?: boolean; // ✅ comes from parent
   onCheck?: (checked: boolean) => void;
   actionMenu: ActionItem[];
   isOpen: boolean; // controlled open state
   onToggle: () => void;
}

const Row = ({
   row,
   head,
   onCheck,
   checked = false,
   type,
   actionMenu,
   isOpen,
   onToggle,
}: RowProps) => {
   const theme = useTheme();
   const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

   const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
      setAnchorEl(event.currentTarget);
   };

   const products = Array.isArray(row.products) ? row.products : [];

   return (
      <>
         <TableRow
            component="tr"
            sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
         >
            {head.map((column, colIndex) => {
               const chip: any = row.chip;
               const colorKey =
                  row.color === "default"
                     ? "primary"
                     : (row.color as keyof Palette);
               const paletteColor: any = theme.palette[colorKey] ?? {
                  main: row.color || theme.palette.primary.main,
               };

               if (column === "@check") {
                  return (
                     <TableCell
                        key={colIndex}
                        align="left"
                        sx={{
                           p: 1,
                           whiteSpace: "nowrap",
                           textOverflow: "ellipsis",
                        }}
                     >
                        <Checkbox
                           checked={checked} // ✅ controlled
                           onChange={(e) => onCheck?.(e.target.checked)}
                        />
                     </TableCell>
                  );
               }

               if (column === "@action") {
                  return (
                     <TableCell
                        key={colIndex}
                        align="right"
                        sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                     >
                        {type === "order" && (
                           <IconButton onClick={onToggle}>
                              <Icon icon="solar:alt-arrow-down-broken" />
                           </IconButton>
                        )}
                        <IconButton onClick={handleMenuOpen}>
                           <Icon icon="eva:more-vertical-fill" size="small" />
                        </IconButton>
                        <CustomPopover
                           anchorEl={anchorEl}
                           onClose={() => setAnchorEl(null)}
                           anchorOrigin={{
                              vertical: "bottom",
                              horizontal: "right",
                           }}
                           transformOrigin={{
                              vertical: "top",
                              horizontal: "right",
                           }}
                        >
                           <Menu
                              item={actionMenu}
                              onClose={() => setAnchorEl(null)}
                           />
                        </CustomPopover>
                     </TableCell>
                  );
               }

               if (column.toLocaleLowerCase() === chip) {
                  return (
                     <TableCell
                        key={colIndex}
                        align="left"
                        sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                     >
                        <Chip
                           label={row[chip]}
                           size="small"
                           color={(row.color as any) || "primary"}
                           sx={{
                              borderRadius: 0.5,
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              bgcolor: paletteColor?.main
                                 ? alpha(paletteColor.main, 0.1)
                                 : alpha(theme.palette.primary.main, 0.1),
                              color:
                                 paletteColor?.main ||
                                 theme.palette.primary.main,
                           }}
                        />
                     </TableCell>
                  );
               }

               return (
                  <TableCell
                     key={colIndex}
                     align="left"
                     sx={{ whiteSpace: "nowrap", textOverflow: "ellipsis" }}
                  >
                     {row[
                        column.includes(" ")
                           ? column.replaceAll(" ", "_").toLowerCase()
                           : column.toLowerCase()
                     ] ?? "-"}
                  </TableCell>
               );
            })}
         </TableRow>
         {type === "order" && (
            <TableRow>
               <TableCell
                  colSpan={10}
                  sx={{
                     p: "0px",
                     borderBottom: isOpen ? 1 : 0,
                     borderColor: "divider",
                  }}
               >
                  <Collapse in={isOpen} timeout="auto" unmountOnExit>
                     <Stack m={2} bgcolor={"background.paper"} borderRadius={1}>
                        {products.map((product, idx) => (
                           <Stack
                              key={idx}
                              direction={"row"}
                              justifyContent={"space-between"}
                              borderBottom={products.length === 1 ? 0 : 1}
                              borderColor={"divider"}
                              p={1.5}
                              sx={{
                                 "&:last-child": {
                                    border: 0,
                                 },
                              }}
                           >
                              <Stack
                                 spacing={1}
                                 direction="row"
                                 alignItems="center"
                                 m={0}
                              >
                                 <Avatar
                                    variant="rounded"
                                    src={product.images[0]}
                                    sx={{ width: 50, height: 50 }}
                                 />
                                 <Stack>
                                    <Typography
                                       variant="body2"
                                       color="textPrimary"
                                    >
                                       {product.name}
                                    </Typography>
                                    <Typography
                                       variant="body2"
                                       fontSize={14}
                                       color="textSecondary"
                                    >
                                       {product.code}
                                    </Typography>
                                 </Stack>
                              </Stack>
                              <Stack
                                 direction={"row"}
                                 alignItems={"center"}
                                 spacing={2}
                              >
                                 <Typography variant="body2">
                                    x{product.quantity}
                                 </Typography>
                                 <Typography variant="body2">
                                    ৳{product.price}
                                 </Typography>
                                 <IconButton>
                                    <Icon icon="carbon:close" />
                                 </IconButton>
                              </Stack>
                           </Stack>
                        ))}
                     </Stack>
                  </Collapse>
               </TableCell>
            </TableRow>
         )}
      </>
   );
};

export default Row;
