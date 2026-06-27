import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import Navbar from "@/components/ui/Navbar";
import Providers from "@/components/ui/Providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PastQ — Ghana Exam Past Questions",
  description:
    "Browse and practice past questions for BECE, WASSCE, University and Professional exams in Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface font-sans text-text antialiased">
        <Providers>
          <Suspense fallback={<div className="h-16 border-b border-border bg-card/80" />}>
            <Navbar />
          </Suspense>
          <div className="animate-page-in">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
