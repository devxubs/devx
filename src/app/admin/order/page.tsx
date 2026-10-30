import Order from "@src/Pages/admin/Order";
import React, { Suspense } from "react";

const OrderPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Order />
      </Suspense>
   );
};

export default OrderPage;
