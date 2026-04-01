import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ZAMOTOMOTO TV — Media Operations',
  description: 'Internal Media Operations Management System — ZMM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#0A0A0A', color: '#FFFFFF', fontFamily: "'IBM Plex Mono', monospace" }}>
        {children}
      </body>
    </html>
  )
}
