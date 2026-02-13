import { Stack, Avatar, Typography, Tooltip, Button } from "@mui/material";
import Icon from "@src/components/Icon";
import { useState } from "react";

const CustomerInfo = ({
   name,
   email,
   phone,
   url,
}: {
   name: string;
   email?: string;
   phone: number | string;
   url?: string;
}) => {
   const [copyText, setCopyText] = useState("Copy phone number");

   return (
      <Stack spacing={1} direction="row" alignItems="center" height={"100%"}>
         <Stack>
            <Typography variant="body2" color="textPrimary">
               {name}
            </Typography>
            <Typography variant="body2" fontSize={14} color="textSecondary">
               {phone}
            </Typography>
         </Stack>
         <Stack spacing={0.3}>
            <Tooltip title={copyText} disableInteractive>
               <Button
                  color="inherit"
                  sx={{
                     borderRadius: "5px!important",
                     minWidth: "30px!important",
                     p: 0.3,
                  }}
                  onClick={() => {
                     setCopyText("Copied!");
                     navigator.clipboard.writeText(`${phone}`);
                     setTimeout(() => {
                        setCopyText("Copy phone number");
                     }, 2000);
                  }}
               >
                  <Icon icon="solar:copy-bold-duotone" size="small" />
               </Button>
            </Tooltip>
            <Tooltip title="Call now" disableInteractive>
               <Button
                  color="primary"
                  sx={{
                     borderRadius: "5px!important",
                     minWidth: "30px!important",
                     p: 0.3,
                  }}
                  onClick={() => {
                     window.open(`tel:${phone}`);
                  }}
               >
                  <Icon
                     icon="solar:outgoing-call-rounded-bold"
                     size="small"
                     color="primary"
                  />
               </Button>
            </Tooltip>
         </Stack>
      </Stack>
   );
};

export default CustomerInfo;
