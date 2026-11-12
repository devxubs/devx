"use client";

// Order Create (upgrade) — Order Notes.
// The app keeps four separate notes per order (Courier / Customer / Packing /
// Employee), stored in orderTags JSON — the same mechanism Order Details
// uses. At creation the customer note is sent as orderNote (the generic
// note) and all four are then persisted via PUT /api/orders/:id by
// useOrderCreate. No schema change is involved.
import { Chip, Grid, Stack, TextField, Typography } from "@mui/material";
import React from "react";
import SectionCard from "./SectionCard";
import type { OrderNotesState } from "./types";

interface NotesSectionProps {
   notes: OrderNotesState;
   onChange: (notes: OrderNotesState) => void;
}

const FIELDS: {
   key: keyof OrderNotesState;
   title: string;
   placeholder: string;
   badge?: string;
}[] = [
   { key: "customer", title: "Customer Note", placeholder: "Instructions requested by the customer…" },
   { key: "courier", title: "Courier Note", placeholder: "Instructions for the courier / rider…" },
   { key: "packing", title: "Packing Note", placeholder: "Packaging, fragile handling, inclusions…" },
   { key: "employee", title: "Employee Note", placeholder: "Internal staff notes…", badge: "Internal Only" },
];

const NotesSection = ({ notes, onChange }: NotesSectionProps) => {
   return (
      <SectionCard title="Order Notes" subtitle="Kept separate, exactly as in Order Details">
         <Grid container spacing={2}>
            {FIELDS.map((f) => (
               <Grid size={{ xs: 12, md: 6 }} key={f.key}>
                  <Stack spacing={1}>
                     <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" fontSize="13px!important" fontWeight={500}>
                           {f.title}
                        </Typography>
                        {f.badge && <Chip label={f.badge} size="small" sx={{ height: 20, fontSize: "0.68rem", fontWeight: 700 }} />}
                     </Stack>
                     <TextField
                        fullWidth
                        size="small"
                        multiline
                        rows={2}
                        value={notes[f.key]}
                        placeholder={f.placeholder}
                        onChange={(e) => onChange({ ...notes, [f.key]: e.target.value })}
                     />
                  </Stack>
               </Grid>
            ))}
         </Grid>
      </SectionCard>
   );
};

export default NotesSection;
