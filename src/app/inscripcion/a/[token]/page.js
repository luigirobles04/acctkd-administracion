import { redirect } from 'next/navigation'

export default function InscripcionTokenRedirect() {
  redirect('/login')
}
