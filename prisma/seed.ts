import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.tokenMedia.deleteMany()
  await prisma.tokenEvent.deleteMany()
  await prisma.token.deleteMany()

  // Create mock tokens
  const bonk = await prisma.token.create({
    data: {
      slug: 'bonk',
      name: 'Bonk',
      symbol: 'BONK',
      description: 'The first Solana dog coin for the people, by the people. Bonk is a community-driven meme token that took Solana by storm.',
      lore: 'Bonk emerged as a response to the Solana ecosystem\'s need for a true community token. The narrative centers around a Shiba Inu that "bonks" the Solana blockchain, bringing fun and community spirit back to the network after the FTX collapse.',
      originStory: 'Launched in December 2022, Bonk was airdropped to Solana NFT holders, DeFi users, and developers as a way to revitalize the Solana ecosystem. The token quickly gained traction on social media, particularly Twitter/X, where the "bonk" meme became synonymous with Solana\'s comeback.',
      contractAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      chain: 'Solana',
      twitterUrl: 'https://twitter.com/bonk_inu',
      telegramUrl: 'https://t.me/bonk_inu',
      websiteUrl: 'https://bonkcoin.com',
      launchDate: new Date('2022-12-25'),
      launchPrice: 0.0000001,
      currentPrice: 0.000012,
      marketCap: 800000000,
      volume24h: 50000000,
      sentiment: 'Bullish',
      logoUrl: 'https://static.coinpaprika.com/coin/bonk-bonk/logo.png',
      published: true,
      events: {
        create: [
          {
            title: 'Token Launch',
            description: 'Bonk token launched and airdropped to Solana community',
            date: new Date('2022-12-25'),
            type: 'Launch',
          },
          {
            title: 'Major Exchange Listing',
            description: 'Listed on Binance and other major exchanges',
            date: new Date('2023-01-05'),
            type: 'Partnership',
          },
          {
            title: 'Solana Mobile Partnership',
            description: 'Announced integration with Solana Mobile Saga phone',
            date: new Date('2023-04-12'),
            type: 'Partnership',
          },
        ],
      },
      gallery: {
        create: [
          {
            url: 'https://via.placeholder.com/800x600?text=Bonk+Meme+1',
            type: 'image',
            caption: 'Classic Bonk meme',
          },
          {
            url: 'https://via.placeholder.com/800x600?text=Bonk+Meme+2',
            type: 'image',
            caption: 'Bonk community art',
          },
        ],
      },
    },
  })

  const pepe = await prisma.token.create({
    data: {
      slug: 'pepe',
      name: 'Pepe',
      symbol: 'PEPE',
      description: 'The most memeable memecoin in existence. The dogs have had their day, it\'s time for Pepe to take reign.',
      lore: 'Pepe the Frog has been an internet icon for over a decade. The PEPE token brings this beloved meme to the blockchain, creating a community around one of the most recognizable memes in crypto history.',
      originStory: 'Launched on Ethereum in April 2023, PEPE quickly became one of the fastest-growing meme tokens. The project has no roadmap, no utility - just pure meme power and community vibes.',
      contractAddress: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      chain: 'Ethereum',
      twitterUrl: 'https://twitter.com/pepecoineth',
      telegramUrl: 'https://t.me/pepecoineth',
      websiteUrl: 'https://pepe.vip',
      launchDate: new Date('2023-04-14'),
      launchPrice: 0.00000001,
      currentPrice: 0.0000012,
      marketCap: 500000000,
      volume24h: 30000000,
      sentiment: 'Neutral',
      logoUrl: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg',
      published: true,
      events: {
        create: [
          {
            title: 'Token Launch',
            description: 'PEPE token launched on Ethereum',
            date: new Date('2023-04-14'),
            type: 'Launch',
          },
          {
            title: 'Binance Listing',
            description: 'PEPE listed on Binance, causing massive price surge',
            date: new Date('2023-05-01'),
            type: 'Partnership',
          },
        ],
      },
      gallery: {
        create: [
          {
            url: 'https://via.placeholder.com/800x600?text=Pepe+Meme+1',
            type: 'image',
            caption: 'Classic Pepe',
          },
        ],
      },
    },
  })

  const dogwifhat = await prisma.token.create({
    data: {
      slug: 'dogwifhat',
      name: 'dogwifhat',
      symbol: 'WIF',
      description: 'A dog wif a hat. That\'s it. That\'s the token.',
      lore: 'Sometimes the simplest memes are the most powerful. A photo of a Shiba Inu wearing a pink knitted hat became the symbol of a new Solana meme token movement.',
      originStory: 'Launched in November 2023, dogwifhat (WIF) started as a simple meme but quickly gained traction in the Solana community. The token represents the absurdist humor that defines the best meme coins.',
      contractAddress: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
      chain: 'Solana',
      twitterUrl: 'https://twitter.com/dogwifcoin',
      telegramUrl: 'https://t.me/dogwifcoin',
      websiteUrl: 'https://dogwifcoin.org',
      launchDate: new Date('2023-11-20'),
      launchPrice: 0.0001,
      currentPrice: 2.5,
      marketCap: 2500000000,
      volume24h: 150000000,
      sentiment: 'Bullish',
      logoUrl: 'https://cryptologos.cc/logos/dogwifhat-wif-logo.png',
      published: true,
      events: {
        create: [
          {
            title: 'Token Launch',
            description: 'WIF token launched on Solana',
            date: new Date('2023-11-20'),
            type: 'Launch',
          },
          {
            title: 'Las Vegas Sphere Campaign',
            description: 'Community raised funds to put WIF on the Las Vegas Sphere',
            date: new Date('2024-01-15'),
            type: 'Community',
          },
        ],
      },
      gallery: {
        create: [
          {
            url: 'https://via.placeholder.com/800x600?text=Dog+Wif+Hat',
            type: 'image',
            caption: 'The original dog wif hat',
          },
        ],
      },
    },
  })

  console.log('Seeded database with:', { bonk, pepe, dogwifhat })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

