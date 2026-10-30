"use client";

import { Stack, Typography, Button } from "@mui/material";
import CustomCard from "@src/components/CustomCard";
import React from "react";
import { useSettings } from "@src/lib/settingsContext";
import { useRouter } from "next/navigation";

interface BalanceProps {
   currentBalance?: number;
   orderTotal?: number;
   earning?: number;
   refunded?: number;
}

const Balance = ({
   currentBalance = 0,
   orderTotal = 0,
   earning = 0,
   refunded = 0,
}: BalanceProps) => {
   const { formatCurrency } = useSettings();
   const router = useRouter();

   return (
      <CustomCard title="Current balance">
         <Stack spacing={1}>
            <Typography variant="h4" fontWeight={700} color="primary.main">
               {formatCurrency(currentBalance)}
            </Typography>
            <Stack spacing={2}>
               <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" color="textSecondary">
                     Order total
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                     {formatCurrency(orderTotal)}
                  </Typography>
               </Stack>
               <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" color="textSecondary">
                     Net Earnings
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="success.main">
                     {formatCurrency(earning)}
                  </Typography>
               </Stack>
               <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle2" color="textSecondary">
                     Cancelled / Refund
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="error.main">
                     {formatCurrency(refunded)}
                  </Typography>
               </Stack>
               <Stack spacing={2} direction="row">
                  <Button
                     fullWidth
                     variant="contained"
                     color="primary"
                     sx={{ borderRadius: 1 }}
                     onClick={() => router.push("/admin/billing")}
                  >
                     Payout
                  </Button>
                  <Button
                     fullWidth
                     variant="contained"
                     color="warning"
                     sx={{ borderRadius: 1 }}
                     onClick={() => router.push("/admin/reports")}
                  >
                     Reports
                  </Button>
               </Stack>
            </Stack>
         </Stack>
      </CustomCard>
   );
};

export default Balance;
