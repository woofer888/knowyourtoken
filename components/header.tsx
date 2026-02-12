import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold">KnowYourToken</span>
        </Link>
        
        <div className="flex flex-1 items-center justify-end space-x-4">
          <form action="/search" method="get" className="hidden md:flex w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                name="q"
                placeholder="Search tokens..."
                className="pl-9 w-full"
              />
            </div>
          </form>
          
          <nav className="flex items-center space-x-4">
            <Link href="/tokens">
              <Button variant="ghost">Browse</Button>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="sm">Admin</Button>
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}

