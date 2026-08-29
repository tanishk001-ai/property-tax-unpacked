import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./i18n";

export const metadata: Metadata = {
  title: "Unpacked · Property bill explainer",
  description: "An independent hackathon prototype for understandable property tax bills.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
