import "./globals.css";

export const metadata = {
  title: "Yacht Logbook",
  description: "GPS trip tracker for your yacht",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
