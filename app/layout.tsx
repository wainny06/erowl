import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한의원 재고관리",
  description: "입고, 출고, 부족 수량을 관리하는 한의원 재고 장부",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
