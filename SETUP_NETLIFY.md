# Netlify Deployment Setup Guide

## Database Setup (Required)

This app uses PostgreSQL for production. Here's the easiest way to set it up:

### Option 1: Supabase (Recommended - Free & Easy)

1. **Create a Supabase account:**
   - Go to https://supabase.com
   - Sign up for free
   - Create a new project

2. **Get your database URL:**
   - Go to your project → Settings → Database
   - Find "Connection string" → "URI"
   - Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`)

3. **Set up in Netlify:**
   - Go to your Netlify site → Site settings → Environment variables
   - Add: `DATABASE_URL` = your Supabase connection string

4. **Push the database schema:**
   - Run locally: `npx prisma db push` (it will use the DATABASE_URL from Netlify if set)
   - Or add to Netlify build command: `npx prisma generate && npx prisma db push && npm run build`

5. **Seed the database:**
   - Run: `npm run db:seed`

### Option 2: Neon (Alternative - Also Free)

1. Go to https://neon.tech
2. Create a free account and project
3. Copy the connection string
4. Follow steps 3-5 from Option 1

## Build Settings in Netlify

Make sure your build command is:
```
npm run build
```

The `prebuild` script will automatically run `prisma generate` before building.

## Environment Variables

Required in Netlify:
- `DATABASE_URL` - Your PostgreSQL connection string

That's it! After setting up the database and environment variable, your site should work.

