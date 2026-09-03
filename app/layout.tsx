import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ASTRID — Centro de operaciones",
  description:
    "Plataforma personal para administrar proyectos, tareas, agentes de IA y conversaciones operativas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Blocking, pre-hydration: sets data-theme before first paint so
            there is no flash of the wrong theme. See lib/theme.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex h-full min-h-full bg-background text-foreground">
        <ThemeProvider>
          <div className="bg-radial-glow pointer-events-none fixed inset-x-0 top-0 -z-10 h-96" />
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <Header />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
          </div>
          <MobileNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
