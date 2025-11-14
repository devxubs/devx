import { Card, Stack, Typography } from "@mui/material";
import React, { ReactNode } from "react";

const CustomCard = ({
   children,
   title,
}: {
   children: ReactNode;
   title?: string;
}) => {
   return (
      <Stack
         sx={{
            p: 3,
            boxShadow: 20,
            height: "100%",
            borderRadius: 1.5,
            bgcolor: "background.paper",
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
