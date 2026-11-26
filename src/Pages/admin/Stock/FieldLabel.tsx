import React from "react";
import { Typography } from "@mui/material";

// The form label used across the create pages (Order Create /
// Product Create pattern): a small semibold secondary label ABOVE
// the field, with an optional subtle caption tag. Page-scoped copy
// for the Stock page, matching the Purchase page's FieldLabel so
// the two workspaces read identically.
const FieldLabel = ({
   children,
   optional = false,
}: {
   children: React.ReactNode;
   optional?: boolean;
}) => (
   <Typography
      variant="body2"
      sx={{
         fontSize: 13,
         fontWeight: 600,
         color: "text.secondary",
         mb: 0.75,
      }}
   >
      {children}
      {optional && (
         <Typography
            component="span"
            variant="caption"
            sx={{ ml: 0.5, fontWeight: 500, color: "text.secondary" }}
         >
            (Optional)
         </Typography>
      )}
   </Typography>
);

export default FieldLabel;
