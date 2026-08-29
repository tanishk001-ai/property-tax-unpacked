import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unpacked · Property bill explainer",
  description: "An independent hackathon prototype for understandable property tax bills.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
