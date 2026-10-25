import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SKYGUARD — Eyes on Earth | Satellite Active-Fire Monitoring",
  description:
    "Real-time satellite-powered wildfire monitoring prototype, explainable environmental risk heuristics, and spatial clustering using NASA FIRMS and Open-Meteo telemetry.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
