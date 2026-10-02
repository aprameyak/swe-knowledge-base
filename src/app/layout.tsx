import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strand",
  description:
    "Store work notes and pull them for interviews, resumes, and reviews.",
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
