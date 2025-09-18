"use client";
import React, { useEffect } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { Chip } from "@mui/material";
import { orderStatuses } from "@src/handler/order_filter";

const statusColor: Record<
  string,
  "default" | "warning" | "success" | "info" | "error"
> = {
  All: "default",
  Pending: "warning",
  Confirmed: "success",
  Processing: "info",
  Shipped: "info",
  "Out for Delivery": "info",
  Delivered: "success",
  Completed: "success",
  Hold: "default",
  Cancelled: "error",
  Failed: "error",
} as const;

type OrderTabProps = {
  onChange?: (data: string) => void;
  value?: number;
};

const OrderTab = ({ value = 0, onChange }: OrderTabProps) => {
  const theme = useTheme();
  const [val, setVal] = React.useState(value === -1 ? 0 : value);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setVal(newValue);
  };
  const [status, setStatusCounts] = React.useState<{ [key: string]: number }[]>(
    [{ All: 0 }, ...orderStatuses.map((s) => ({ [s]: 0 }))]
  );

  useEffect(() => {
    // Generate random counts on client only
    const counts = [
      { All: Math.floor(Math.random() * 140) + 1 },
      ...orderStatuses.map((s) => ({
        [s]: Math.floor(Math.random() * 140) + 1,
      })),
    ];
    setStatusCounts(counts);
  }, []);

  useEffect(() => {
    setVal(value);
  }, [value]);

  useEffect(() => {
    onChange?.(Object.keys(status[val || 0])[0]);
  }, [val]);

  return (
    <Box sx={{ width: "100%" }}>
      <Tabs
        value={val}
        onChange={handleChange}
        variant="scrollable"
        TabIndicatorProps={{
          children: <span className="MuiTabs-indicatorSpan" />,
        }}
        sx={{
          "& .MuiTabs-indicator": {
            display: "flex",
            justifyContent: "center",
            backgroundColor: "transparent",
          },
          "& .MuiTabs-indicatorSpan": {
            maxWidth: 40,
            width: "100%",
            backgroundColor: theme.palette.common.white,
          },
        }}
      >
        {status.map((s, i) => {
          const statusKey = Object.keys(s)[0] as keyof typeof statusColor;
          const statusVal = statusColor[statusKey] || "default";
          const paletteKey = statusVal === "default" ? "primary" : statusVal;

          const color =
            statusKey === "All" || statusKey === "Hold"
              ? theme.palette.common.white
              : theme.palette[paletteKey]?.main || theme.palette.primary.main;

          const isAll = statusKey === "All";
          const isHold = statusKey === "Hold";
          const isActive = val === i;
          const isHoldActive = isHold && isActive;

          const bgColor = isAll || isActive ? color : alpha(color, 0.1);
          const textColor = isAll
            ? theme.palette.common.black
            : isHoldActive
            ? theme.palette.common.black // 👈 active hold → white text
            : isHold
            ? theme.palette.text.secondary // 👈 inactive hold → secondary text
            : isActive
            ? theme.palette.common.white
            : color;

          return (
            <Tab
              key={i}
              disableRipple
              disableFocusRipple
              label={statusKey}
              icon={
                <Chip
                  label={s[statusKey] >= 99 ? "99+" : s[statusKey]}
                  size="small"
                  sx={{
                    borderRadius: "6px!important",
                    fontSize: 12,

                    bgcolor: bgColor,
                    color: textColor,
                  }}
                />
              }
              iconPosition="end"
              sx={{
                textTransform: "none",
                fontWeight: 500,
                fontSize: theme.typography.pxToRem(14),
                marginRight: theme.spacing(1),
                color: theme.palette.text.secondary,
                minHeight: 50,
                "&.Mui-selected": {
                  color: theme.palette.common.white,
                },
              }}
            />
          );
        })}
      </Tabs>
    </Box>
  );
};

export default OrderTab;
