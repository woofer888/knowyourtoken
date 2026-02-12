import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

/**
 * Delete all migrated PumpFun tokens
 * Useful for cleaning up test data
 */
export async function DELETE(request: NextRequest) {
  try {
    // Delete all tokens that are marked as migrated and from PumpFun
    const result = await prisma.token.deleteMany({
      where: {
        migrated: true,
        isPumpFun: true,
      },
    })

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

