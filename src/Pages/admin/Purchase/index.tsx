"use client";

import {
   Button,
   Stack,
   useTheme,
   IconButton,
   Tooltip,
   Typography,
   TextField,
} from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomModal from "@src/components/Modal";
import CustomTable, { ColumnConfig, MenuItem } from "@src/components/Table";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export type PurchaseTypes = {
   id: number;
   date: string; // YYYY-MM-DD
   invoice: string;
   supplier: string;
   product: {
      id?: string;
      name: string;
      code: string;
      quantity: number;
      price: number;
      sub_total: number;
      images: string;
   };
   product_amount: number;
   others_cost?: number;
   discount?: number;
   total: number;
   pay: number;
   advance: number;
   due: number;
   note?: string;
   attachments?: {
      name: string;
      url: string;
      type?: string;
      size?: number;
   }[];
};
const purchaseData: PurchaseTypes[] = [
   {
      id: 1,
      date: "2025-10-01",
      invoice: "INV-1001",
      supplier: "Md. Rahim",
      product: {
         name: "Rice",
         code: "RICE-001",
         quantity: 1,
         price: 50,
         sub_total: 1 * 50,
         images: "",
      },
      product_amount: 5000,
      others_cost: 100,
      discount: 200,
      total: 4900,
      pay: 3000,
      advance: 1000,
      due: 900,
      note: "Urgent order",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice1.pdf",
            type: "pdf",
            size: 102400,
         },
         {
            name: "Product Image",
            url: "https://example.com/rice.jpg",
            type: "image",
            size: 204800,
         },
      ],
   },
   {
      id: 2,
      date: "2025-10-02",
      invoice: "INV-1002",
      supplier: "Abdul Karim",
      product: {
         name: "Sugar",
         code: "SUGAR-001",
         quantity: 1,
         price: 16,
         sub_total: 1 * 16,
         images: "",
      },
      product_amount: 3200,
      others_cost: 50,
      discount: 0,
      total: 3250,
      pay: 2000,
      advance: 1000,
      due: 250,
      note: "Regular supplier",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice2.pdf",
            type: "pdf",
            size: 95000,
         },
      ],
   },
   {
      id: 3,
      date: "2025-10-03",
      invoice: "INV-1003",
      supplier: "Jubayer Hosen",
      product: {
         name: "Flour",
         code: "FLOUR-001",
         quantity: 1,
         price: 50,
         sub_total: 1 * 50,
         images: "",
      },
      product_amount: 2500,
      others_cost: 0,
      discount: 100,
      total: 2400,
      pay: 1500,
      advance: 500,
      due: 400,
      note: "Check quality",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice3.pdf",
            type: "pdf",
            size: 80000,
         },
         {
            name: "Product Image",
            url: "https://example.com/flour.jpg",
            type: "image",
            size: 150000,
         },
      ],
   },
   {
      id: 4,
      date: "2025-10-04",
      invoice: "INV-1004",
      supplier: "Sakib Hasan",
      product: {
         name: "Oil",
         code: "OIL-001",
         quantity: 1,
         price: 50,
         sub_total: 1 * 50,
         images: "",
      },
      product_amount: 1500,
      others_cost: 50,
      discount: 50,
      total: 1500,
      pay: 1000,
      advance: 300,
      due: 200,
      note: "Priority shipment",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice4.pdf",
            type: "pdf",
            size: 90000,
         },
      ],
   },
   {
      id: 5,
      date: "2025-10-05",
      invoice: "INV-1005",
      supplier: "Hasan Ali",
      product: {
         name: "Salt",
         code: "SALT-001",
         quantity: 1,
         price: 10,
         sub_total: 1 * 10,
         images: "",
      },
      product_amount: 800,
      others_cost: 20,
      discount: 0,
      total: 820,
      pay: 500,
      advance: 200,
      due: 120,
      note: "Bulk purchase",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice5.pdf",
            type: "pdf",
            size: 75000,
         },
      ],
   },
   {
      id: 6,
      date: "2025-10-06",
      invoice: "INV-1006",
      supplier: "Iqbal Ahmed",
      product: {
         name: "Tea",
         code: "TEA-001",
         quantity: 1,
         price: 10,
         sub_total: 1 * 10,
         images: "",
      },
      product_amount: 4000,
      others_cost: 100,
      discount: 200,
      total: 3900,
      pay: 2000,
      advance: 1500,
      due: 400,
      note: "Priority shipment",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice6.pdf",
            type: "pdf",
            size: 102000,
         },
      ],
   },
   {
      id: 7,
      date: "2025-10-07",
      invoice: "INV-1007",
      supplier: "Nazmul Islam",
      product: {
         name: "Coffee",
         code: "COFFEE-001",
         quantity: 1,
         price: 10,
         sub_total: 1 * 10,
         images: "",
      },
      product_amount: 500,
      others_cost: 990,
      discount: 100,
      total: 1390,
      pay: 1000,
      advance: 300,
      due: 90,
      note: "Priority shipment",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice7.pdf",
            type: "pdf",
            size: 87000,
         },
         {
            name: "Product Image",
            url: "https://example.com/coffee.jpg",
            type: "image",
            size: 120000,
         },
      ],
   },
   {
      id: 8,
      date: "2025-10-08",
      invoice: "INV-1008",
      supplier: "Rafiq",
      product: {
         name: "Milk",
         code: "MILK-001",
         quantity: 1,
         price: 20,
         sub_total: 1 * 20,
         images: "",
      },
      product_amount: 1200,
      others_cost: 50,
      discount: 100,
      total: 1150,
      pay: 800,
      advance: 200,
      due: 150,
      note: "Check expiration date",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice8.pdf",
            type: "pdf",
            size: 88000,
         },
      ],
   },
   {
      id: 9,
      date: "2025-10-09",
      invoice: "INV-1009",
      supplier: "Imran",
      product: {
         name: "Eggs",
         code: "EGGS-001",
         quantity: 1,
         price: 10,
         sub_total: 1 * 10,
         images: "",
      },
      product_amount: 900,
      others_cost: 30,
      discount: 50,
      total: 880,
      pay: 600,
      advance: 200,
      due: 80,
      note: "Priority shipment",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice9.pdf",
            type: "pdf",
            size: 92000,
         },
      ],
   },
   {
      id: 10,
      date: "2025-10-10",
      invoice: "INV-1010",
      supplier: "Shakil",
      product: {
         name: "Butter",
         code: "BUTTER-001",
         quantity: 1,
         price: 20,
         sub_total: 1 * 20,
         images: "",
      },
      product_amount: 1400,
      others_cost: 30,
      discount: 50,
      total: 1380,
      pay: 1000,
      advance: 200,
      due: 180,
      note: "Store in cold room",
      attachments: [
         {
            name: "Invoice PDF",
            url: "https://example.com/invoice10.pdf",
            type: "pdf",
            size: 95000,
         },
         {
            name: "Product Image",
            url: "https://example.com/butter.jpg",
            type: "image",
            size: 130000,
         },
      ],
   },
];

