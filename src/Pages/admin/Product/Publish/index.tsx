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
import { productsData } from "..";

const productSchema = z
   .object({
      product_name: z.string().min(1, "Name is required!"),
      sub_description: z.string().optional(),

      content: z
         .string()
         .min(1, "Description is required!")
         .min(100, "Description must be at least 100 chars"),

      images: z.array(z.any()).min(2, "At least 2 images are required!"),

      product_code: z.string().min(1, "Product code is required!"),
      product_sku: z.string().min(1, "Product SKU is required!"),

      low_stock_alert: z.string().optional(),

      quantity: z.coerce.number().min(0, "Quantity must be positive"),

      category: z.string().min(1, "Choose at least one category!"),
      product_type: z.string().min(1, "Select at least one type!"),

      unit: z.array(z.string()).optional(),
      color: z.array(z.string()).optional(),

      regularPrice: z.coerce.number().min(1, "Price is required!"),

      salePrice: z.coerce.number().optional(),
   })
   .refine((data) => !data.salePrice || data.salePrice <= data.regularPrice, {
      message: "Sale price must be less than or equal to regular price",
      path: ["salePrice"],
   });

type PricingValues = z.infer<typeof productSchema>;

const Publish = () => {
   const [data, setData] = useState<PricingValues>({
      product_name: "",
      sub_description: "",
      content: "",
      images: [],
      product_code: "",
      product_sku: "",
      low_stock_alert: "", // Added low_stock_alert
      quantity: 0 as number, // Ensure quantity is a number
      category: "",
      product_type: "",
      color: [],
      unit: [],
      regularPrice: 0 as number, // Ensure regularPrice is a number
      salePrice: undefined,
   });
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
         product_name: "",
         sub_description: "",
         content: "",
         images: [],
         product_code: "",
         product_sku: "",
         low_stock_alert: "",
         quantity: 0,
         category: "",
         product_type: "",
         color: [],
         unit: [],
         regularPrice: 0,
         salePrice: undefined,
      },
   });

   useEffect(() => {
      if (!id) return;

      const findProduct = productsData.find((p) => p.id === Number(id));

      if (findProduct) {
         reset({
            ...findProduct,
            quantity: Number(findProduct.quantity),
            regularPrice: Number(findProduct.regularPrice),
            salePrice: findProduct.salePrice
               ? Number(findProduct.salePrice)
               : undefined,
         });
      }
   }, [id, reset]);

   // 3. Submit handler
   const onSubmit: SubmitHandler<z.infer<typeof productSchema>> = (data) => {
      console.log("Form Data:", data);

      if (id) {
         // update logic
      } else {
         // add logic
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
               <Details
                  data={data || {}}
                  formControl={control}
                  errors={errors}
               />
            </Stack>
            <Stack>
               <Properties
                  data={data || {}}
                  formControl={control}
                  errors={errors}
               />
            </Stack>
            <Stack>
               <Pricing
                  data={data || {}}
                  formControl={control}
                  errors={errors}
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
