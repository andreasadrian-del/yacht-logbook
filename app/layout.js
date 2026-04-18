import "./globals.css"
import { TripProvider } from './TripContext'

export const metadata = {
  title: "Way Log",
  description: "GPS trip tracker for your yacht",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <TripProvider>{children}</TripProvider>
      </body>
    </html>
  )
}
