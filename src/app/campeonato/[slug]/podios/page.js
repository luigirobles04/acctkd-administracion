import { redirect } from 'next/navigation'

/** Los podios viven en resultados completos (medallero + kyorugi + poomsae). */
export default async function PodiosPublicosPage({ params }) {
  const { slug } = await params
  redirect(`/campeonato/${slug}/resultados`)
}
