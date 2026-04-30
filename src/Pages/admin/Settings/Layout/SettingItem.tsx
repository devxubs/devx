import { Stack, TextField, Typography } from "@mui/material";
import React from "react";

interface SettingItemProps {
   title: string;
   description: string;
}

const SettingItem = (props: SettingItemProps) => {
   return (
      <Stack spacing={0.5}>
         <Stack spacing={1} width={{ xs: "100%", sm: "50%" }}>
            <Typography variant="body1">{props.title}</Typography>
            <TextField placeholder="Name" label="Name" />
         </Stack>
         <Typography variant="body2" color="textSecondary">
            {props.description}
         </Typography>
      </Stack>
   );
};

export default SettingItem;
