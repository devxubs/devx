"use client";
import { Stack, Button } from "@mui/material";
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

      productCode: z.string().min(1, "Product code is required!"),
      productSku: z.string().min(1, "Product SKU is required!"),

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

   useEffect(() => {
      if (!id) return;

      const findProduct = productsData.find((p) => p.id === id);

      if (findProduct) {
         reset({
            ...findProduct,
         });
      }
   }, [id, reset]);

   // 3. Submit handler
   const onSubmit: SubmitHandler<ProductSchemaType> = (data) => {
      const now = new Date();
      const PDId =
         productsData.length >= 10
            ? "0" + (productsData.length + 1)
            : "00" + (productsData.length + 1);

      // 🔥 auto-calculate stock status
      let stockValue = "In Stock";
      if (data.quantity === 0) {
         stockValue = "Out of Stock";
      } else if (data.quantity <= 10) {
         stockValue = "Low Stock";
      }

      const newProduct: ProductType = {
         id: `PD${PDId}`,

         // form fields
         productName: data.productName,
         subDescription: data.subDescription ?? "",
         content: data.content,
         images: data.images,
         productCode: data.productCode,
         productSku: data.productSku,
         quantity: data.quantity,
         category: data.category,
         productType: data.productType,
         color: data.color ?? [],
         size: data.unit ?? [],

         regularPrice: data.regularPrice,
         salePrice: data.salePrice ?? data.regularPrice,

         // auto-generated fields
         stockValue,
         date: now.toLocaleDateString(),
         time: now.toLocaleTimeString(),
      };

      if (id) {
         // update logic
         const index = productsData.findIndex((p) => p.id === id);

         if (index !== -1) {
            productsData[index] = newProduct;
         }
      } else {
         // add logic
         // productsData.push(newProduct);

         if (confirm("Add logic is working!")) return;
      }

      router.push("/admin/product");
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
               onClick={() => router.push("/admin/product")}
            >
               Cancel
            </Button>

            <Button variant="contained" color="primary" type="submit">
               {id ? "Update product" : "Add product"}
            </Button>
         </Stack>
      </Stack>
   );
};

export default Publish;
