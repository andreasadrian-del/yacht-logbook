import "./globals.css"
import { TripProvider } from './TripContext'
import PWAInit from './PWAInit'

export const metadata = {
  title: "Logbook Nadira",
  description: "GPS sailing logbook for yacht Nadira",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Nadira",
  },
}

export const viewport = {
  themeColor: "#1a3a6b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-full antialiased">
        <TripProvider>{children}</TripProvider>
        <PWAInit />
      </body>
    </html>
  )
}
