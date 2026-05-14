import "./globals.css";

// Next.js auto-detects `app/icon.svg` and emits the appropriate <link rel="icon">.
export const metadata = {
  title: "A-Box — find the best street for your business",
  description: "A-Box analyses your area and suggests the best streets to open your business.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

// Next.js 16 moved themeColor (and colorScheme) out of `metadata` into a separate
// `viewport` export. Keeping them here removes the dev-server warning.
export const viewport = {
  themeColor: "#0b1220",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
