"use client";

import React from "react";
import { Breadcrumbs, Link, Stack, Typography, useTheme } from "@mui/material";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@src/components/Icon";

interface ProductBreadcrumbProps {
   currentPageTitle: string;
   isDirty?: boolean;
   onDiscardRequest?: () => void;
}

export const ProductBreadcrumb: React.FC<ProductBreadcrumbProps> = ({
   currentPageTitle,
   isDirty = false,
   onDiscardRequest,
}) => {
   const theme = useTheme();
   const router = useRouter();

   const handleProductsClick = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isDirty && onDiscardRequest) {
         onDiscardRequest();
      } else {
         router.push("/admin/product");
      }
   };

   return (
      <Breadcrumbs
         aria-label="breadcrumb"
         separator={
            <Icon
               icon="solar:alt-arrow-right-linear"
               size="12px"
               style={{ color: theme.palette.text.disabled }}
            />
         }
         sx={{
            "& .MuiBreadcrumbs-ol": {
               alignItems: "center",
            },
         }}
      >
         <Link
            component={NextLink}
            underline="hover"
            color="text.secondary"
            href="/admin/dashboard"
            sx={{
               display: "flex",
               alignItems: "center",
               gap: 0.5,
               fontSize: "0.8125rem",
               fontWeight: 500,
               transition: "color 0.15s ease",
               "&:hover": { color: "primary.main" },
            }}
         >
            <Icon icon="solar:home-smile-linear" size="14px" />
            Dashboard
         </Link>

         <Link
            underline="hover"
            color="text.secondary"
            href="/admin/product"
            data-testid="breadcrumb-products-link"
            onClick={handleProductsClick}
            sx={{
               display: "flex",
               alignItems: "center",
               gap: 0.5,
               fontSize: "0.8125rem",
               fontWeight: 500,
               cursor: "pointer",
               transition: "color 0.15s ease",
               "&:hover": { color: "primary.main" },
            }}
         >
            <Icon icon="solar:box-minimalistic-linear" size="14px" />
            Products
         </Link>

         <Typography
            variant="caption"
            color="text.primary"
            sx={{
               fontSize: "0.8125rem",
               fontWeight: 600,
            }}
         >
            {currentPageTitle}
         </Typography>
      </Breadcrumbs>
   );
};

export default ProductBreadcrumb;
