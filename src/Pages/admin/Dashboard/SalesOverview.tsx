"use client";

import {
   Stack,
   Typography,
   useTheme,
} from "@mui/material";
import React from "react";
import LinearProgress, {
   linearProgressClasses,
} from "@mui/material/LinearProgress";
import CustomCard from "@src/components/CustomCard";
import { useSettings } from "@src/lib/settingsContext";

type PaletteColorKey =
   | "primary"
   | "secondary"
   | "error"
   | "warning"
   | "info"
   | "success";

interface CustomProgressProps {
   value: number;
   color: PaletteColorKey;
}

const CustomProgress = ({ value, color }: CustomProgressProps) => {
   const theme = useTheme();
   return (
      <LinearProgress
         variant="determinate"
         value={Math.min(Math.max(value, 0), 100)}
         sx={{
            height: 8,
            borderRadius: 2,
            [`&.${linearProgressClasses.colorPrimary}`]: {
               backgroundColor: theme.palette.background.default,
            },
            [`& .${linearProgressClasses.bar}`]: {
               borderRadius: 5,
               backgroundColor: (theme.palette[color] as any).main,
            },
         }}
      />
   );
};

interface SalesOverviewProps {
   totalRevenue?: number;
   totalExpenses?: number;
   netProfit?: number;
}

const SalesOverview = ({
   totalRevenue = 0,
   totalExpenses = 0,
   netProfit = 0,
}: SalesOverviewProps) => {
   const { formatCurrency } = useSettings();

   const baseTotal = totalRevenue > 0 ? totalRevenue : 1;
   const profitPercent = Math.round(Math.max((netProfit / baseTotal) * 100, 0));
   const expensePercent = Math.round(Math.min((totalExpenses / baseTotal) * 100, 100));
   const incomePercent = totalRevenue > 0 ? 100 : 0;

   return (
      <CustomCard title="Sales & Performance Overview" subtitle="Revenue vs Expense distribution">
         <Stack mt={3} spacing={3}>
            {/* Total Profit */}
            <Stack spacing={1}>
               <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
               >
                  <Typography variant="subtitle2" fontWeight={600}>Total Net Profit</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                     {formatCurrency(netProfit)}{" "}
                     <Typography
                        component="span"
                        variant="caption"
                        color="textSecondary"
                     >
                        ({profitPercent}%)
                     </Typography>
                  </Typography>
               </Stack>
               <CustomProgress color="primary" value={profitPercent} />
            </Stack>

            {/* Total Revenue */}
            <Stack spacing={1}>
               <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
               >
                  <Typography variant="subtitle2" fontWeight={600}>Total Revenue / Sales</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                     {formatCurrency(totalRevenue)}{" "}
                     <Typography
                        component="span"
                        variant="caption"
                        color="textSecondary"
                     >
                        ({incomePercent}%)
                     </Typography>
                  </Typography>
               </Stack>
               <CustomProgress color="success" value={incomePercent} />
            </Stack>

            {/* Total Expenses */}
            <Stack spacing={1}>
               <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
               >
                  <Typography variant="subtitle2" fontWeight={600}>Operating Expenses</Typography>
                  <Typography variant="subtitle2" fontWeight={700}>
                     {formatCurrency(totalExpenses)}{" "}
                     <Typography
                        component="span"
                        variant="caption"
                        color="textSecondary"
                     >
                        ({expensePercent}%)
                     </Typography>
                  </Typography>
               </Stack>
               <CustomProgress color="warning" value={expensePercent} />
            </Stack>
         </Stack>
      </CustomCard>
   );
};

export default SalesOverview;
