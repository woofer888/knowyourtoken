import { prisma } from "@/lib/prisma"
import { AdminTokenList } from "@/components/admin-token-list"
import { Button } from "@/components/ui/button"
import { SyncMigratedButton } from "@/components/sync-migrated-button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { executeQuery } from "@/lib/db-query"

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const tokens = await executeQuery(() =>
    prisma.token.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            events: true,
            gallery: true,
          },
        },
      },
    })
  )

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage tokens, events, and gallery items
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <SyncMigratedButton />
          <Link href="/admin/migrated-import">
            <Button variant="outline">
              Import by Address
            </Button>
          </Link>
          <Link href="/admin/tokens/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Token
            </Button>
          </Link>
        </div>
      </div>

      <AdminTokenList tokens={tokens} />
    </div>
  )
}

