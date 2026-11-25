"use client";

// Purchase Create (redesign) — Additional Information: the purchase
// note and attachments. The model stores a single note (there is no
// separate internal-remarks field), so one note field is shown.
// Attachment handling is unchanged: files go through the existing
// uploads flow on save (see Publish/index.tsx), and attachments
// already saved on the purchase stay listed in edit mode.

import { Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import AttachmentUploader from "./AttachmentUploader";

interface NotesSectionProps {
   control: any;
   data: any;
}

const NotesSection = ({ control, data }: NotesSectionProps) => {
   return (
      <Stack spacing={2.5}>
         <Stack spacing={1}>
            <Typography fontSize={13} fontWeight={500}>
               Purchase Notes
            </Typography>
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
                     placeholder="Optional note for this purchase…"
                     label="Note"
                  />
               )}
            />
         </Stack>

         <Stack spacing={1}>
            <Typography fontSize={13} fontWeight={500}>
               Attachments
            </Typography>
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
