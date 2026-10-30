import Settings from "@src/Pages/admin/Settings";
import React, { Suspense } from "react";

const SettingsPage = () => {
   return (
      <Suspense fallback={<div>Loading...</div>}>
         <Settings />
      </Suspense>
   );
};

export default SettingsPage;
