import Layout from "@src/Layout";
import React, { Suspense } from "react";

export default async function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <Layout>
         <Suspense fallback={null}>{children}</Suspense>
      </Layout>
   );
}
