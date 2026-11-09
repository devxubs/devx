"use client";

import React, { useState } from "react";
import {
   Box,
   Button,
   Chip,
   Divider,
   IconButton,
   Paper,
   Stack,
   Table,
   TableBody,
   TableCell,
   TableContainer,
   TableHead,
   TableRow,
   TextField,
   Tooltip,
   Typography,
   useTheme,
} from "@mui/material";
import Icon from "@src/components/Icon";
import { ProductVariantItem } from "../types";

interface ProductVariantsSectionProps {
   variants: ProductVariantItem[];
   attributes: { name: string; values: string[] }[];
   onAddAttribute: (name: string) => void;
   onRemoveAttribute: (index: number) => void;
   onAddAttributeValue: (attrIndex: number, value: string) => void;
   onRemoveAttributeValue: (attrIndex: number, valIndex: number) => void;
   onGenerateCombinations: () => void;
   onUpdateVariant: (
      index: number,
      updates: Partial<ProductVariantItem>,
   ) => void;
   onRemoveVariant: (index: number) => void;
   onAddManualVariant: () => void;
}

export const ProductVariantsSection: React.FC<ProductVariantsSectionProps> = ({
   variants,
   attributes,
   onAddAttribute,
   onRemoveAttribute,
   onAddAttributeValue,
   onRemoveAttributeValue,
   onGenerateCombinations,
   onUpdateVariant,
   onRemoveVariant,
   onAddManualVariant,
}) => {
   const theme = useTheme();
   const [newAttrName, setNewAttrName] = useState("");
   const [valInputs, setValInputs] = useState<Record<number, string>>({});

   const handleAddAttr = () => {
      if (!newAttrName.trim()) return;
      onAddAttribute(newAttrName.trim());
      setNewAttrName("");
   };

   const handleAddValue = (idx: number) => {
      const val = valInputs[idx]?.trim();
      if (!val) return;
      onAddAttributeValue(idx, val);
      setValInputs((prev) => ({ ...prev, [idx]: "" }));
   };

   return (
      <Paper
         variant="outlined"
         sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 1.5,
            bgcolor: "background.paper",
            borderColor: "divider",
         }}
      >
         <Stack spacing={2.5}>
            {/* Header */}
            <Stack
               direction="row"
               justifyContent="space-between"
               alignItems="center"
               gap={1}
            >
               <Stack spacing={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center">
                     <Icon
                        icon="solar:widget-2-outline"
                        size="18px"
                        style={{ color: theme.palette.text.secondary }}
                     />
                     <Typography
                        variant="subtitle1"
                        fontWeight={700}
                        sx={{ letterSpacing: "-0.01em" }}
                     >
                        Product Attributes & Dynamic Variants
                     </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                     Define matrix attributes (Size, Color, etc.) and generate
                     SKU combination inventory
                  </Typography>
               </Stack>

               <Button
                  size="small"
                  color="primary"
                  onClick={onGenerateCombinations}
                  startIcon={
                     <Icon
                        icon="solar:refresh-linear"
                        size="16px"
                        color="primary"
                     />
                  }
                  sx={{
                     flexShrink: 0,
                  }}
               >
                  Generate
               </Button>
            </Stack>

            <Divider sx={{ borderColor: "divider" }} />

            {/* Add Attribute Input */}
            <Stack direction="row" spacing={1}>
               <TextField
                  size="small"
                  label="Attribute Name"
                  placeholder="Enter attribute name"
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  onKeyDown={(e) => {
                     if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAttr();
                     }
                  }}
                  sx={{ flex: 1 }}
               />
               <IconButton
                  color="primary"
                  onClick={handleAddAttr}
                  sx={{ flexShrink: 0 }}
               >
                  <Icon icon="solar:add-circle-bold" color="primary" />
               </IconButton>
            </Stack>

            {/* Defined Attributes List */}
            {attributes.map((attr, attrIdx) => (
               <Paper
                  key={attrIdx}
                  variant="outlined"
                  sx={{ p: 1.5, borderRadius: 1, borderColor: "divider" }}
               >
                  <Stack spacing={1}>
                     <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                     >
                        <Typography
                           variant="caption"
                           fontWeight={700}
                           sx={{ textTransform: "uppercase" }}
                        >
                           {attr.name}
                        </Typography>
                        <IconButton
                           size="small"
                           onClick={() => onRemoveAttribute(attrIdx)}
                           color="error"
                        >
                           <Icon
                              icon="solar:trash-bin-trash-bold"
                              size="16px"
                              color="error"
                           />
                        </IconButton>
                     </Stack>

                     {/* Chips for values */}
                     <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {attr.values.map((v, valIdx) => (
                           <Chip
                              key={valIdx}
                              size="small"
                              label={v}
                              onDelete={() =>
                                 onRemoveAttributeValue(attrIdx, valIdx)
                              }
                           />
                        ))}
                     </Box>

                     {/* Add value row */}
                     <Stack direction="row" alignItems="center" spacing={1}>
                        <TextField
                           size="small"
                           placeholder={`Add ${attr.name}`}
                           value={valInputs[attrIdx] || ""}
                           onChange={(e) =>
                              setValInputs((prev) => ({
                                 ...prev,
                                 [attrIdx]: e.target.value,
                              }))
                           }
                           onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                 e.preventDefault();
                                 handleAddValue(attrIdx);
                              }
                           }}
                           sx={{ flex: 1 }}
                        />
                        <IconButton
                           size="small"
                           onClick={() => handleAddValue(attrIdx)}
                        >
                           <Icon
                              icon="solar:add-circle-bold-duotone"
                              size="small"
                           />
                        </IconButton>
                     </Stack>
                  </Stack>
               </Paper>
            ))}

            {/* Generated Variants Table */}
            {variants.length > 0 && (
               <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxHeight: 380, borderColor: "divider" }}
               >
                  <Table size="small" stickyHeader>
                     <TableHead>
                        <TableRow>
                           <TableCell sx={{ fontWeight: 600 }}>
                              Variant Combination
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>
                              Price (৳)
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>
                              Cost (৳)
                           </TableCell>
                           <TableCell sx={{ fontWeight: 600 }}>
                              Stock Qty
                           </TableCell>
                           <TableCell align="center" sx={{ fontWeight: 600 }}>
                              Action
                           </TableCell>
                        </TableRow>
                     </TableHead>
                     <TableBody>
                        {variants.map((v, idx) => (
                           <TableRow key={idx} hover>
                              <TableCell>
                                 <Typography variant="body2" fontWeight={600}>
                                    {Object.entries(v.attributes || {})
                                       .map(([k, val]) => `${k}: ${val}`)
                                       .join(", ") || "Default"}
                                 </Typography>
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    size="small"
                                    placeholder="Enter variant SKU"
                                    value={v.sku || ""}
                                    onChange={(e) =>
                                       onUpdateVariant(idx, {
                                          sku: e.target.value,
                                       })
                                    }
                                    sx={{ width: 130 }}
                                 />
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    size="small"
                                    type="number"
                                    placeholder="Enter selling price"
                                    value={v.regularPrice ?? ""}
                                    onChange={(e) =>
                                       onUpdateVariant(idx, {
                                          regularPrice: Number(e.target.value),
                                       })
                                    }
                                    sx={{
                                       width: 90,
                                       "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                          {
                                             display: "none",
                                          },
                                    }}
                                 />
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    size="small"
                                    type="number"
                                    placeholder="Enter cost price"
                                    value={v.costPrice ?? ""}
                                    onChange={(e) =>
                                       onUpdateVariant(idx, {
                                          costPrice: Number(e.target.value),
                                       })
                                    }
                                    sx={{
                                       width: 90,
                                       "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                          {
                                             display: "none",
                                          },
                                    }}
                                 />
                              </TableCell>
                              <TableCell>
                                 <TextField
                                    size="small"
                                    type="number"
                                    placeholder="Enter stock quantity"
                                    value={v.quantity ?? 0}
                                    onChange={(e) =>
                                       onUpdateVariant(idx, {
                                          quantity: Number(e.target.value),
                                       })
                                    }
                                    sx={{
                                       width: 80,
                                       "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                                          {
                                             display: "none",
                                          },
                                    }}
                                 />
                              </TableCell>
                              <TableCell align="center">
                                 <Tooltip
                                    title="Remove variant"
                                    disableInteractive
                                 >
                                    <IconButton
                                       size="small"
                                       color="error"
                                       onClick={() => onRemoveVariant(idx)}
                                    >
                                       <Icon
                                          icon="solar:trash-bin-trash-bold"
                                          size="16px"
                                       />
                                    </IconButton>
                                 </Tooltip>
                              </TableCell>
                           </TableRow>
                        ))}
                     </TableBody>
                  </Table>
               </TableContainer>
            )}
         </Stack>
      </Paper>
   );
};
