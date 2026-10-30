import Publish from "@src/Pages/admin/Product/Publish";
import React, { Suspense } from "react";

const publish = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Publish />
      </Suspense>
   );
};

export default publish;
