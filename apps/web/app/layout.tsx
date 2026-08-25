import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono, Jost } from "next/font/google";
import { Providers } from "@/components/providers";
import { SWRegister } from "@/components/sw-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbmono" });
const jost = Jost({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-jost" });

export const metadata: Metadata = {
  title: "repo2nb: any repo, one notebook",
  description:
    "Turn a project folder into a GPU-ready Kaggle or Colab notebook. Nothing leaves your browser until you choose a folder.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable} ${jost.variable}`}>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SWRegister />
      </body>
    </html>
  );
}
