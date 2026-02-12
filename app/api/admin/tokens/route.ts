import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      symbol,
      slug,
      description,
      contractAddress,
      chain,
      twitterUrl,
      telegramUrl,
      websiteUrl,
      logoUrl,
    } = body

    // Validate required fields
    if (!name || !symbol || !slug || !contractAddress || !chain) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if slug already exists
    const existing = await prisma.token.findUnique({
      where: { slug },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Token with this slug already exists" },
        { status: 400 }
      )
    }

    // Create token
    const token = await prisma.token.create({
      data: {
        name,
        symbol,
        slug,
        description: description || null,
        contractAddress,
        chain,
        twitterUrl: twitterUrl || null,
        telegramUrl: telegramUrl || null,
        websiteUrl: websiteUrl || null,
        logoUrl: logoUrl || null,
        published: false, // Start as draft
      },
    })

    return NextResponse.json(token, { status: 201 })
  } catch (error) {
    console.error("Error creating token:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

