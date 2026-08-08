import './globals.css'
import { PRODUCTION_SITE_URL, SITE_NAME, SITE_DESCRIPTION } from '@/lib/site-config'

const siteUrl = PRODUCTION_SITE_URL

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: '%s · FestCup ACCTKD',
  },
  description: SITE_DESCRIPTION,
  applicationName: 'FestCup ACCTKD',
  manifest: '/manifest.json',
  keywords: [
    'FestCup',
    'taekwondo',
    'Trujillo',
    'Perú',
    'ACCTKD',
    'campeonato taekwondo',
    'kyorugi',
    'poomsae',
    'inscripción academias',
    'Christopher Cabrera',
  ],
  authors: [{ name: 'ACCTKD · Academia Christopher Cabrera' }],
  creator: 'ACCTKD',
  openGraph: {
    type: 'website',
    locale: 'es_PE',
    url: siteUrl,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [{ url: '/branding/festcup-2026-flyer.png', width: 1200, height: 630, alt: 'FestCup 2026 ACCTKD' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ['/branding/festcup-2026-flyer.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  alternates: {
    canonical: siteUrl,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'FestCup',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0d0f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