const Purchase = () => {
   const theme = useTheme();
   const router = useRouter();
   const [purchases, setPurchases] = useState<PurchaseTypes[]>(purchaseData);

   // note
   const [note, setNote] = useState<string>("");
   const [updateNote, setUpdateNote] = useState<PurchaseTypes | null>(null);

   // delete
   const [deleteItem, setDeleteItem] = useState<PurchaseTypes | null>(null);

   const columns: ColumnConfig[] = [
      {
         field: "id",
         headerName: "Id",
         width: 70,
      },
      {
         field: "date",
         headerName: "Date",
      },
      {
         field: "invoice",
         headerName: "Invoice",
      },
      {
         field: "supplier",
         headerName: "Supplier",
      },
      {
         field: "product",
         headerName: "Product",
         valueFormatter: (value: any) => value.name,
      },
      {
         field: "product_amount",
         headerName: "Product Amount",
      },
      {
         field: "others_cost",
         headerName: "Others Cost",
      },
      {
         field: "discount",
         headerName: "Discount",
      },
      {
         field: "total",
         headerName: "Total",
      },
      {
         field: "note",
         headerName: "Note",
         renderCell: (params) => (
            <Tooltip
               title={
                  params.row.note?.length === 20
                     ? params.row.note.slice(0, 20) + "..."
                     : params.row.note
               }
               disableInteractive
            >
               <IconButton
                  size="small"
                  onClick={() => {
                     setUpdateNote(params.row);
                     setNote(params.row.note || "");
                  }}
               >
                  <Icon icon="solar:notes-bold-duotone" size="small" />
               </IconButton>
            </Tooltip>
         ),
      },
      {
         field: "@actions",
         headerName: "",
      },
   ];

   // Action menu for each row
   const actionMenu: MenuItem[] = [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: (params: GridRenderCellParams) => {
            router.push("/admin/purchase/publish?id=" + params.row.id);
         },
      },
      {
         label: "print",
         icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
         color: undefined,
         onClick: (params: GridRenderCellParams) => {},
      },
      {
         label: "delete",
         color: "error",
         onClick: (params: GridRenderCellParams) => {
            setDeleteItem(params.row);
         },
         icon: (
            <Icon
               icon="solar:trash-bin-trash-bold"
               size="small"
               color="error"
            />
         ),
      },
   ];

   return (
      <Stack spacing={2} py={2}>
         {/* Header */}
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
               onClick={() => router.push("/admin/purchase/publish")}
            >
               Add purchase
            </Button>
         </Stack>
         <CustomTable
            rows={purchases}
            columns={columns}
            checkBox
            menuItems={actionMenu}
         />

         <CustomModal
            open={Boolean(updateNote)}
            onClose={() => {
               setUpdateNote(null);
            }}
            title="Note"
            sx={{
               width: 300,
            }}
         >
            <TextField
               label="Note"
               fullWidth
               multiline
               minRows={2}
               maxRows={3}
               value={note || ""}
               onChange={(e) => setNote(e.target.value || "")}
               onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                     if (updateNote) {
                        setPurchases((prev) =>
                           prev.map((item) =>
                              item.id === updateNote.id
                                 ? { ...item, note: note }
                                 : item,
                           ),
                        );
                     }
                     setUpdateNote(null);
                  }
               }}
            />
            <Stack
               spacing={2}
               direction="row"
               justifyContent="flex-end"
               width="100%"
               mt={2}
            >
               <Button
                  variant="text"
                  color="inherit"
                  onClick={() => setUpdateNote(null)}
               >
                  Cancel
               </Button>

               <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                     if (updateNote) {
                        setPurchases((prev) =>
                           prev.map((item) =>
                              item.id === updateNote.id
                                 ? { ...item, note: note }
                                 : item,
                           ),
                        );
                        setUpdateNote(null);
                     }
                  }}
                  sx={
                     {
                        // position: "relative",
                        // overflow: "hidden",
                     }
                  }
               >
                  Submit
               </Button>
            </Stack>
         </CustomModal>

         <AlertDialog
            open={Boolean(deleteItem)}
            onClose={function (): void {
               setDeleteItem(null);
            }}
            onConfirm={() => {
               if (deleteItem) {
                  setPurchases((prev) =>
                     prev.filter((item) => item.id !== deleteItem.id),
                  );
                  setDeleteItem(null);
               }
            }}
            type={"error"}
            title={`Are you sure want to delete "${deleteItem?.invoice}"?`}
         />
      </Stack>
   );
};

export default Purchase;
