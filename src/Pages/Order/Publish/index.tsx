"use Client";

import { Stack, Container } from "@mui/material";
import React from "react";
import CustomerInfo from "./CustomerInfo";
import OrderInfo from "./OrderInfo";
import Pricing from "./Pricing";

const Publish = () => {
  return (
    <Stack>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <CustomerInfo />
          <OrderInfo />
          <Pricing />
        </Stack>
      </Container>
    </Stack>
  );
};

export default Publish;
