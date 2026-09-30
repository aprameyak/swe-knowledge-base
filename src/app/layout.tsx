import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strand — Career memory that compounds",
  description:
    "Capture professional experiences in seconds. Strand helps you remember, connect, and recall your real career history.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
