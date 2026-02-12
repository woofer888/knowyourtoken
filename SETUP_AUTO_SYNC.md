# Auto-Sync Setup Guide

## How Auto-Sync Works

The system automatically checks for new migrated tokens and imports them.

### On Localhost (Development)
- Auto-sync runs when you visit the `/migrated` page
- It checks every minute while you're on that page
- For true background syncing, you need to deploy to Netlify

### On Netlify (Production)
- Auto-sync runs automatically every minute in the background
- No page visit needed - it runs as a scheduled function
- Imports all new tokens that migrated since the last check

## Setting Up Auto-Sync on Netlify

### Option 1: Netlify Scheduled Functions (Recommended)

1. **Deploy your site to Netlify** (if not already deployed)

2. **Configure the scheduled function:**
   - Go to your Netlify dashboard
   - Navigate to: **Site settings** → **Functions** → **Scheduled Functions**
   - Click **"Add scheduled function"**
   - Configure:
     - **Function name:** `auto-sync-migrated`
     - **Schedule:** `*/1 * * * *` (every minute)
     - **Function path:** `netlify/functions/auto-sync-migrated`

3. **Verify it's working:**
   - Go to **Functions** → **Function logs**
   - You should see logs every minute showing the sync results

### Option 2: External Cron Service (Alternative)

If Netlify scheduled functions don't work, you can use an external service:

1. **Use a free cron service** like:
   - https://cron-job.org
   - https://www.easycron.com
   - https://cronitor.io

2. **Set up the cron job:**
   - URL: `https://your-site.netlify.app/api/migrated-tokens/auto-sync`
   - Schedule: Every 1 minute
   - Method: GET

3. **Test it:**
   - The endpoint will return JSON with import results
   - Check your database to see if new tokens are being imported

## Testing Auto-Sync

### Test on Localhost:
1. Visit `http://localhost:3000/migrated`
2. Open browser console (F12)
3. You should see logs every minute showing sync results

### Test on Netlify:
1. Wait for a token to migrate on PumpFun
2. Check your database/admin panel after 1-2 minutes
3. The new token should appear automatically (as unpublished/draft)

## How It Works

1. **Every minute**, the system:
   - Fetches all graduated tokens from PumpFun API
   - Checks the last migration date in your database
   - Imports only tokens that migrated since the last check
   - Imports them as **unpublished** (drafts) for you to review

2. **You can then:**
   - Go to Admin Dashboard
   - Review the imported tokens
   - Publish the ones you want to show publicly

## Troubleshooting

### Auto-sync not working on Netlify?
- Check Function logs in Netlify dashboard
- Verify the scheduled function is configured
- Check that `DATABASE_URL` environment variable is set
- Look for errors in the function logs

### Too many tokens being imported?
- The system only imports tokens that migrated since the last check
- If you see old tokens, it means they weren't in the database before
- You can delete all migrated tokens and let it re-sync from scratch

### Want to stop auto-sync?
- Go to Netlify → Functions → Scheduled Functions
- Delete or disable the scheduled function

