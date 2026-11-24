"use client";

// Order Create (upgrade) — collapsible section card matching the existing
// Publish page styling (Paper, radius 1.5, shadow 15, header + Collapse).
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

const SectionCard = ({ title, subtitle, children, defaultExpanded = true, action }: SectionCardProps) => {
   const [expanded, setExpanded] = useState(defaultExpanded);
   return (
      <Paper
         variant="outlined"
         sx={{
            borderRadius: 1.5,
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
            transition: "box-shadow 0.2s ease-in-out",
            "&:hover": {
               boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            },
         }}
      >
         <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1.5}
            spacing={1.5}
         >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
               <Typography variant="subtitle1" fontWeight={700} fontSize="0.95rem" color="textPrimary">
                  {title}
               </Typography>
               {subtitle && (
                  <Typography variant="caption" color="textSecondary" fontSize={12}>
                     {subtitle}
                  </Typography>
               )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
               {action}
               <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  aria-label={expanded ? "Collapse section" : "Expand section"}
                  sx={{ p: 0.5 }}
               >
                  <Icon
                     style={{
                        transform: `rotate(${expanded ? 90 : 0}deg)`,
                        transition: "transform 0.2s ease-in-out",
                     }}
                     icon="solar:alt-arrow-right-broken"
                     size="small"
                  />
               </IconButton>
            </Stack>
         </Stack>
         <Collapse in={expanded}>
            <Stack spacing={2} p={2} pt={0.5}>
               {children}
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default SectionCard;
