import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await prisma.token.findUnique({
      where: { id: params.id },
    })

    if (!token) {
      return NextResponse.json(
        { message: "Token not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(token)
  } catch (error) {
    console.error("Error fetching token:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      name,
      symbol,
      slug,
      description,
      lore,
      originStory,
      contractAddress,
      chain,
      twitterUrl,
      telegramUrl,
      websiteUrl,
      logoUrl,
      launchDate,
      launchPrice,
      currentPrice,
      marketCap,
      volume24h,
      sentiment,
      published,
    } = body

    // Check if token exists
    const existing = await prisma.token.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { message: "Token not found" },
        { status: 404 }
      )
    }

    // Check if slug is being changed and if new slug already exists
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.token.findUnique({
        where: { slug },
      })

      if (slugExists) {
        return NextResponse.json(
          { message: "Token with this slug already exists" },
          { status: 400 }
        )
      }
    }

    // Update token
    const token = await prisma.token.update({
      where: { id: params.id },
      data: {
        name,
        symbol,
        slug,
        description: description || null,
        lore: lore || null,
        originStory: originStory || null,
        contractAddress,
        chain,
        twitterUrl: twitterUrl || null,
        telegramUrl: telegramUrl || null,
        websiteUrl: websiteUrl || null,
        logoUrl: logoUrl || null,
        launchDate: launchDate ? new Date(launchDate) : null,
        launchPrice: launchPrice || null,
        currentPrice: currentPrice || null,
        marketCap: marketCap || null,
        volume24h: volume24h || null,
        sentiment: sentiment || null,
        published: published || false,
      },
    })

    return NextResponse.json(token)
  } catch (error) {
    console.error("Error updating token:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

