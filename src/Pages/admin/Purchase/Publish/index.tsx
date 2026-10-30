"use client";

import { yupResolver } from "@hookform/resolvers/yup";
import {
   Button,
   Stack,
   Grid,
   TextField,
   Typography,
   IconButton,
} from "@mui/material";
import Icon from "@src/components/Icon";
import React, { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { PurchaseTypes } from "..";
import { useRouter } from "next/navigation";
import Details from "./Details";
import Pricing from "./Pricing";
import Information from "./Information";

export const purchaseSchema = yup.object({
   id: yup
      .number()
      .integer("ID must be a whole number")
      .required("ID is required"),

   date: yup
      .string()
      .matches(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .required("Date is required"),

   invoice: yup
      .string()
      .min(2, "Invoice number is too short")
      .max(20, "Invoice number is too long")
      .optional(),

   supplier: yup
      .string()
      .min(2, "Supplier name is too short")
      .max(50, "Supplier name is too long")
      .required("Supplier is required"),

   product: yup
      .array()
      .of(
         yup.object({
            name: yup.string().required("Product name is required"),
            quantity: yup
               .number()
               .min(1, "Quantity must be at least 1")
               .required("Quantity is required"),
            price: yup
               .number()
               .min(0, "Price must be positive")
               .required("Price is required"),
            images: yup.array().of(yup.string().url("Invalid image URL")),
         }),
      )
      .min(1, "At least one product is required"),

   product_amount: yup
      .number()
      .min(0, "Product amount cannot be negative")
      .required("Product amount is required"),

   others_cost: yup
      .number()
      .min(0, "Other costs cannot be negative")
      .optional(),

   discount: yup.number().min(0, "Discount cannot be negative").optional(),

   total: yup
      .number()
      .min(0, "Total cannot be negative")
      .required("Total is required"),
   due: yup
      .number()
      .min(0, "Total cannot be negative")
      .required("Total is required"),

   note: yup.string().max(200, "Note is too long").optional(),
   attachments: yup
      .array()
      .of(
         yup.object({
            name: yup.string().required("Attachment name is required"),
            url: yup.string().url("Invalid attachment URL").required(),
            type: yup.string().required("Attachment type is required"), // e.g., "pdf", "image"
            size: yup
               .number()
               .min(0, "Attachment size must be positive")
               .optional(),
         }),
      )
      .optional(),
});

export type PurchaseFormValues = yup.InferType<typeof purchaseSchema>;

const Publish = () => {
   const [data, setData] = useState<PurchaseTypes>({} as PurchaseTypes);
   const router = useRouter();

   const {
      control,
      handleSubmit,
      reset,
      setValue,
      watch,
      formState: { errors },
   } = useForm<PurchaseFormValues>({
      resolver: yupResolver<PurchaseFormValues, any, any>(purchaseSchema),
      defaultValues: {
         id: 0,
         date: "", // e.g., "2025-10-25"
         invoice: "",
         supplier: "",
         product: [],
         product_amount: 0,
         others_cost: 0,
         discount: 0,
         total: 0,
         note: "",
      },
   });

   const [submitting, setSubmitting] = useState(false);
   const [errorMsg, setErrorMsg] = useState<string | null>(null);

   const onSubmit: SubmitHandler<PurchaseFormValues> = async (formData) => {
      setSubmitting(true);
      setErrorMsg(null);
      try {
         const payload = {
            supplierId: null,
            invoice: formData.invoice?.trim() || undefined,
            items: (formData.product || []).map((p: any) => ({
               name: p.name,
               quantity: p.quantity,
               price: p.price,
            })),
            productAmount: formData.product_amount,
            othersCost: formData.others_cost,
            discount: formData.discount,
            paid: 0,
            note: formData.note || "",
         };

         const res = await fetch("/api/purchases", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to create purchase");
         }

         router.push("/admin/purchase");
      } catch (err: any) {
         setErrorMsg(err.message || "Failed to save purchase");
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <Stack
         width={"100%"}
         maxWidth={650}
         mx={"auto"}
         height={"100%"}
         component="form"
      >
         <Stack spacing={4}>
            <Stack>
               <Details data={data || {}} control={control} errors={errors} />
            </Stack>
            <Stack>
               <Information
                  data={data || {}}
                  control={control}
                  errors={errors}
               />
            </Stack>
            <Stack>
               <Pricing
                  data={data || {}}
                  control={control}
                  errors={errors}
                  setValue={setValue}
                  watch={watch}
               />
            </Stack>
         </Stack>

         <Stack
            spacing={2}
            direction={"row"}
            justifyContent={"flex-end"}
            width={"100%"}
            mt={2}
         >
            {errorMsg && (
               <Typography color="error" variant="body2" sx={{ mb: 1 }}>
                  {errorMsg}
               </Typography>
            )}
            <Button
               variant="text"
               color="inherit"
               disabled={submitting}
               onClick={() => router.push("/admin/purchase")}
            >
               Cancel
            </Button>

            <Button
               variant="contained"
               color="primary"
               type="submit"
               disabled={submitting}
               onClick={handleSubmit(onSubmit)}
            >
               {submitting ? "Saving..." : "Add Purchase"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default Publish;
