import { Stack, Button } from "@mui/material";
import React, { useState } from "react";

import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { TableRow } from "@src/components/Table";
import Icon from "@src/components/Icon";
import Details from "./Details";
import Properties from "./Properties";
import Pricing from "./Pricing";

interface ModalProps {
  mode: "add" | "edit";
  onClose?: () => void;
  userData?: TableRow;
  onChange?: (data: any) => void;
}

const productSchema = z
  .object({
    // PRODUCT DETAILS
    product_name: z.string().min(1, "Name is required!"),
    sub_description: z.string().optional(),
    content: z
      .string()
      .min(1, "Description is required!") // handles empty string
      .min(100, "Description must be at least 100 chars"),
    images: z
      .array(z.any())
      .min(1, "Image is required!")
      .min(2, "At least 2 image is required!"),

    // PRODUCT PROPERTIES
    product_code: z.string().min(1, "Product code is required!"),
    product_sku: z.string().min(1, "Product SKU is required!"),
    quantity: z.coerce.number().min(0, "Quantity is required!"), // ✅ coercion
    category: z.string().min(1, "Choose at least one category!"),
    product_type: z.array(z.string()).min(1, "Select at least one type!"),
    color: z.array(z.string()).min(1, "Choose at least one color!"),
    size: z.array(z.string()).min(1, "Choose at least one size!"),

    // PRODUCT PRICING
    regularPrice: z.coerce.number().min(0, "Price is required!"), // ✅ coercion
    salePrice: z.coerce
      .number()
      .optional()
      .refine((val) => val === undefined || val >= 0, {
        message: "Sale price must be positive",
      }),
  })
  .refine((data) => !data.salePrice || data.salePrice <= data.regularPrice, {
    message: "Sale price must be less than or equal to regular price",
    path: ["salePrice"],
  });

type PricingValues = z.infer<typeof productSchema>;

const Modal = ({ mode, onClose, userData, onChange }: ModalProps) => {
  const [detailsData, setDetailsData] = useState({
    name: "",
    category: "",
    subDescription: "",
    content: "",
    images: [],
  });

  const onDetailsDataChange = (field: string, value: any) => {
    if (Array.isArray(value)) {
      setDetailsData((prev) => ({
        ...prev,
        [field]: [...prev.images, ...value],
      }));
      return;
    }
    setDetailsData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  const handleRemove = (index: number) => {
    // setImages(images.filter((_, i) => i !== index));
  };

  // 2. Hook form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof productSchema>,
    any,
    z.output<typeof productSchema>
  >({
    resolver: zodResolver(productSchema),
    defaultValues: {
      product_name: "",
      sub_description: "",
      content: "",
      images: [],
      product_code: "",
      product_sku: "",
      quantity: "",
      category: "",
      product_type: [],
      color: [],
      size: [],
      regularPrice: "",
      salePrice: undefined,
    },
  });

  // 3. Submit handler
  const onSubmit: SubmitHandler<PricingValues> = (data) => {
    console.log("✅ Pricing form data:", data);
  };

  return (
    <Stack width={"100%"} component="form">
      <Stack spacing={4}>
        <Stack>
          <Details
            detailsData={detailsData}
            onDetailsDataChange={onDetailsDataChange}
            handleRemove={handleRemove}
            formControl={control}
            errors={errors}
          />
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
        <Button variant="text" color="inherit" onClick={onClose}>
          Cancel
        </Button>

        <Button
          variant="contained"
          color="primary"
          type="submit"
          onClick={handleSubmit(onSubmit)}
        >
          {mode === "edit" ? "Update user" : "Add user"}
        </Button>
      </Stack>
    </Stack>
  );
};

export default Modal;
