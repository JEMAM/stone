import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Stone | ITSM Preditivo & IA Agêntica",
  description:
    "Plataforma Stone de orquestração ITSM com métricas DORA em tempo real, resolução Zero-Touch e IA Agêntica para operações de varejo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased h-screen overflow-hidden bg-surface-dark">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="ml-64 flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 p-5 overflow-y-auto">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
