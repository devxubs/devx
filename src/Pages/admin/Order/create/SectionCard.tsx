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
      <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
         <Stack direction="row" justifyContent="space-between" alignItems="center" px={2.5} py={2}>
            <Stack spacing={0.25}>
               <Typography variant="body1" fontSize={17} color="textPrimary">
                  {title}
               </Typography>
               {subtitle && (
                  <Typography variant="body2" color="textSecondary" fontSize={13}>
                     {subtitle}
                  </Typography>
               )}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1}>
               {action}
               <IconButton size="small" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Collapse section" : "Expand section"}>
                  <Icon
                     style={{ transform: `rotate(${expanded ? 90 : 0}deg)`, transition: "all 0.2s" }}
                     icon={"solar:alt-arrow-right-broken"}
                  />
               </IconButton>
            </Stack>
         </Stack>
         <Collapse in={expanded}>
            <Stack spacing={2} p={2} pt={0}>
               {children}
            </Stack>
         </Collapse>
      </Paper>
   );
};

export default SectionCard;
