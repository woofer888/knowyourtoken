import { redirect } from "next/navigation"

export default function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const query = searchParams.q

  if (query) {
    redirect(`/tokens?q=${encodeURIComponent(query)}`)
  }

  redirect("/tokens")
}

