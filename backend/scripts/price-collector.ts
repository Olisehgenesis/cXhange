import { config as dotEnvConfig } from 'dotenv'
dotEnvConfig()

import { PriceCollector } from '../src/services/PriceCollector'

async function main() {
  const collector = new PriceCollector()

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    collector.stop()
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    collector.stop()
    process.exit(0)
  })

  try {
    console.log('🚀 Starting Price Collector Service...')
    await collector.initialize()
    await collector.start()
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
} 