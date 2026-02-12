import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * Delete all migrated PumpFun tokens
 * Useful for cleaning up test data
 */
export async function DELETE(request: NextRequest) {
  try {
    // First, delete related events and gallery items (cascade delete)
    const tokensToDelete = await prisma.token.findMany({
      where: {
        migrated: true,
        isPumpFun: true,
      },
      select: {
        id: true,
      },
    })

    const tokenIds = tokensToDelete.map(t => t.id)

    // Delete related events
    await prisma.tokenEvent.deleteMany({
      where: {
        tokenId: {
          in: tokenIds,
        },
      },
    })

    // Delete related gallery items
    await prisma.tokenMedia.deleteMany({
      where: {
        tokenId: {
          in: tokenIds,
        },
      },
    })

    // Now delete all tokens that are marked as migrated and from PumpFun
    const result = await prisma.token.deleteMany({
      where: {
        migrated: true,
        isPumpFun: true,
      },
    })

    console.log(`Deleted ${result.count} migrated tokens and their related data`)

    return NextResponse.json({
      message: `Deleted ${result.count} migrated tokens`,
      deleted: result.count,
    })
  } catch (error) {
    console.error("Error deleting migrated tokens:", error)
    return NextResponse.json(
      { error: "Failed to delete migrated tokens" },
      { status: 500 }
    )
  }
}

