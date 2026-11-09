import OrderDetailsPage from "@src/Pages/admin/Order/Details";
import React from "react";

interface PageProps {
   params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PageProps) {
   const { id } = await params;
   return <OrderDetailsPage orderId={id} />;
}
