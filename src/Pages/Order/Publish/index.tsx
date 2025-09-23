"use Client";

import { Stack, Container, Button } from "@mui/material";
import React from "react";
import CustomerInfo from "./CustomerInfo";
import ProductDetails from "./ProductDetails";
import OrderInfo from "./OrderInfo";
import Pricing from "./Pricing";

const Publish = () => {
   return (
      <Stack>
         <Container maxWidth="md">
            <Stack spacing={3}>
               <CustomerInfo />
               <ProductDetails />
               <OrderInfo />
               <Pricing />
            </Stack>
            <Stack
               spacing={2}
               direction={"row"}
               justifyContent={"flex-end"}
               width={"100%"}
               mt={2}
            >
               <Button variant="text" color="inherit">
                  Cancel
               </Button>

               <Button
                  variant="contained"
                  color="primary"
                  type="submit"
                  // onClick={handleSubmit(onSubmit)}
               >
                  {/* {mode === "edit" ? "Update product" : "Add product"} */}
                  Add product
               </Button>
            </Stack>
         </Container>
      </Stack>
   );
};

export default Publish;
