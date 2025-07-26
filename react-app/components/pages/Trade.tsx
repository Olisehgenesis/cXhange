import React, { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Clock, 
  DollarSign,
  BarChart3,
  Settings,
  RefreshCw,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus
} from "lucide-react"

export function Trade() {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy")
  const [selectedPair, setSelectedPair] = useState("CELO/cUSD")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("1.18")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [slippage, setSlippage] = useState("0.5")
  const [timeInForce, setTimeInForce] = useState("GTC")

  // Mock data for charts and trading
  const [priceHistory, setPriceHistory] = useState<Array<{time: number, price: number}>>([])
  const [orderBook, setOrderBook] = useState({
    bids: [
      { price: 1.179, amount: 1250.5, total: 1474.5 },
      { price: 1.178, amount: 890.2, total: 1048.7 },
      { price: 1.177, amount: 2100.0, total: 2471.7 },
      { price: 1.176, amount: 750.8, total: 882.9 },
      { price: 1.175, amount: 3200.0, total: 3760.0 },
    ],
    asks: [
      { price: 1.181, amount: 980.5, total: 1158.9 },
      { price: 1.182, amount: 1500.0, total: 1773.0 },
      { price: 1.183, amount: 2200.0, total: 2602.6 },
      { price: 1.184, amount: 1100.0, total: 1302.4 },
      { price: 1.185, amount: 2800.0, total: 3318.0 },
    ]
  })

  const [recentTrades, setRecentTrades] = useState([
    { time: "14:32:15", price: 1.180, amount: 125.5, type: "buy" },
    { time: "14:31:42", price: 1.179, amount: 89.2, type: "sell" },
    { time: "14:31:18", price: 1.181, amount: 210.0, type: "buy" },
    { time: "14:30:55", price: 1.178, amount: 75.8, type: "sell" },
    { time: "14:30:32", price: 1.182, amount: 320.0, type: "buy" },
    { time: "14:30:08", price: 1.177, amount: 98.5, type: "sell" },
    { time: "14:29:45", price: 1.180, amount: 150.0, type: "buy" },
    { time: "14:29:22", price: 1.179, amount: 220.0, type: "sell" },
  ])

  const tradingPairs = [
    { pair: "CELO/cUSD", base: "CELO", quote: "cUSD", price: 1.18, change: 2.5 },
    { pair: "CELO/cEUR", base: "CELO", quote: "cEUR", price: 1.28, change: -1.2 },
    { pair: "cUSD/cEUR", base: "cUSD", quote: "cEUR", price: 0.92, change: 0.8 },
    { pair: "cREAL/cUSD", base: "cREAL", quote: "cUSD", price: 0.19, change: 1.5 },
    { pair: "CELO/cREAL", base: "CELO", quote: "cREAL", price: 6.23, change: -0.7 },
  ]

  // Generate mock price history
  useEffect(() => {
    const generatePriceHistory = () => {
      const now = Date.now()
      const history = []
      let currentPrice = 1.18
      
      for (let i = 0; i < 100; i++) {
        const time = now - (100 - i) * 60000 // 1 minute intervals
        const change = (Math.random() - 0.5) * 0.01 // ±0.5% change
        currentPrice = Math.max(0.1, currentPrice * (1 + change))
        history.push({ time, price: currentPrice })
      }
      setPriceHistory(history)
    }
    
    generatePriceHistory()
    const interval = setInterval(generatePriceHistory, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleTrade = () => {
    if (!amount || parseFloat(amount) <= 0) return
    
    const tradeAmount = parseFloat(amount)
    const tradePrice = parseFloat(price)
    const total = tradeAmount * tradePrice
    
    // Mock trade execution
    console.log(`${activeTab.toUpperCase()} ${tradeAmount} ${selectedPair.split('/')[0]} at ${tradePrice} ${selectedPair.split('/')[1]}`)
    console.log(`Total: ${total.toFixed(2)} ${selectedPair.split('/')[1]}`)
    
    // Add to recent trades
    const newTrade = {
      time: new Date().toLocaleTimeString(),
      price: tradePrice,
      amount: tradeAmount,
      type: activeTab
    }
    setRecentTrades([newTrade, ...recentTrades.slice(0, 7)])
  }

  const getMaxAmount = () => {
    return activeTab === "buy" ? "1,250.00" : "850.50"
  }

  const getTotalValue = () => {
    if (!amount || !price) return "0.00"
    return (parseFloat(amount) * parseFloat(price)).toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Trade</h1>
          <p className="text-xl text-gray-600 font-medium">Advanced DEX Trading Interface</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" className="font-bold">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="font-bold">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Trading Chart */}
        <div className="xl:col-span-2">
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-celo" />
                  {selectedPair} Chart
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-bold">1H</Badge>
                  <Badge variant="outline" className="font-bold">4H</Badge>
                  <Badge variant="celo" className="font-bold">1D</Badge>
                  <Badge variant="outline" className="font-bold">1W</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Mock Chart Area */}
              <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-bold text-gray-600">Trading Chart</p>
                  <p className="text-sm text-gray-500">Price visualization for {selectedPair}</p>
                </div>
              </div>
              
              {/* Price Info */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-600">Last Price</div>
                  <div className="text-xl font-bold text-gray-900">${price}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-600">24h Change</div>
                  <div className="text-xl font-bold text-green-600 flex items-center justify-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    +2.5%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-bold text-gray-600">24h Volume</div>
                  <div className="text-xl font-bold text-gray-900">$2.4M</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trading Panel */}
        <div className="xl:col-span-1">
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
              <CardTitle className="text-2xl font-bold text-gray-900">Trade</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Pair Selector */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-gray-700">Trading Pair</label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-lg font-bold focus:border-celo"
                >
                  {tradingPairs.map((pair) => (
                    <option key={pair.pair} value={pair.pair}>
                      {pair.pair} (${pair.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Buy/Sell Tabs */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <Button
                  variant={activeTab === "buy" ? "celo" : "ghost"}
                  className="flex-1 font-bold"
                  onClick={() => setActiveTab("buy")}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Buy
                </Button>
                <Button
                  variant={activeTab === "sell" ? "destructive" : "ghost"}
                  className="flex-1 font-bold"
                  onClick={() => setActiveTab("sell")}
                >
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Sell
                </Button>
              </div>

              {/* Order Type */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-gray-700">Order Type</label>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={orderType === "market" ? "celo" : "ghost"}
                    className="flex-1 font-bold text-sm"
                    onClick={() => setOrderType("market")}
                  >
                    Market
                  </Button>
                  <Button
                    variant={orderType === "limit" ? "celo" : "ghost"}
                    className="flex-1 font-bold text-sm"
                    onClick={() => setOrderType("limit")}
                  >
                    Limit
                  </Button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-lg font-bold text-gray-700">Amount</label>
                  <button 
                    className="text-sm text-celo font-bold hover:underline"
                    onClick={() => setAmount(getMaxAmount().replace(/,/g, ''))}
                  >
                    Max: {getMaxAmount()}
                  </button>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xl font-bold h-14 border-2 border-gray-200 focus:border-celo"
                />
                <div className="text-sm text-gray-600 font-medium">
                  Available: {getMaxAmount()} {selectedPair.split('/')[activeTab === "buy" ? 1 : 0]}
                </div>
              </div>

              {/* Price Input (for limit orders) */}
              {orderType === "limit" && (
                <div className="space-y-3">
                  <label className="text-lg font-bold text-gray-700">Price</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="text-xl font-bold h-14 border-2 border-gray-200 focus:border-celo"
                  />
                </div>
              )}

              {/* Total */}
              <div className="space-y-3">
                <label className="text-lg font-bold text-gray-700">Total</label>
                <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <div className="text-2xl font-bold text-gray-900">
                    {getTotalValue()} {selectedPair.split('/')[activeTab === "buy" ? 1 : 0]}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">
                    ≈ ${getTotalValue()}
                  </div>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-lg font-bold text-gray-700 hover:text-celo"
                >
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  Advanced Options
                </button>
                
                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Slippage Tolerance</label>
                      <Input
                        type="number"
                        placeholder="0.5"
                        value={slippage}
                        onChange={(e) => setSlippage(e.target.value)}
                        className="text-sm font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Time in Force</label>
                      <select
                        value={timeInForce}
                        onChange={(e) => setTimeInForce(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-bold"
                      >
                        <option value="GTC">Good Till Cancelled</option>
                        <option value="IOC">Immediate or Cancel</option>
                        <option value="FOK">Fill or Kill</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Trade Button */}
              <Button
                variant={activeTab === "buy" ? "celo" : "destructive"}
                size="lg"
                className="w-full h-16 text-xl font-bold"
                onClick={handleTrade}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                {activeTab === "buy" ? "Buy" : "Sell"} {selectedPair.split('/')[0]}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Order Book */}
        <div className="xl:col-span-1">
          <Card className="border-2 border-gray-100 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
              <CardTitle className="text-2xl font-bold text-gray-900">Order Book</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {/* Headers */}
              <div className="grid grid-cols-3 gap-2 text-sm font-bold text-gray-600 mb-3">
                <div>Price</div>
                <div>Amount</div>
                <div>Total</div>
              </div>

              {/* Asks (Sell Orders) */}
              <div className="space-y-1 mb-4">
                {orderBook.asks.slice().reverse().map((ask, index) => (
                  <div key={`ask-${index}`} className="grid grid-cols-3 gap-2 text-sm hover:bg-red-50 p-1 rounded cursor-pointer">
                    <div className="text-red-600 font-bold">{ask.price.toFixed(3)}</div>
                    <div className="text-gray-700">{ask.amount.toFixed(2)}</div>
                    <div className="text-gray-600">{ask.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>

              {/* Current Price */}
              <div className="text-center py-2 bg-celo/10 rounded-lg border-2 border-celo/20 mb-4">
                <div className="text-lg font-bold text-celo">${price}</div>
                <div className="text-sm text-gray-600 font-medium">Current Price</div>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="space-y-1">
                {orderBook.bids.map((bid, index) => (
                  <div key={`bid-${index}`} className="grid grid-cols-3 gap-2 text-sm hover:bg-green-50 p-1 rounded cursor-pointer">
                    <div className="text-green-600 font-bold">{bid.price.toFixed(3)}</div>
                    <div className="text-gray-700">{bid.amount.toFixed(2)}</div>
                    <div className="text-gray-600">{bid.total.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Trades */}
      <Card className="border-2 border-gray-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-celo" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-2">
            {recentTrades.map((trade, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600 font-medium">{trade.time}</div>
                  <div className={`text-sm font-bold ${trade.type === "buy" ? "text-green-600" : "text-red-600"}`}>
                    ${trade.price.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-700 font-medium">{trade.amount.toFixed(2)}</div>
                </div>
                <Badge 
                  variant={trade.type === "buy" ? "default" : "destructive"}
                  className="text-xs font-bold"
                >
                  {trade.type.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 