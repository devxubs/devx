import Publish from "@src/Pages/admin/Roles/Publish";
import React, { Suspense } from "react";

const PublishPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Publish />
      </Suspense>
   );
};

export default PublishPage;
