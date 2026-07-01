import LandingPage from '@/components/landing/LandingPage'

export const metadata = {
  title: 'Taekwondo FestCup · ACCTKD — Academia Christopher Cabrera',
  description:
    'El evento más importante de la Academia Christopher Cabrera Taekwondo en Trujillo. Poomsae, Kyorugi y Free Style con inscripción, pesaje, llaves y resultados en vivo.',
  openGraph: {
    title: 'Taekwondo FestCup 2026 · ACCTKD',
    description: 'Inscríbete, consulta resultados, descarga llaves y sigue las peleas en vivo.',
    images: ['/branding/festcup-2026-flyer.png'],
  },
}

export default function Home() {
  return <LandingPage />
}
