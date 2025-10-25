"use client";

import { Button, Stack, useTheme, IconButton } from "@mui/material";
import AlertDialog from "@src/components/AlertDialog";
import Icon from "@src/components/Icon";
import CustomTable, { TableProps } from "@src/components/Table";
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
      images: string;
   };
   product_amount: number;
   others_cost?: number;
   discount?: number;
   supplier_total: number;
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
         quantity: 100,
         price: 50,
         images: "",
      },
      product_amount: 5000,
      others_cost: 100,
      discount: 200,
      supplier_total: 4900,
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
         quantity: 200,
         price: 16,
         images: "",
      },
      product_amount: 3200,
      others_cost: 50,
      discount: 0,
      supplier_total: 3250,
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
         quantity: 50,
         price: 50,
         images: "",
      },
      product_amount: 2500,
      others_cost: 0,
      discount: 100,
      supplier_total: 2400,
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
         quantity: 30,
         price: 50,
         images: "",
      },
      product_amount: 1500,
      others_cost: 50,
      discount: 50,
      supplier_total: 1500,
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
         quantity: 80,
         price: 10,
         images: "",
      },
      product_amount: 800,
      others_cost: 20,
      discount: 0,
      supplier_total: 820,
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
         quantity: 400,
         price: 10,
         images: "",
      },
      product_amount: 4000,
      others_cost: 100,
      discount: 200,
      supplier_total: 3900,
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
         quantity: 50,
         price: 10,
         images: "",
      },
      product_amount: 500,
      others_cost: 990,
      discount: 100,
      supplier_total: 1390,
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
         quantity: 60,
         price: 20,
         images: "",
      },
      product_amount: 1200,
      others_cost: 50,
      discount: 100,
      supplier_total: 1150,
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
         quantity: 90,
         price: 10,
         images: "",
      },
      product_amount: 900,
      others_cost: 30,
      discount: 50,
      supplier_total: 880,
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
         quantity: 70,
         price: 20,
         images: "",
      },
      product_amount: 1400,
      others_cost: 30,
      discount: 50,
      supplier_total: 1380,
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
   const [purchase, setPurchase] = useState<PurchaseTypes>({} as PurchaseTypes);
   const [openDelete, setOpenDelete] = useState(false);

   const tableData: Omit<TableProps, "type"> = {
      head: [
         "@check",
         "Id",
         "Date",
         "Invoice",
         "Supplier",
         "Product",
         "Product Amount",
         "Others Cost",
         "Discount",
         "Total",
         "Note",
         "@action",
      ],
      body: purchaseData.map((pd) => ({
         ...pd,
         product: pd.product.name,
         note: (
            <IconButton size="small">
               <Icon icon="solar:notes-bold-duotone" size="small" />
            </IconButton>
         ),
         // Convert attachments array into a renderable ReactNode (string)
         attachments: pd.attachments
            ? pd.attachments.map((a) => a.name).join(", ")
            : undefined,
      })),
   };

   // Action menu for each row
   const actionMenu = (row: PurchaseTypes) => [
      {
         label: "edit",
         icon: <Icon icon="solar:pen-bold" size="small" />,
         onClick: () => {
            setPurchase(row);
            router.push("/purchase/publish?id=" + row.id);
         },
      },
      {
         label: "print",
         icon: <Icon icon="solar:printer-minimalistic-bold" size="small" />,
         onClick: () => {
            setPurchase(row);
         },
      },
      {
         label: "delete",
         color: "error",
         onClick: () => {
            setPurchase(row);
            setOpenDelete(true);
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
               onClick={() => router.push("/purchase/publish")}
            >
               Add purchase
            </Button>
         </Stack>
         <CustomTable
            type={"default"}
            head={tableData.head}
            body={tableData.body}
            actionMenu={(row) => actionMenu(row as any)}
         />

         <AlertDialog
            open={openDelete}
            onClose={function (): void {
               setOpenDelete(false);
            }}
            type={"error"}
            title={`Are you sure want to delete "${purchase?.invoice}"?`}
         />
      </Stack>
   );
};

export default Purchase;
