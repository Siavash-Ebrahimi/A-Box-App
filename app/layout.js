import "./globals.css";

// Next.js auto-detects `app/icon.svg` and emits the appropriate <link rel="icon">.
// We also declare it explicitly here so the apple-touch-icon and theme color are set.
export const metadata = {
  title: "A-Box — find the best street for your business",
  description: "A-Box analyses your area and suggests the best streets to open your business.",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
    shortcut: "/icon.svg",
  },
  themeColor: "#0b1220",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
