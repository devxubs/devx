"use client";

// Purchase Create (field consistency) — the field label used across
// the page, copied from the Order Create pages' pattern: a 13px,
// semi-bold, secondary-colour label above the field, with any
// qualifier carried as a caption span inside the same line — the
// "(auto)" mechanism Order Create uses for server-assigned IDs,
// applied here to "(Optional)" for fields the form schema and the
// API both treat as optional. (Product Create marks required
// fields with a red asterisk instead; Purchase follows the Order
// pattern, and optional fields are never marked with an asterisk.)

import { Typography } from "@mui/material";
import React, { type ReactNode } from "react";

interface FieldLabelProps {
   children: ReactNode;
   /** The field is optional in the form schema / API. */
   optional?: boolean;
   /** The value is assigned by the server (e.g. the Purchase ID). */
   auto?: boolean;
}

const FieldLabel = ({ children, optional, auto }: FieldLabelProps) => (
   <Typography
      variant="body2"
      fontSize={13}
      fontWeight={600}
      color="textSecondary"
   >
      {children}
      {auto && (
         <>
            {" "}
            <Typography component="span" variant="caption" color="textSecondary">
               (auto)
            </Typography>
         </>
      )}
      {optional && (
         <>
            {" "}
            <Typography component="span" variant="caption" color="textSecondary">
               (Optional)
            </Typography>
         </>
      )}
   </Typography>
);

export default FieldLabel;
