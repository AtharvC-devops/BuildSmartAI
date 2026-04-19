import "./globals.css";

export const metadata = {
  title: "BuildSmart AI — Intelligent Construction Management",
  description:
    "AI-powered construction management platform with smart cost prediction, time estimation, and resource allocation for builders and customers.",
  keywords: ["construction", "AI", "cost prediction", "project management", "SaaS"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
