// Netlify Scheduled Function to auto-sync migrated tokens
// Runs every 10 minutes

exports.handler = async (event, context) => {
  try {
    const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888'
    const response = await fetch(`${baseUrl}/api/migrated-tokens/auto-sync`)
    
    if (!response.ok) {
      throw new Error(`Auto-sync failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Auto-sync triggered successfully",
        result: data,
      }),
    }
  } catch (error) {
    console.error("Error in scheduled function:", error)
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to trigger auto-sync",
        message: error.message,
      }),
    }
  }
}

