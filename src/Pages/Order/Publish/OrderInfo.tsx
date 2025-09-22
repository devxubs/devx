"use client";

import {
  Paper,
  Stack,
  Typography,
  TextField,
  IconButton,
  Collapse,
} from "@mui/material";
import React, { useState } from "react";
import Icon from "@src/components/Icon";

const OrderInfo = () => {
  const [expanded, setExpanded] = useState(true);

  return (
    <Paper sx={{ borderRadius: 1.5, boxShadow: 15, overflow: "hidden" }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        p={3}
      >
        <Stack spacing={0.5}>
          <Typography variant="body1" fontSize={18} color="textPrimary">
            Order Information
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Name, Number, E-mail, Address ...
          </Typography>
        </Stack>
        <IconButton onClick={() => setExpanded(!expanded)}>
          <Icon
            style={{
              transform: `rotate(${expanded ? 90 : 0}deg)`,
              transition: "all 0.2s",
            }}
            icon={"solar:alt-arrow-right-broken"}
          />
        </IconButton>
      </Stack>

      {/* Animated Content */}
      <Collapse in={expanded}>
        <Stack spacing={3} p={2}></Stack>
      </Collapse>
    </Paper>
  );
};

export default OrderInfo;
