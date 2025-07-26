import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Plus,
  X,
  Settings
} from "lucide-react"

export function MultiChart() {
  const [selectedTokens, setSelectedTokens] = React.useState([
    { symbol: "cUSD", color: "#FFD700", enabled: true },
    { symbol: "cEUR", color: "#32CD32", enabled: true },
    { symbol: "cREAL", color: "#FF6B6B", enabled: true },
  ])

  const availableTokens = [
    { symbol: "cUSD", name: "Celo Dollar" },
    { symbol: "cEUR", name: "Celo Euro" },
    { symbol: "cREAL", name: "Celo Real" },
    { symbol: "CELO", name: "Celo Native" },
    { symbol: "USDC", name: "USD Coin" },
    { symbol: "USDT", name: "Tether" },
  ]

  const toggleToken = (symbol: string) => {
    setSelectedTokens(prev => 
      prev.map(token => 
        token.symbol === symbol 
          ? { ...token, enabled: !token.enabled }
          : token
      )
    )
  }

  const addToken = (token: { symbol: string, name: string }) => {
    if (!selectedTokens.find(t => t.symbol === token.symbol)) {
      const colors = ["#FFD700", "#32CD32", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]
      const color = colors[selectedTokens.length % colors.length]
      setSelectedTokens(prev => [...prev, { symbol: token.symbol, color, enabled: true }])
    }
  }

  // Generate test data using sine, cosine, and quadratic functions
  const generateTestData = (basePrice: number, volatility: number, offset: number) => {
    const data = []
    for (let i = 0; i < 100; i++) {
      const x = i / 10
      const sine = Math.sin(x + offset) * volatility
      const cosine = Math.cos(x + offset) * volatility * 0.5
      const quadratic = (x * x * 0.1) * volatility
      const price = basePrice + sine + cosine + quadratic
      data.push({ x: i, y: Math.max(0, price) })
    }
    return data
  }

  const chartData = {
    cUSD: generateTestData(1.0, 0.05, 0),
    cEUR: generateTestData(0.85, 0.08, 1.5),
    cREAL: generateTestData(5.2, 0.12, 3),
    CELO: generateTestData(0.65, 0.15, 0.5),
    USDC: generateTestData(1.0, 0.02, 2),
    USDT: generateTestData(1.0, 0.03, 1),
  }

  return (
    <div className="space-y-6 mobile-optimized">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">MultiChart</h1>
          <p className="text-gray-600 mobile-text font-semibold">Compare multiple tokens on a single chart</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-bold">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button variant="celo" size="sm" className="font-bold">
            Export Data
          </Button>
        </div>
      </div>

      {/* Token Selector */}
      <Card className="cool-card">
        <CardHeader>
          <CardTitle className="font-black">Token Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Selected Tokens */}
            <div className="flex flex-wrap gap-2">
              {selectedTokens.map((token) => (
                <Badge
                  key={token.symbol}
                  variant={token.enabled ? "default" : "secondary"}
                  className="cursor-pointer font-bold flex items-center gap-2"
                  onClick={() => toggleToken(token.symbol)}
                  style={{ backgroundColor: token.enabled ? token.color : undefined }}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: token.color }}
                  />
                  {token.symbol}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
            </div>

            {/* Add Token Dropdown */}
            <div className="flex gap-2">
              <Input
                placeholder="Search tokens..."
                className="font-medium"
              />
              <Button variant="outline" size="sm" className="font-bold">
                <Plus className="mr-2 h-4 w-4" />
                Add Token
              </Button>
            </div>

            {/* Available Tokens */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              {availableTokens.map((token) => (
                <Button
                  key={token.symbol}
                  variant="outline"
                  size="sm"
                  className="font-bold text-xs"
                  onClick={() => addToken(token)}
                  disabled={!!selectedTokens.find(t => t.symbol === token.symbol)}
                >
                  {token.symbol}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card className="cool-card">
        <CardHeader>
          <CardTitle className="font-black">Price Comparison Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-black text-gray-600 mb-2">Interactive Chart</h3>
              <p className="text-gray-500 font-semibold mb-4">
                Chart showing {selectedTokens.filter(t => t.enabled).length} tokens
              </p>
              
              {/* Chart Legend */}
              <div className="flex flex-wrap justify-center gap-4">
                {selectedTokens.filter(t => t.enabled).map((token) => (
                  <div key={token.symbol} className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: token.color }}
                    />
                    <span className="font-bold text-sm">{token.symbol}</span>
                    <span className="text-xs text-gray-500 font-semibold">
                      ${chartData[token.symbol as keyof typeof chartData]?.[99]?.y.toFixed(4) || "0.0000"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-xs text-gray-400 font-medium">
                Test data generated using sine, cosine, and quadratic functions
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Token Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedTokens.filter(t => t.enabled).map((token) => {
          const data = chartData[token.symbol as keyof typeof chartData]
          const currentPrice = data?.[99]?.y || 0
          const startPrice = data?.[0]?.y || 0
          const change = ((currentPrice - startPrice) / startPrice) * 100
          
          return (
            <Card key={token.symbol} className="cool-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: token.color }}
                    />
                    <span className="font-black">{token.symbol}</span>
                  </div>
                  <Badge 
                    variant={change >= 0 ? "default" : "destructive"}
                    className="text-xs font-black"
                  >
                    {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                  </Badge>
                </div>
                <div className="text-xl font-black text-gray-900">
                  ${currentPrice.toFixed(4)}
                </div>
                <div className="text-sm text-gray-500 font-semibold">
                  Vol: ${(Math.random() * 1000000).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 