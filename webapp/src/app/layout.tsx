import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Transcriber Studio",
  description: "Professional workspace for recording, transcription, and lesson artifacts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
