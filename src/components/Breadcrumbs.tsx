"use client";

import React from "react";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import Icon from "@src/components/Icon";

export interface BreadcrumbsProps {
   href: string;
   label: string;
   parentLabel?: string;
   parentHref?: string;

   isEdit?: boolean;
   onNavigateProducts?: () => void;
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
   href,
   label,
   parentLabel = "Back",
   parentHref,
   isEdit = false,
   onNavigateProducts,
}) => {
   const handleNavigate = (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (onNavigateProducts) {
         event.preventDefault();
         onNavigateProducts();
      }
   };

   return (
      <Box display="flex" alignItems="center" gap={1}>
         <MuiLink
            underline="none"
            color="inherit"
            href={parentHref || href}
            onClick={handleNavigate}
            sx={{
               p: 0.5,
               px: 1,
               display: "inline-flex",
               alignItems: "center",
               gap: 0.5,
               fontSize: "0.825rem",
               color: "text.secondary",
               borderRadius: 1,
               cursor: "pointer",
               "&:hover": {
                  textDecoration: "underline",
               },
            }}
         >
            <Icon icon="solar:arrow-left-linear" size="16px" />
            {parentLabel}
         </MuiLink>

         <Typography variant="caption" color="text.disabled">
            /
         </Typography>

         <Typography variant="caption" fontWeight={600} color="text.secondary">
            {label}
         </Typography>
      </Box>
   );
};

export default Breadcrumbs;
