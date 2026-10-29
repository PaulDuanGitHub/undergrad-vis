import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Roboto_Serif } from "next/font/google";
import { GoogleAnalytics } from '@next/third-parties/google'
import "./globals.css";

/** Canonical origin, including the GitHub Pages project path. */
const SITE_URL = "https://paulduangithub.github.io/undergrad-vis/";
const SITE_TITLE = "Productivity (2021–2026) | Paul Duan";
const SITE_DESCRIPTION =
  "A 3D data story of 567 workfiles, 34 courses and five years of undergraduate study (Fall 2021 – Winter 2026), read from OneDrive version history.";
const OG_IMAGE_ALT =
  "Productivity (2021–2026): 567 workfiles, 34 courses, five years of undergraduate study.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoSerif = Roboto_Serif({
  variable: "--font-roboto-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // The site is served from a GitHub Pages project path, so every relative
  // asset URL in the metadata (OG image, canonical) resolves through this.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  authors: [{ name: "Paul Duan", url: "https://www.xianzhaoduan.com" }],
  creator: "Paul Duan",
  keywords: [
    "data visualization",
    "undergraduate",
    "OneDrive version history",
    "Three.js",
    "D3",
    "personal data",
    "productivity",
  ],
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    url: "./",
    siteName: SITE_TITLE,
    locale: "en_CA",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // A committed 1600×1200 PNG rather than a generated metadata route: the
    // GitHub Pages host serves extensionless files as octet-stream, which the
    // social crawlers refuse. It doubles as the Awwwards submission thumbnail.
    images: [{ url: "./og.png", width: 1600, height: 1200, alt: OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["./og.png"],
  },
};

// `viewportFit: "cover"` lets the full-screen mobile views use the notch /
// home-indicator safe areas via env(safe-area-inset-*). `colorScheme` keeps
// native UI light even when the OS is dark: the design has no dark variant.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#F9F9F8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${robotoSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      { process.env.NODE_ENV === 'production' && <GoogleAnalytics gaId="G-KNPEXFEH64" /> }
    </html>
  );
}
