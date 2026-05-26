import { redirect } from 'next/navigation'

export default async function InscripcionRedirect({ params, searchParams }) {
  const { slug } = await params
  redirect(`/registro-academia?slug=${encodeURIComponent(slug)}`)
}
