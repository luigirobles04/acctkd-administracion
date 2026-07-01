/** Contenido estático por defecto del landing FestCup (editable vía CMS en /admin/landing). */

export const FESTCUP_STATS = [
  { value: '4+', label: 'Ediciones en Trujillo', suffix: '' },
  { value: '500', label: 'Competidores por evento', suffix: '+' },
  { value: '50', label: 'Academias participantes', suffix: '+' },
  { value: '3', label: 'Áreas simultáneas', suffix: '' },
]

export const FESTCUP_EDICIONES = [
  {
    year: '2026',
    title: 'Taekwondo FestCup 2026',
    subtitle: 'La edición más grande · Trujillo',
    desc: 'Poomsae, Kyorugi y Free Style con tecnología OVR en tiempo real, inscripción digital y credenciales oficiales.',
    imagen: '/landing/festcup-2026-flyer.png',
    highlight: true,
    tag: 'Inscripciones abiertas',
  },
  {
    year: '2025',
    title: 'FestCup 2025',
    subtitle: 'Uniendo campeones del norte',
    desc: 'Más de 450 competidores de academias de todo el país compitiendo bajo reglamento World Taekwondo.',
    imagen: '/landing/campeonato-trujillo.png',
    highlight: false,
    tag: 'Edición 2025',
  },
  {
    year: '2024',
    title: 'FestCup 2024',
    subtitle: 'Credenciales digitales · WT',
    desc: 'Primera edición con credenciales QR, pesaje digital y llaves automáticas por categoría.',
    imagen: '/landing/festcup-2024-credencial.png',
    highlight: false,
    tag: 'Edición 2024',
  },
  {
    year: '2023',
    title: 'FestCup 2023',
    subtitle: 'Crecimiento del movimiento',
    desc: 'Consolidamos Trujillo como sede del taekwondo competitivo del norte del Perú.',
    imagen: '/landing/campeonato-trujillo.png',
    highlight: false,
    tag: 'Edición 2023',
  },
  {
    year: '2022',
    title: 'FestCup 2022',
    subtitle: 'Donde empezó todo',
    desc: 'El primer FestCup de la Academia Christopher Cabrera — el origen de una marca que hoy reúne a cientos de atletas.',
    imagen: '/landing/sponsors.png',
    highlight: false,
    tag: 'Edición inaugural',
  },
]

export const FESTCUP_GALERIA = [
  { src: '/landing/festcup-2026-flyer.png', alt: 'Flyer Taekwondo FestCup 2026', caption: 'FestCup 2026' },
  { src: '/landing/festcup-2024-credencial.png', alt: 'Credencial oficial FestCup 2024', caption: 'Credenciales WT' },
  { src: '/landing/campeonato-trujillo.png', alt: 'Campeonato en Trujillo', caption: 'Trujillo · Perú' },
  { src: '/landing/sponsors.png', alt: 'Patrocinadores FestCup', caption: 'Patrocinadores' },
  { src: '/branding/academia-logo.png', alt: 'Academia Christopher Cabrera', caption: 'ACCTKD' },
  { src: '/branding/wt-logo.png', alt: 'World Taekwondo', caption: 'World Taekwondo' },
]

export const FESTCUP_RAZONES = [
  {
    ic: '🏆',
    title: 'Marca reconocida en el norte',
    text: 'FestCup es el campeonato insignia de la Academia Christopher Cabrera — años formando campeones en Trujillo.',
  },
  {
    ic: '⚡',
    title: 'Todo en un solo sistema',
    text: 'Inscripción, pesaje, llaves, combates en vivo y podios conectados. Sin planillas, sin errores, sin esperas.',
  },
  {
    ic: '🥋',
    title: 'Reglamento World Taekwondo',
    text: 'Categorías oficiales, pesaje certificado, brackets CNU y credenciales con QR para cada competidor.',
  },
  {
    ic: '📱',
    title: 'Inscripción fácil para academias',
    text: 'Tu academia registra plantel, sube fotos, paga en línea y recibe dorsales automáticos desde el portal.',
  },
]
