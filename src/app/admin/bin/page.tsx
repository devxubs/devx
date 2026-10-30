import Bin from "@src/Pages/admin/Bin";
import React, { Suspense } from "react";

const BinPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Bin />
      </Suspense>
   );
};

export default BinPage;
