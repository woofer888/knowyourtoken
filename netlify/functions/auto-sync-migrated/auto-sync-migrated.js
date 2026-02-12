// Netlify Scheduled Function to auto-sync migrated tokens
// Runs every minute to check for new migrated tokens

exports.handler = async (event, context) => {
  try {
    // Get the site URL - use the production URL for scheduled functions
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL
    
    if (!baseUrl) {
      throw new Error("URL environment variable not set")
    }
    
    console.log(`Auto-sync triggered at ${new Date().toISOString()}`)
    
    const response = await fetch(`${baseUrl}/api/migrated-tokens/auto-sync`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Auto-sync failed: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json()
    
    console.log(`Auto-sync completed: ${data.imported} imported, ${data.errors} errors`)
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Auto-sync triggered successfully",
        result: data,
        timestamp: new Date().toISOString(),
      }),
    }
  } catch (error) {
    console.error("Error in scheduled function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to trigger auto-sync",
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    }
  }
}

