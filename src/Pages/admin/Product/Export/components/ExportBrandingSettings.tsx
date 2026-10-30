"use client";

import React from "react";
import { Grid, FormControlLabel, Checkbox, Typography } from "@mui/material";

export interface ExportBrandingSettingsProps {
   includeLogo: boolean;
   onChangeIncludeLogo: (val: boolean) => void;
   includeCompanyName: boolean;
   onChangeIncludeCompanyName: (val: boolean) => void;
   includeContact: boolean;
   onChangeIncludeContact: (val: boolean) => void;
   includeDate: boolean;
   onChangeIncludeDate: (val: boolean) => void;
}

export default function ExportBrandingSettings({
   includeLogo,
   onChangeIncludeLogo,
   includeCompanyName,
   onChangeIncludeCompanyName,
   includeContact,
   onChangeIncludeContact,
   includeDate,
   onChangeIncludeDate,
}: ExportBrandingSettingsProps) {
   return (
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
         <Grid size={{ xs: 6, sm: 3 }}>
            <FormControlLabel
               control={
                  <Checkbox
                     size="small"
                     checked={includeLogo}
                     onChange={(e) => onChangeIncludeLogo(e.target.checked)}
                  />
               }
               label={<Typography variant="body2">Company Logo</Typography>}
            />
         </Grid>

         <Grid size={{ xs: 6, sm: 3 }}>
            <FormControlLabel
               control={
                  <Checkbox
                     size="small"
                     checked={includeCompanyName}
                     onChange={(e) => onChangeIncludeCompanyName(e.target.checked)}
                  />
               }
               label={<Typography variant="body2">Company Name</Typography>}
            />
         </Grid>

         <Grid size={{ xs: 6, sm: 3 }}>
            <FormControlLabel
               control={
                  <Checkbox
                     size="small"
                     checked={includeContact}
                     onChange={(e) => onChangeIncludeContact(e.target.checked)}
                  />
               }
               label={<Typography variant="body2">Contact Info</Typography>}
            />
         </Grid>

         <Grid size={{ xs: 6, sm: 3 }}>
            <FormControlLabel
               control={
                  <Checkbox
                     size="small"
                     checked={includeDate}
                     onChange={(e) => onChangeIncludeDate(e.target.checked)}
                  />
               }
               label={<Typography variant="body2">Export Date</Typography>}
            />
         </Grid>
      </Grid>
   );
}
