"use client";

// Purchase Create (redesign) — Additional Information: the purchase
// note and attachments. The model stores a single note (there is no
// separate internal-remarks field), so one note field is shown.
// Attachment handling is unchanged: files go through the existing
// uploads flow on save (see Publish/index.tsx), and attachments
// already saved on the purchase stay listed in edit mode.
//
// Labels and helpers follow the Order Create / Product Create form
// system (FieldLabel + helper text under the field); both fields
// here are optional in the schema, and say so in their labels.

import { Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import AttachmentUploader from "./AttachmentUploader";
import FieldLabel from "./FieldLabel";

interface NotesSectionProps {
   control: any;
   data: any;
}

const NotesSection = ({ control, data }: NotesSectionProps) => {
   return (
      <Stack spacing={3}>
         <Stack spacing={0.75}>
            <FieldLabel optional>Purchase Notes</FieldLabel>
            <Controller
               name="note"
               control={control}
               defaultValue={data?.note ?? ""}
               render={({ field }) => (
                  <TextField
                     {...field}
                     fullWidth
                     multiline
                     rows={3}
                     size="small"
                     placeholder="Note for this purchase…"
                     helperText="Add any additional information about this purchase."
                  />
               )}
            />
         </Stack>

         <Stack spacing={0.75}>
            <FieldLabel optional>Attachments</FieldLabel>
            <Controller
               name="attachments"
               control={control}
               defaultValue={data.attachments || []}
               render={({ field }) => (
                  <AttachmentUploader
                     {...field}
                     value={field.value || []}
                     onChange={(val: any) => field.onChange(val)}
                  />
               )}
            />
            {Array.isArray(data.attachments) && data.attachments.length > 0 && (
               <Stack spacing={0.5}>
                  <Typography variant="caption" color="textSecondary">
                     Saved attachments:
                  </Typography>
                  {data.attachments.map((att: any, i: number) => (
                     <Typography key={att.id || i} variant="body2">
                        • {att.name}
                        {att.size
                           ? ` (${Math.max(1, Math.round(att.size / 1024))} KB)`
                           : ""}
                     </Typography>
                  ))}
               </Stack>
            )}
         </Stack>
      </Stack>
   );
};

export default NotesSection;
