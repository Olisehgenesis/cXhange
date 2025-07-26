import { formatEther, parseEther } from 'viem'

/**
 * Format a bigint value to a decimal string
 */
export function formatBigInt(value: bigint, decimals: number = 18): string {
  return formatEther(value)
}

/**
 * Parse a decimal string to bigint
 */
export function parseDecimal(value: string, decimals: number = 18): bigint {
  return parseEther(value)
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0
  return ((newValue - oldValue) / oldValue) * 100
}

/**
 * Round a number to specified decimal places
 */
export function roundToDecimals(value: number, decimals: number = 6): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Generate a unique timestamp for candle intervals
 */
export function getCandleTimestamp(timestamp: Date, intervalMinutes: number): Date {
  return new Date(
    Math.floor(timestamp.getTime() / (intervalMinutes * 60 * 1000)) * (intervalMinutes * 60 * 1000)
  )
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i === maxRetries - 1) throw lastError
      
      const delay = baseDelay * Math.pow(2, i)
      await sleep(delay)
    }
  }

  throw lastError!
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Validate timeframe string
 */
export function isValidTimeframe(timeframe: string): boolean {
  const validTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d']
  return validTimeframes.includes(timeframe)
} 