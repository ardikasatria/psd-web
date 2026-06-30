import { redirect } from 'next/navigation'

/** Redirect lama `/support` → dasbor pengguna */
export default function SupportRedirectPage() {
  redirect('/dashboard/support')
}
