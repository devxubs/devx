import * as yup from "yup";
import { orderStatuses } from "../data";

export const orderSchema = yup.object({
   status: yup.string().oneOf(orderStatuses).required("Status is required"),
   orderNote: yup.string().nullable(),
   orderSource: yup.string().required("Order source is required"),

   customer: yup.object({
      name: yup.string().required("Customer name is required"),
      email: yup.string().email("Invalid email"),
      address: yup.string().required("Address is required"),
      phone: yup
         .string()
         .matches(/^[0-9+\-\s()]+$/, "Invalid phone number")
         .required("Phone number is required"),
   }),

   products: yup
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

   pricing: yup.object({
      paymentMethod: yup.string().required("Payment method is required"),

      subtotal: yup
         .number()
         .typeError("Subtotal must be a number")
         .min(1, "Subtotal cannot be 0")
         .required("Subtotal is required"),

      deliveryCharge: yup
         .number()
         .typeError("Shipping must be a number")
         .min(0, "Shipping cannot be 0")
         .required("Shipping cost is required"),

      discount: yup
         .number()
         .typeError("Discount must be a number")
         .min(0, "Discount cannot be negative")
         .default(0),

      total: yup
         .number()
         .typeError("Total must be a number")
         .min(0, "Total cannot be 0")
         .required("Total is required"),

      advancePayment: yup
         .number()
         .typeError("Advance Payment must be a number")
         .min(0, "Advance Payment cannot be negative")
         .default(0),

      dueAmount: yup
         .number()
         .typeError("Due Amount must be a number")
         .min(0, "Due Amount cannot be negative")
         .default(0),
   }),
});

export type OrderFormValues = yup.InferType<typeof orderSchema>;
