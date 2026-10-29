import type { Metadata } from "next";

// Link-preview tags for one page. A page that sets its own openGraph replaces the
// layout's, so the preview image (app/opengraph-image.tsx) has to be named again here.
export function shareTags(title: string, description: string, path: string): Pick<Metadata, "openGraph" | "twitter"> {
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: "Unpacked: know what your property tax bill is made of" };
  return {
    openGraph: { title, description, url: path, siteName: "Unpacked", type: "website", images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}
