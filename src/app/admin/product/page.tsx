import React, { Suspense } from "react";
import ProductPage from "@src/Pages/admin/Product";

const Product = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <ProductPage />
      </Suspense>
   );
};

export default Product;
