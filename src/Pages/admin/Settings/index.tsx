import React from "react";
import { Stack } from "@mui/material";

const Settings = () => {
   return (
      <Stack
         spacing={2}
         py={2}
         direction={"row"}
         // bgcolor={"background.default"}
         height={"100%"}
      >
         <Stack
            p={2}
            bgcolor={"background.paper"}
            borderRadius={2}
            height={"100%"}
         >
            Side
         </Stack>
         <Stack></Stack>
      </Stack>
   );
};

export default Settings;
