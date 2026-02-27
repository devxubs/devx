import { alpha, Stack, Typography, useTheme } from "@mui/material";
import Content from "@src/SvgIcon/content";
import React from "react";

const NoRows = () => {
   const theme = useTheme();

   return (
      <Stack width="100%" height={"100%"} p={2} py={1}>
         <Stack
            border={1}
            borderColor={"divider"}
            borderRadius={2}
            width={"100%"}
            height={"100%"}
            bgcolor={alpha(theme.palette.grey[600], 0.1)}
            alignItems={"center"}
            justifyContent={"center"}
            sx={{
               borderStyle: "dashed",
            }}
         >
            <Content />
            <Typography
               variant="h6"
               fontSize={18}
               fontWeight={600}
               color="textSecondary"
            >
               No Data
            </Typography>
         </Stack>
      </Stack>
   );
};

export default NoRows;
