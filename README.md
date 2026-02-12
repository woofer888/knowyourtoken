# KnowYourToken

A searchable encyclopedia for meme tokens, inspired by KnowYourMeme. Learn about token lore, origin stories, and community narratives.

## Features

- 🪙 Token encyclopedia with detailed information
- 🔍 Search and filter tokens by name, symbol, or chain
- 📖 Token pages with lore, origin stories, timelines, and galleries
- 🛠️ Admin dashboard for managing tokens
- 🎨 Clean, minimal UI with modern crypto-native design
- 🔗 Social links and contract addresses
- 📊 Market data placeholders (ready for integration)

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **ShadCN UI**
- **Prisma** + **PostgreSQL**
- **Lucide Icons**

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up your environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your PostgreSQL connection string:
```
DATABASE_URL="postgresql://user:password@localhost:5432/knowyourtoken?schema=public"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── token/[slug]/      # Dynamic token pages
│   ├── tokens/             # Token listing page
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # ShadCN UI components
│   └── ...               # Custom components
├── lib/                   # Utilities and Prisma client
├── prisma/                # Prisma schema and seed
└── public/                # Static assets
```

## Database Schema

The project uses Prisma with PostgreSQL. Key models:

- **Token**: Main token information
- **TokenEvent**: Timeline events for tokens
- **TokenMedia**: Gallery images/videos

## Admin Features

Access the admin dashboard at `/admin` to:
- Create new tokens
- Edit existing tokens
- Manage token events and gallery items
- Publish/unpublish tokens

## Future Features

- User submissions
- Token voting system
- Comment system
- User authentication
- Real-time market data integration
- Token comparison tools

## License

MIT

