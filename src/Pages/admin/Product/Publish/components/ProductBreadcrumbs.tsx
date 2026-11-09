"use client";

import React from "react";
import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import Icon from "@src/components/Icon";

export interface ProductBreadcrumbsProps {
   isEdit?: boolean;
   onNavigateProducts?: () => void;
   currentPageTitle?: string;
}

export const ProductBreadcrumbs: React.FC<ProductBreadcrumbsProps> = ({
   isEdit = false,
   onNavigateProducts,
   currentPageTitle,
}) => {
   const currentLabel = currentPageTitle || (isEdit ? "Edit Product" : "New Product");

   return (
      <Breadcrumbs
         aria-label="breadcrumb"
         separator="•"
         sx={{
            fontSize: "0.75rem",
            "& .MuiBreadcrumbs-separator": {
               color: "text.disabled",
               mx: 0.5,
            },
         }}
      >
         <MuiLink
            underline="hover"
            color="inherit"
            onClick={onNavigateProducts}
            sx={{
               cursor: "pointer",
               display: "flex",
               alignItems: "center",
               gap: 0.5,
               color: "text.secondary",
               "&:hover": { color: "text.primary" },
            }}
         >
            <Icon icon="solar:arrow-left-linear" size="14px" />
            Products
         </MuiLink>
         <Typography
            color="text.primary"
            sx={{ fontSize: "0.75rem", fontWeight: 600 }}
         >
            {currentLabel}
         </Typography>
      </Breadcrumbs>
   );
};

export default ProductBreadcrumbs;
