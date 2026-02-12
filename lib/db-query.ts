// Utility functions for database queries with proper error handling and connection management

import { prisma } from './prisma'

/**
 * Execute a database query with automatic retry and connection management
 */
export async function executeQuery<T>(
  queryFn: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError: Error | null = null

  for (let i = 0; i <= retries; i++) {
    try {
      return await queryFn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // If it's a connection pool error, wait before retrying
      if (
        lastError.message.includes('MaxClientsInSessionMode') ||
        lastError.message.includes('max clients reached') ||
        lastError.message.includes('connection')
      ) {
        if (i < retries) {
          // Wait with exponential backoff
          await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)))
          continue
        }
      }
      
      // For other errors, throw immediately
      throw lastError
    }
  }

  throw lastError || new Error('Query failed after retries')
}

