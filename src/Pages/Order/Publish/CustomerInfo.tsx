"use client";

import {
  Paper,
  Stack,
  Typography,
  TextField,
  IconButton,
  Collapse,
  Grid,
} from "@mui/material";
import React, { useState } from "react";
import Icon from "@src/components/Icon";

const CustomerInfo = () => {
  const [expanded, setExpanded] = useState(false);

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
            Customer Information
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
        <Stack spacing={3} p={2} pt={0}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography
                  variant="h6"
                  fontSize={"13px!important"}
                  fontWeight={500}
                >
                  Full Name
                </Typography>
                <TextField fullWidth placeholder="Name" label="Name" />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography
                  variant="h6"
                  fontSize={"13px!important"}
                  fontWeight={500}
                >
                  E-mail
                </Typography>
                <TextField fullWidth placeholder="E-mail" label="E-mail" />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography
                  variant="h6"
                  fontSize={"13px!important"}
                  fontWeight={500}
                >
                  Phone Number
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Number"
                  label="Number"
                  type="number"
                  sx={{
                    "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button":
                      {
                        display: "none",
                      },
                  }}
                />
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={1.5}>
                <Typography
                  variant="h6"
                  fontSize={"13px!important"}
                  fontWeight={500}
                >
                  Billing Address{" "}
                  <Typography
                    component={"span"}
                    variant="body2"
                    fontSize={12}
                    color="textSecondary"
                  >
                    (Street, City, State)
                  </Typography>
                </Typography>
                <TextField fullWidth placeholder="Address" label="Address" />
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Collapse>
    </Paper>
  );
};

export default CustomerInfo;
