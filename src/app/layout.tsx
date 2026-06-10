import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "手術器械管理系統",
  description: "醫院供應中心手術器械全生命週期追蹤",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
