import { Stack, Box, Typography, IconButton, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";
import React from "react";

const Replying = ({
   reply,
   onCancel,
}: {
   reply: {
      name: string;
      content: string;
   } | null;
   onCancel: () => void;
}) => {
   const theme = useTheme();
   return (
      <Stack
         direction={"row"}
         alignItems={"center"}
         justifyContent={"space-between"}
         mb={1}
      >
         <Box>
            <Typography variant="subtitle2" fontSize={12} color="textSecondary">
               Replying to {reply && reply.name}
            </Typography>
            <Typography variant="body2" fontSize={12} color="textSecondary">
               {reply && reply.content}
            </Typography>
         </Box>
         <IconButton size="small" onClick={() => onCancel()}>
            <Icon
               size="small"
               icon="carbon:close"
               style={{ color: theme.palette.text.secondary }}
            />
         </IconButton>
      </Stack>
   );
};

export default Replying;
