import { Stack, TextField, Typography } from "@mui/material";
import React from "react";

interface SettingItemProps {
   title: string;
   description: string;
}

const SettingItem = ({ title, description }: SettingItemProps) => {
   return (
      <Stack spacing={0.5}>
         <Typography variant="body1">{title}</Typography>
         <Stack spacing={0.3} width={{ xs: "100%", sm: "50%" }}>
            <TextField placeholder={title} size="small" />
            <Typography variant="caption" color="textSecondary" pl={1}>
               {description}
            </Typography>
         </Stack>
      </Stack>
   );
};

export default SettingItem;
