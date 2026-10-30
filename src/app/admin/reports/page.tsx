import Report from "@src/Pages/admin/Reports";
import React, { Suspense } from "react";

const ReportPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Report />
      </Suspense>
   );
};

export default ReportPage;
