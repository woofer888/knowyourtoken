import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container flex flex-col items-center justify-center py-24">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Token not found</p>
      <Link href="/">
        <Button>Go Home</Button>
      </Link>
    </div>
  )
}

