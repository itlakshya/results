import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IIC Lakshya Result Portal",
  description: "BVOC Result Portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
