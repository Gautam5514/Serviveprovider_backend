import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://servicemarket.example.com"),
  title: {
    default: "ServiceMarket — Expert Home Services at Your Doorstep",
    template: "%s | ServiceMarket",
  },
  description: "Book verified AC technicians, electricians, and home appliance experts in minutes. Transparent pricing, no surprises.",
  keywords: ["home services", "AC repair", "electrician", "plumber", "cleaning", "home maintenance"],
  authors: [{ name: "ServiceMarket" }],
  openGraph: {
    title: "ServiceMarket — Expert Home Services",
    description: "Book verified AC technicians, electricians, and home appliance experts in minutes.",
    url: "https://servicemarket.example.com",
    siteName: "ServiceMarket",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ServiceMarket — Expert Home Services",
    description: "Book verified AC technicians, electricians, and home appliance experts in minutes.",
    images: ["/icon.png"],
  },
  themeColor: "#000000",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
