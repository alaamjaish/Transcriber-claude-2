import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "استوديو النسخ الصوتي | Transcriber Studio",
  description: "منصة احترافية للتسجيل والنسخ الصوتي وإنشاء ملخصات الدروس بالذكاء الاصطناعي",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased font-arabic">
        {children}
        <Toaster position="top-left" richColors closeButton />
      </body>
    </html>
  );
}

