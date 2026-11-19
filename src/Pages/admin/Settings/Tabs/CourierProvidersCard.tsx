"use client";

// Courier provider configuration status (Phase 4, D4).
//
// Credentials live ONLY in server environment variables — there is
// deliberately no settings form for them here. This card asks the
// admin-only status endpoint which providers are configured and
// shows, per provider, a Configured / Not configured chip plus the
// NAMES of any missing env keys (never values), so the owner can
// see exactly what to set on the server. Live booking stays
// disabled until credentials exist AND the provider contracts are
// verified (D5).

import React, { useEffect, useState } from "react";
import {
   Box,
   Card,
   CardContent,
   Chip,
   CircularProgress,
   Grid,
   Stack,
   Typography,
} from "@mui/material";
import Icon from "@src/components/Icon";

interface ProviderStatus {
   provider: string;
   label: string;
   configured: boolean;
   missing: string[];
}

export default function CourierProvidersCard() {
   const [providers, setProviders] = useState<ProviderStatus[] | null>(null);
   const [failed, setFailed] = useState(false);

   useEffect(() => {
      let cancelled = false;
      (async () => {
         try {
            const res = await fetch("/api/courier/status");
            if (!res.ok) throw new Error("status failed");
            const data = await res.json();
            if (!cancelled) setProviders(data.providers || []);
         } catch {
            if (!cancelled) setFailed(true);
         }
      })();
      return () => {
         cancelled = true;
      };
   }, []);

   return (
      <Box sx={{ pt: 1 }}>
         <Typography variant="h6" fontWeight={600}>
            Courier Providers
         </Typography>
         <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Courier API credentials are configured on the server through
            environment variables — they are never entered or shown here.
            Live booking activates only after credentials are set and the
            provider integration is verified.
         </Typography>

         {failed ? (
            <Typography variant="body2" color="error.main">
               Could not load courier provider status.
            </Typography>
         ) : providers === null ? (
            <CircularProgress size={20} />
         ) : (
            <Grid container spacing={2}>
               {providers.map((p) => (
                  <Grid key={p.provider} size={{ xs: 12, md: 6 }}>
                     <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                           <Stack spacing={1}>
                              <Stack
                                 direction="row"
                                 alignItems="center"
                                 justifyContent="space-between"
                              >
                                 <Stack direction="row" spacing={1} alignItems="center">
                                    <Icon icon="solar:delivery-bold" size="20px" />
                                    <Typography variant="subtitle1" fontWeight={600}>
                                       {p.label}
                                    </Typography>
                                 </Stack>
                                 <Chip
                                    size="small"
                                    color={p.configured ? "success" : "default"}
                                    variant={p.configured ? "filled" : "outlined"}
                                    label={p.configured ? "Configured" : "Not configured"}
                                 />
                              </Stack>
                              {p.configured ? (
                                 <Typography variant="body2" color="text.secondary">
                                    Credentials detected on the server. Booking
                                    stays disabled until the provider contract
                                    verification (D5) is complete.
                                 </Typography>
                              ) : (
                                 <>
                                    <Typography variant="body2" color="text.secondary">
                                       Missing environment variables:
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                       {p.missing.map((key) => (
                                          <Chip
                                             key={key}
                                             size="small"
                                             variant="outlined"
                                             label={key}
                                             sx={{ fontFamily: "monospace", fontSize: "0.7rem" }}
                                          />
                                       ))}
                                    </Stack>
                                 </>
                              )}
                           </Stack>
                        </CardContent>
                     </Card>
                  </Grid>
               ))}
            </Grid>
         )}
      </Box>
   );
}
