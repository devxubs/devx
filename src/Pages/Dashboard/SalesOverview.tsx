import {
  Card,
  Stack,
  Typography,
  useTheme,
  type PaletteColor,
} from "@mui/material";
import React, { useState } from "react";
import LinearProgress, {
  linearProgressClasses,
} from "@mui/material/LinearProgress";
import CustomCard from "@src/components/CustomCard";

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
      value={value}
      sx={{
        height: 8,
        borderRadius: 2,
        [`&.${linearProgressClasses.colorPrimary}`]: {
          backgroundColor: theme.palette.background.default,
          ...theme.applyStyles("dark", {
            backgroundColor: theme.palette.background.default,
          }),
        },
        [`& .${linearProgressClasses.bar}`]: {
          borderRadius: 5,
          backgroundColor: theme.palette[color].main as any,
          //   ...theme.applyStyles("dark", {
          //     backgroundColor: "#308fe8",
          //   }),
        },
      }}
    />
  );
};

const SalesOverview = () => {
  const [profitProgress, setProfitProgress] = useState(10);
  const [incomeProgress, setIncomeProgress] = useState(41);
  const [expensesProgress, setExpensesProgress] = useState(21);

  const theme = useTheme();

  return (
    <CustomCard title="Sales Overview">
      <Stack mt={4} spacing={3}>
        <Stack spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">Total profit</Typography>
            <Typography variant="subtitle2">
              $345{" "}
              <Typography
                component="span"
                variant="subtitle2"
                color="textSecondary"
              >
                ({profitProgress}%)
              </Typography>
            </Typography>
          </Stack>
          <CustomProgress color="primary" value={profitProgress} />
        </Stack>
        <Stack spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">Total income</Typography>
            <Typography variant="subtitle2">
              $345{" "}
              <Typography
                component="span"
                variant="subtitle2"
                color="textSecondary"
              >
                ({incomeProgress}%)
              </Typography>
            </Typography>
          </Stack>
          <CustomProgress color="warning" value={incomeProgress} />
        </Stack>
        <Stack spacing={1}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="subtitle2">Total expenses</Typography>
            <Typography variant="subtitle2">
              $345{" "}
              <Typography
                component="span"
                variant="subtitle2"
                color="textSecondary"
              >
                ({expensesProgress}%)
              </Typography>
            </Typography>
          </Stack>
          <CustomProgress color="info" value={expensesProgress} />
        </Stack>
      </Stack>
    </CustomCard>
  );
};

export default SalesOverview;
