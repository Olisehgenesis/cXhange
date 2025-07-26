import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { CandleGenerator } from '../src/services/CandleGenerator'

async function main() {
  const generator = new CandleGenerator()

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    generator.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    generator.stop()
    process.exit(0)
  })

  try {
    console.log('🚀 Starting Candle Generator Service...')
    await generator.start()
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 