"use client";
import { Stack, Button, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Details from "./Details";
import Properties from "./Properties";
import Pricing from "./Pricing";
import { useRouter, useSearchParams } from "next/navigation";
import { productsData, ProductType } from "..";

const productSchema = z
   .object({
      productName: z.string().min(1, "Name is required!"),
      subDescription: z.string().optional(),

      content: z
         .string()
         .min(1, "Description is required!")
         .min(100, "Description must be at least 100 chars"),

      images: z.array(z.any()).min(2, "At least 2 images are required!"),

      productCode: z.string().optional(),
      productSku: z.string().optional(),

      lowStockAlert: z.string().optional(),

      quantity: z.coerce.number().min(0, "Quantity must be positive"),

      category: z.string().min(1, "Choose at least one category!"),
      productType: z.string().min(1, "Select at least one type!"),

      unit: z.array(z.string()).optional(),
      color: z.array(z.string()).optional(),

      regularPrice: z.coerce.number().min(1, "Price is required!"),
      salePrice: z.coerce.number().optional(),
   })
   .refine((data) => !data.salePrice || data.salePrice <= data.regularPrice, {
      message: "Sale price must be less than or equal to regular price",
      path: ["salePrice"],
   });

export type ProductSchemaType = z.infer<typeof productSchema>;

const Publish = () => {
   const router = useRouter();
   const params = useSearchParams();
   const id = params?.get("id");

   // 2. Hook form setup
   const {
      control,
      handleSubmit,
      formState: { errors },
      reset,
   } = useForm<z.infer<typeof productSchema>>({
      resolver: zodResolver(productSchema as any),
      defaultValues: {
         productName: "",
         subDescription: "",
         content: "",
         images: [],
         productCode: "",
         productSku: "",
         lowStockAlert: "",
         quantity: 0,

         category: "",
         productType: "",
         color: [],
         unit: [],
         regularPrice: 0,
         salePrice: undefined,
      },
   });

   const [submitting, setSubmitting] = useState(false);
   const [serverError, setServerError] = useState<string | null>(null);

   useEffect(() => {
      if (!id) return;

      const fetchExisting = async () => {
         try {
            const res = await fetch(`/api/products/${id}`);
            if (res.ok) {
               const p = await res.json();
               const imgs = Array.isArray(p.images)
                  ? p.images
                  : typeof p.images === "string"
                  ? JSON.parse(p.images)
                  : [];

               reset({
                  productName: p.productName || "",
                  subDescription: p.subDescription || "",
                  content: p.content || "",
                  images: imgs.length > 0 ? imgs : ["https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp", "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-2.webp"],
                  productCode: p.productCode || "",
                  productSku: p.productSku || "",
                  lowStockAlert: String(p.lowStockAlert || "10"),
                  quantity: p.quantity || 0,
                  category: p.category?.name || p.category || "",
                  productType: p.productType || "",
                  color: Array.isArray(p.colors) ? p.colors : [],
                  unit: Array.isArray(p.sizes) ? p.sizes : [],
                  regularPrice: Number(p.regularPrice) || 0,
                  salePrice: p.salePrice ? Number(p.salePrice) : undefined,
               });
            }
         } catch {
            // fallback
         }
      };

      fetchExisting();
   }, [id, reset]);

   // 3. Submit handler
   const onSubmit: SubmitHandler<ProductSchemaType> = async (data) => {
      setSubmitting(true);
      setServerError(null);

      try {
         // Sanitize images to URLs or fallback URLs
         const imageUrls = Array.isArray(data.images) && data.images.length > 0
            ? data.images.map((img: any) => typeof img === "string" ? img : "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp")
            : ["https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-1.webp", "https://api-prod-minimal-v700.pages.dev/assets/images/m-product/product-2.webp"];

         const payload = {
            productName: data.productName,
            subDescription: data.subDescription || null,
            content: data.content || null,
            images: imageUrls,
            productCode: data.productCode,
            productSku: data.productSku,
            quantity: data.quantity,
            lowStockAlert: data.lowStockAlert ? parseInt(data.lowStockAlert) : 10,
            category: data.category,
            productType: data.productType,
            colors: data.color || [],
            sizes: data.unit || [],
            regularPrice: data.regularPrice,
            salePrice: data.salePrice || null,
         };

         const url = id ? `/api/products/${id}` : "/api/products";
         const method = id ? "PUT" : "POST";

         const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
         });

         if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to save product");
         }

         router.push("/admin/product");
      } catch (err: any) {
         setServerError(err.message || "Something went wrong while saving product");
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
         onSubmit={handleSubmit(onSubmit)}
      >
         <Stack spacing={4}>
            <Stack>
               <Details formControl={control} errors={errors} />
            </Stack>
            <Stack>
               <Properties formControl={control} errors={errors} />
            </Stack>
            <Stack>
               <Pricing formControl={control} errors={errors} />
            </Stack>
         </Stack>

         {serverError && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
               {serverError}
            </Typography>
         )}
         <Stack
            spacing={2}
            direction={"row"}
            justifyContent={"flex-end"}
            width={"100%"}
            mt={2}
         >
            <Button
               variant="text"
               color="inherit"
               disabled={submitting}
               onClick={() => router.push("/admin/product")}
            >
               Cancel
            </Button>

            <Button variant="contained" color="primary" type="submit" disabled={submitting}>
               {submitting ? "Saving..." : id ? "Update product" : "Add product"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default Publish;
