import Layout from "@src/Layout";

export default async function RootLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return <Layout>{children}</Layout>;
}
