import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { I18nProvider } from "./i18n";
import { SessionProvider } from "./session";

// Absolute links in the link-preview tags: the live site in production, this
// deployment's own address otherwise (so previews and local builds point at themselves).
const origin = process.env.VERCEL_ENV === "production"
  ? "https://property-tax-unpacked.vercel.app"
  : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";

const title = "Unpacked · Property bill explainer";
const description = "An independent hackathon prototype for understandable property tax bills.";

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title,
  description,
  openGraph: { title, description, url: "/", siteName: "Unpacked", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <SessionProvider>{children}</SessionProvider>
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
