import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VyaparSahayak - AI Inventory Intelligence for FMCG",
  description:
    "Turn dead stock into recovered capital. The AI copilot Indian FMCG distributors use to clear slow-moving inventory.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
