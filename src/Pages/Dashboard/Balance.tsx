import { Card, Stack, Typography, Button } from "@mui/material";
import CustomCard from "@src/components/CustomCard";
import React from "react";

const Balance = () => {
  return (
    <CustomCard title="Current balance">
      <Stack spacing={1}>
        <Typography variant="h4">$187,650</Typography>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2" color="textSecondary">
              Order total
            </Typography>
            <Typography variant="body2">$287,650</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2" color="textSecondary">
              Earning
            </Typography>
            <Typography variant="body2">$25,500</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle2" color="textSecondary">
              Refunded
            </Typography>
            <Typography variant="body2">$1,600</Typography>
          </Stack>
          <Stack spacing={2} direction="row">
            <Button
              fullWidth
              variant="contained"
              color="primary"
              sx={{ borderRadius: 1 }}
            >
              Request
            </Button>
            <Button
              fullWidth
              variant="contained"
              color="warning"
              sx={{ borderRadius: 1 }}
            >
              Transfer
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </CustomCard>
  );
};

export default Balance;
