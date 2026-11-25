"use client";

// Purchase Create (redesign) — section card in the page's established
// visual language (same pattern as the Order Create SectionCard:
// outlined Paper, radius 1.5, compact header, collapsible body).
// Purchase-scoped copy — no shared component behaviour changes.

import { Collapse, IconButton, Paper, Stack, Typography } from "@mui/material";
import React, { useState, type ReactNode } from "react";
import Icon from "@src/components/Icon";

interface SectionCardProps {
   title: string;
   subtitle?: string;
   children: ReactNode;
   defaultExpanded?: boolean;
   action?: ReactNode;
}

const SectionCard = ({
   title,
   subtitle,
   children,
   defaultExpanded = true,
   action,
}: SectionCardProps) => {
   const [expanded, setExpanded] = useState(defaultExpanded);
   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
         }}
      >
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            px={{ xs: 2, sm: 3 }}
            py={2}
            spacing={1.5}
         >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
               <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  fontSize="0.95rem"
                  color="textPrimary"
               >
                  {title}
               </Typography>
               {subtitle && (
                  <Typography
                     variant="caption"
                     color="textSecondary"
                     fontSize={12}
                  >
                     {subtitle}
                  </Typography>
               )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={0.5}>
               {action}
               <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  aria-label={expanded ? "Collapse section" : "Expand section"}
               >
                  <Icon
                     style={{
                        transform: `rotate(${expanded ? 90 : 0}deg)`,
                        transition: "all 0.2s",
                     }}
                     icon={"solar:alt-arrow-right-broken"}
                  />
               </IconButton>
            </Stack>
         </Stack>
         <Collapse in={expanded}>
            <Stack px={{ xs: 2, sm: 3 }} pb={3} pt={1}>
               {children}
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default SectionCard;
