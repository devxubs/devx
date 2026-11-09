"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Stack, Button, Typography, useTheme } from "@mui/material";
import Scrollbar from "react-browser-scrollbar";
import Icon from "@src/components/Icon";
import CustomTable, { ColumnConfig } from "@src/components/Table";
import { TableSkeleton } from "@src/components/SkeletonLoader";
import { useFilterQuery } from "@src/handler/useFilterQuery";
import { UnitType } from "./types";
import { UnitFormModal, UnitDeleteDialog } from "./components";

// Preserved for backward compatibility
export const productUnits = [
   { id: "1", customId: "UNIT_1", name: "Piece", short: "pc" },
   { id: "2", customId: "UNIT_2", name: "Kilogram", short: "kg" },
   { id: "3", customId: "UNIT_3", name: "Gram", short: "g" },
   { id: "4", customId: "UNIT_4", name: "Liter", short: "l" },
   { id: "5", customId: "UNIT_5", name: "Milliliter", short: "ml" },
   { id: "6", customId: "UNIT_6", name: "Meter", short: "m" },
   { id: "7", customId: "UNIT_7", name: "Centimeter", short: "cm" },
   { id: "8", customId: "UNIT_8", name: "Inch", short: "in" },
   { id: "9", customId: "UNIT_9", name: "Foot", short: "ft" },
   { id: "10", customId: "UNIT_10", name: "Dozen", short: "dz" },
   { id: "11", customId: "UNIT_11", name: "Pack", short: "pk" },
   { id: "12", customId: "UNIT_12", name: "Box", short: "box" },
   { id: "13", customId: "UNIT_13", name: "Carton", short: "ctn" },
   { id: "14", customId: "UNIT_14", name: "Bottle", short: "btl" },
   { id: "15", customId: "UNIT_15", name: "Bag", short: "bag" },
   { id: "16", customId: "UNIT_16", name: "Roll", short: "roll" },
   { id: "17", customId: "UNIT_17", name: "Sheet", short: "sht" },
   { id: "18", customId: "UNIT_18", name: "Pair", short: "pr" },
   { id: "19", customId: "UNIT_19", name: "Set", short: "set" },
   { id: "20", customId: "UNIT_20", name: "Bundle", short: "bndl" },
];

const Unit = () => {
   const theme = useTheme();
   const { filterQueryData } = useFilterQuery();
   const [units, setUnits] = useState<UnitType[]>([]);
   const [loading, setLoading] = useState(false);

   // Modal & Dialog state
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
   const [isDeleting, setIsDeleting] = useState(false);

   const loadUnits = useCallback(async () => {
      setLoading(true);
      try {
         const res = await fetch("/api/units");
         if (res.ok) {
            const data = await res.json();
            const mapped: UnitType[] = data.map((u: any) => ({
               id: u.id,
               customId: u.customId,
               name: u.name,
               short: u.short || (u.name ? u.name.slice(0, 3).toLowerCase() : ""),
               productCount: u.productCount ?? 0,
               createdAt: u.createdAt,
               updatedAt: u.updatedAt,
            }));
            setUnits(mapped);
         }
      } catch (err) {
         console.error("Failed to load units:", err);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      loadUnits();
   }, [loadUnits]);

   // Filter units based on global filter / search query
   const filteredUnits = useMemo(() => {
      if (!filterQueryData.searchText) return units;
      const search = filterQueryData.searchText.toLowerCase().trim();
      return units.filter(
         (u) =>
            u.name?.toLowerCase().includes(search) ||
            u.short?.toLowerCase().includes(search) ||
            u.customId?.toLowerCase().includes(search) ||
            u.id?.toLowerCase().includes(search),
      );
   }, [units, filterQueryData.searchText]);

   // Open modal for Add or Edit
   const openModal = (unitToEdit?: UnitType) => {
      if (unitToEdit) {
         setSelectedUnit(unitToEdit);
      } else {
         setSelectedUnit(null);
      }
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setSelectedUnit(null);
   };

   // Delete handler
   const handleDelete = async () => {
      if (!selectedUnit) return;
      setIsDeleting(true);
      try {
         const res = await fetch(`/api/units/${selectedUnit.id}`, {
            method: "DELETE",
         });
         if (res.ok) {
            await loadUnits();
         }
      } catch (err) {
         console.error("Failed to delete unit:", err);
      } finally {
         setIsDeleting(false);
         setIsDeleteDialogOpen(false);
         setSelectedUnit(null);
      }
   };

   const columns: ColumnConfig[] = [
      {
         field: "customId",
         headerName: "ID",
         flex: 0.3,
         renderCell: (params: any) => (
            <Typography variant="body2" fontWeight={600} color="primary.main">
               {params.row.customId || params.row.id}
            </Typography>
         ),
      },
      { field: "name", headerName: "Name", flex: 1 },
      { field: "short", headerName: "Short", flex: 1 },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   return (
      <Scrollbar
         autoHide
         thumbSize={6}
         darkMode
         style={{
            maxHeight: "calc(100vh - 100px)",
            ...({ scrollbarWidth: "none !important" } as unknown as React.CSSProperties),
         }}
      >
         <Stack spacing={2} py={2}>
            {/* Header with Add Unit action */}
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
               <Button
                  variant="contained"
                  color="primary"
                  startIcon={
                     <Icon
                        icon="mingcute:add-line"
                        style={{
                           color: theme.palette.text.primary,
                        }}
                     />
                  }
                  onClick={() => openModal()}
                  data-testid="add-unit-button"
               >
                  Add Unit
               </Button>
            </Stack>

            {/* Units Data Table */}
            {loading ? (
               <TableSkeleton rows={5} cols={4} />
            ) : (
               <CustomTable
                  rows={filteredUnits}
                  columns={columns}
                  checkBox
                  canPrint={false}
                  canExport={false}
                  hideSelectionToolbar={true}
                  showSelectionIndicators={false}
                  hideSelectionActions={true}
                  menuItems={[
                     {
                        label: "edit",
                        icon: <Icon icon="solar:pen-bold" size="small" />,
                        onClick: (p: any) => openModal(p.row as UnitType),
                     },
                     {
                        label: "delete",
                        color: "error",
                        icon: (
                           <Icon
                              icon="solar:trash-bin-trash-bold"
                              size="small"
                              color="error"
                           />
                        ),
                        onClick: (p: any) => {
                           setSelectedUnit(p.row as UnitType);
                           setIsDeleteDialogOpen(true);
                        },
                     },
                  ]}
               />
            )}

            {/* Add / Edit Unit Modal */}
            <UnitFormModal
               open={isModalOpen}
               onClose={closeModal}
               selectedUnit={selectedUnit}
               onSuccess={loadUnits}
            />

            {/* Delete Confirmation Dialog */}
            <UnitDeleteDialog
               open={isDeleteDialogOpen}
               onClose={() => {
                  if (!isDeleting) {
                     setIsDeleteDialogOpen(false);
                     setSelectedUnit(null);
                  }
               }}
               unit={selectedUnit}
               onConfirm={handleDelete}
               isDeleting={isDeleting}
            />
         </Stack>
      </Scrollbar>
   );
};

export default Unit;
