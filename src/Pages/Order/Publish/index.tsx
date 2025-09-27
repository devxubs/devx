"use client";

import {
   Stack,
   Container,
   Button,
   CircularProgress,
   useTheme,
   alpha,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useForm, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import CustomerDetails from "./CustomerDetails";
import ProductDetails from "./ProductDetails";
import OrderInfo from "./OrderInfo";
import Pricing from "./Pricing";

import { OrderType } from "../type";
import { OrderFormValues, orderSchema } from "./schema";
import { orders as orderData } from "../data";

const Publish = () => {
   const theme = useTheme();
   const [order, setOrder] = useState<OrderType>({} as OrderType);
   const [loading, setLoading] = useState(false);
   const [isEditMode, setIsEditMode] = useState(false);
   const router = useRouter();
   const params = useSearchParams();
   const id = params?.get("id");

   const {
      control,
      handleSubmit,
      reset,
      formState: { errors },
      watch,
      setValue,
   } = useForm<OrderFormValues>({
      resolver: yupResolver<OrderFormValues, any, any>(orderSchema),
      defaultValues: {
         status: "Pending",
         orderNote: "",
         orderSource: "",
         customer: {
            name: "",
            email: "",
            address: "",
            phone: "",
         },
         products: [],
         pricing: {
            paymentMethod: "Cash on Delivery",
            subtotal: 0,
            deliveryCharge: 0,
            discount: 0,
            advancePayment: 0,
            total: 0,
         },
      },
   });

   useEffect(() => {
      if (id && orderData?.length) {
         const editData = orderData.find((d) => d.orderId === id);

         if (editData) {
            setOrder({ ...editData });

            reset({
               ...editData,
               status: "Pending",
               orderNote:
                  editData.orderNote === null ? undefined : editData.orderNote,
               customer: {
                  name: editData.customer.name,
                  email: editData.customer.email,
                  address: editData.customer.address,
                  phone: editData.customer.phone,
               },
               products: (editData.products || []).map((p: any) => ({
                  id: p.id,
                  name: p.name,
                  code: p.code,
                  quantity: p.quantity,
                  price: p.price,
                  images: typeof p.images === "string" ? [p.images] : p.images, // remove undefined & ensure string[]
               })), // ✅ now type-safe
               pricing: editData.pricing,
            });
            setIsEditMode(true);
         }
      } else {
         setIsEditMode(false);
      }
   }, []);

   const customerData = order.customer ? order.customer : watch("customer");
   const productsData = order.products ? order.products : watch("products");
   const orderInfoData = {
      orderSource: order.orderSource ? order.orderSource : watch("orderSource"),
      orderNote: order.orderNote ? order.orderNote : watch("orderNote"),
   };
   const pricingData = order.pricing ? order.pricing : watch("pricing");

   const onSubmit: SubmitHandler<OrderFormValues> = (formData) => {
      setLoading(true);
      const sanitizedProducts = (formData.products || []).map((p: any) => ({
         id: p.id,
         name: p.name,
         code: p.code,
         quantity: p.quantity,
         price: p.price,
         images: (p.images?.filter(Boolean) as string) || "", // remove undefined & ensure string[]
      }));

      const newOrder: OrderType = {
         ...formData,
         status: "Pending",
         orderNote:
            formData.orderNote === null ? undefined : formData.orderNote,
         orderId: `#${6000 + orderData.length + 1}`,
         invoiceNo: `INV-${6000 + orderData.length + 1}`,
         createdAt: new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         employee: { id: "EMP001", name: "John Doe" },
         customer: {
            id: crypto.randomUUID(),
            name: formData.customer.name || "",
            email: formData.customer.email || "",
            address: formData.customer.address || "",
            phone: formData.customer.phone || "",
         },
         products: sanitizedProducts, // ✅ now type-safe
         pricing: formData.pricing,
      };

      setOrder(newOrder);

      setTimeout(() => {
         setLoading(false);
         router.push("/order");
         reset();
      }, 3000);
   };

   return (
      <Stack>
         <Container maxWidth="md">
            <form onSubmit={handleSubmit(onSubmit)}>
               <Stack spacing={3}>
                  <CustomerDetails
                     control={control}
                     errors={errors.customer || {}}
                     data={customerData as any}
                  />
                  <ProductDetails
                     control={control}
                     errors={errors}
                     data={productsData as any}
                  />
                  <OrderInfo
                     control={control}
                     errors={errors}
                     data={orderInfoData as any}
                  />
                  <Pricing
                     control={control}
                     errors={errors.pricing || {}}
                     setValue={setValue}
                     watch={watch}
                     data={pricingData as any}
                  />
               </Stack>
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
                     onClick={() => {
                        reset();
                        setIsEditMode(false);

                        router.push("/order");
                     }}
                  >
                     Cancel
                  </Button>

                  <Button
                     variant="contained"
                     color="primary"
                     type="submit"
                     disabled={loading}
                     sx={{
                        position: "relative",
                        overflow: "hidden",
                        backgroundColor: loading
                           ? alpha(theme.palette.primary.main, 0.5) +
                             "!important"
                           : theme.palette.primary.main + "!important",
                        color: loading
                           ? alpha(theme.palette.primary.contrastText, 0.7) +
                             "!important"
                           : theme.palette.primary.contrastText,
                     }}
                  >
                     {isEditMode ? "Update Order" : "Place Order"}
                     {loading && (
                        <CircularProgress
                           size={24}
                           sx={{
                              color: theme.palette.primary.contrastText,
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              marginTop: "-12px",
                              marginLeft: "-12px",
                           }}
                        />
                     )}
                  </Button>
               </Stack>
            </form>
         </Container>
      </Stack>
   );
};

export default Publish;
