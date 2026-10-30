import { Card, Stack, SxProps, Typography } from "@mui/material";
import React, { ReactNode } from "react";

interface CustomCardProps {
   children: ReactNode;
   title?: string;
   subtitle?: string;
   sx?: SxProps;
}

const CustomCard = ({ children, title, subtitle, sx }: CustomCardProps) => {
   return (
      <Stack
         sx={{
            p: 3,
            boxShadow: 20,
            height: "100%",
            borderRadius: 1.5,
            bgcolor: "background.paper",
            ...sx,
         }}
      >
         {title && (
            <Typography variant="subtitle1" mb={subtitle ? 0.5 : 2} fontWeight={600}>
               {title}
            </Typography>
         )}
         {subtitle && (
            <Typography variant="caption" color="text.secondary" mb={2}>
               {subtitle}
            </Typography>
         )}
         {children}
      </Stack>
   );
};

export default CustomCard;
