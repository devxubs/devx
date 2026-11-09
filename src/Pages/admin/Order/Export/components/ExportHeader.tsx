import React from "react";
import { Stack, Typography, Chip, Box, alpha, useTheme } from "@mui/material";
import Icon from "@src/components/Icon";

interface ExportHeaderProps {
   selectedCount: number;
}

export const ExportHeader: React.FC<ExportHeaderProps> = ({
   selectedCount,
}) => {
   const theme = useTheme();

   return (
      <Stack
         direction="row"
         alignItems="center"
         justifyContent="space-between"
         spacing={2}
         sx={{
            px: { xs: 2, sm: 2.5 },
            py: 2,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: "background.paper",
         }}
      >
         <Stack direction="row" alignItems="center" spacing={1.5} minWidth={0}>
            {/* Icon */}
            <Box
               sx={{
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
               }}
            >
               <Icon
                  icon="solar:download-square-bold-duotone"
                  color="primary"
               />
            </Box>

            {/* Title & Description */}
            <Stack spacing={0.35} minWidth={0}>
               <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  fontSize="0.975rem"
                  lineHeight={1.4}
                  noWrap
               >
                  Export Orders
               </Typography>

               <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize="0.8rem"
                  sx={{
                     lineHeight: 1.5,
                  }}
               >
                  Configure fields and format for your export.
               </Typography>
            </Stack>
         </Stack>

         {/* Selected Count */}
         <Chip
            size="small"
            icon={
               <Icon
                  icon="solar:check-circle-bold"
                  size={"small"}
                  color="primary"
               />
            }
            label={`${selectedCount} selected`}
            sx={{
               flexShrink: 0,
               height: 28,
               px: 0.5,
               borderRadius: 1.5,
               bgcolor: alpha(theme.palette.primary.main, 0.1),
               fontWeight: 700,
               fontSize: "0.75rem",
               color: "primary.main",
               "& .MuiChip-icon": {
                  color: "inherit",
                  ml: 0.75,
               },
            }}
         />
      </Stack>
   );
};

export default ExportHeader;
