import { Card, Stack, SxProps, Typography } from "@mui/material";
import React, { ReactNode } from "react";

interface CustomCardProps {
   children: ReactNode;
   title?: string;
   sx?: SxProps;
}

const CustomCard = ({ children, title, sx }: CustomCardProps) => {
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
         <Typography variant="subtitle1" mb={2}>
            {title}
         </Typography>
         {children}
      </Stack>
   );
};

export default CustomCard;
