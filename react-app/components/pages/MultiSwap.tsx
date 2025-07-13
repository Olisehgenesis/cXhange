import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Plus, Minus, TrendingUp, Zap } from "lucide-react"

export function MultiSwap() {
  const [fromToken, setFromToken] = useState("cUSD")
  const [fromAmount, setFromAmount] = useState("")
  const [selectedTokens, setSelectedTokens] = useState(["cEUR", "cREAL", "CELO"])
  const [distributionType, setDistributionType] = useState<"equal" | "custom">("equal")

  const availableTokens = [
    { symbol: "cUSD", name: "Celo Dollar", color: "bg-green-500" },
    { symbol: "cEUR", name: "Celo Euro", color: "bg-blue-500" },
    { symbol: "cREAL", name: "Celo Real", color: "bg-yellow-500" },
    { symbol: "CELO", name: "Celo Native", color: "bg-orange-500" },
    { symbol: "USDC", name: "USD Coin", color: "bg-purple-500" },
    { symbol: "USDT", name: "Tether", color: "bg-teal-500" }
  ]

  const exchangeRates = {
    "cUSD-cEUR": 0.92,
    "cUSD-cREAL": 5.15,
    "cUSD-CELO": 1.18,
    "cUSD-USDC": 1.00,
    "cUSD-USDT": 1.00,
    "cEUR-cUSD": 1.09,
    "cEUR-cREAL": 5.60,
    "cEUR-CELO": 1.28,
    "cEUR-USDC": 1.09,
    "cEUR-USDT": 1.09,
    "cREAL-cUSD": 0.19,
    "cREAL-cEUR": 0.18,
    "cREAL-CELO": 0.23,
    "cREAL-USDC": 0.19,
    "cREAL-USDT": 0.19,
    "CELO-cUSD": 0.85,
    "CELO-cEUR": 0.78,
    "CELO-cREAL": 4.36,
    "CELO-USDC": 0.85,
    "CELO-USDT": 0.85
  }

  const addToken = (token: string) => {
    if (!selectedTokens.includes(token) && selectedTokens.length < 6) {
      setSelectedTokens([...selectedTokens, token])
    }
  }

  const removeToken = (token: string) => {
    setSelectedTokens(selectedTokens.filter(t => t !== token))
  }

  const calculateDistribution = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return []
    
    const totalAmount = parseFloat(fromAmount)
    const tokenCount = selectedTokens.length
    const equalShare = totalAmount / tokenCount
    
    return selectedTokens.map(token => {
      const rate = exchangeRates[`${fromToken}-${token}` as keyof typeof exchangeRates] || 1
      return {
        token,
        amount: equalShare,
        output: (equalShare * rate).toFixed(4),
        rate: rate
      }
    })
  }

  const distribution = calculateDistribution()
  const totalOutput = distribution.reduce((sum, item) => sum + parseFloat(item.output), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MultiSwap</h1>
          <p className="text-xl text-gray-600 font-medium">Swap one token into multiple assets simultaneously</p>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-celo" />
          <Badge variant="celo" className="text-sm">Beta</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <Card className="lg:col-span-1 border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-celo" />
              Input Token
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <label className="text-lg font-bold text-gray-700">Amount</label>
              <Input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="text-xl font-bold h-14 border-2 border-gray-200 focus:border-celo"
              />
            </div>
            
            <div className="space-y-3">
              <label className="text-lg font-bold text-gray-700">Token</label>
              <select
                value={fromToken}
                onChange={(e) => setFromToken(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-white text-lg font-bold focus:border-celo"
              >
                {availableTokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol} - {token.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="text-lg font-bold text-gray-700 mb-2">Available Balance:</div>
              <div className="text-2xl font-bold text-celo">1,250.00 {fromToken}</div>
            </div>
          </CardContent>
        </Card>

        {/* Output Tokens */}
        <Card className="lg:col-span-2 border-2 border-gray-100 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRight className="w-6 h-6 text-celo" />
                Output Tokens
              </CardTitle>
              <Badge variant="outline" className="text-lg font-bold">
                {selectedTokens.length}/6 selected
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {/* Token Selector */}
            <div className="space-y-4">
              <div className="text-lg font-bold text-gray-700">Select Output Tokens:</div>
              <div className="flex flex-wrap gap-3">
                {availableTokens.filter(token => token.symbol !== fromToken).map((token) => (
                  <Button
                    key={token.symbol}
                    variant={selectedTokens.includes(token.symbol) ? "celo" : "outline"}
                    size="lg"
                    onClick={() => selectedTokens.includes(token.symbol) ? removeToken(token.symbol) : addToken(token.symbol)}
                    disabled={!selectedTokens.includes(token.symbol) && selectedTokens.length >= 6}
                    className="font-bold text-lg px-6 py-3"
                  >
                    {selectedTokens.includes(token.symbol) ? (
                      <Minus className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {token.symbol}
                  </Button>
                ))}
              </div>
            </div>

            {/* Distribution Preview */}
            {distribution.length > 0 && (
              <div className="space-y-4">
                <div className="text-lg font-bold text-gray-700">Distribution Preview:</div>
                <div className="space-y-3">
                  {distribution.map((item, index) => {
                    const tokenInfo = availableTokens.find(t => t.symbol === item.token)
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 ${tokenInfo?.color} rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                            {item.token}
                          </div>
                          <div>
                            <div className="text-xl font-bold text-gray-900">{item.token}</div>
                            <div className="text-lg text-gray-600 font-medium">
                              {item.amount.toFixed(4)} {fromToken} → {item.output} {item.token}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-900">{item.output} {item.token}</div>
                          <div className="text-lg text-gray-500 font-medium">
                            Rate: {item.rate.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                
                {/* Total Output */}
                <div className="p-4 bg-celo/10 rounded-xl border-2 border-celo/20">
                  <div className="flex items-center justify-between">
                    <div className="text-xl font-bold text-gray-700">Total Output Value:</div>
                    <div className="text-2xl font-bold text-celo">{totalOutput.toFixed(4)} {fromToken} equivalent</div>
                  </div>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <Button
              variant="celo"
              size="lg"
              className="w-full mt-6 h-16 text-xl font-bold"
              disabled={!fromAmount || parseFloat(fromAmount) <= 0 || selectedTokens.length === 0}
            >
              <Zap className="w-6 h-6 mr-3" />
              Multi-Swap {fromAmount || "0.00"} {fromToken} into {selectedTokens.length} tokens
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Swap Details */}
      <Card className="border-2 border-gray-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
          <CardTitle className="text-2xl font-bold text-gray-900">Swap Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-600">Total Input</div>
              <div className="text-2xl font-bold text-gray-900">{fromAmount || "0.00"} {fromToken}</div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-600">Number of Outputs</div>
              <div className="text-2xl font-bold text-gray-900">{selectedTokens.length}</div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-600">Average Price Impact</div>
              <div className="text-2xl font-bold text-green-600">0.05%</div>
            </div>
            <div className="space-y-2">
              <div className="text-lg font-bold text-gray-600">Estimated Gas</div>
              <div className="text-2xl font-bold text-gray-900">~0.003 CELO</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular Multi-Swap Templates */}
      <Card className="border-2 border-gray-100 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-celo/5 to-celo/10">
          <CardTitle className="text-2xl font-bold text-gray-900">Popular Templates</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Stablecoin Diversification",
                description: "Split into major stablecoins",
                tokens: ["cUSD", "cEUR", "cREAL", "USDC"],
                color: "from-green-500 to-blue-500"
              },
              {
                name: "FX Portfolio",
                description: "Diversify across major FX pairs",
                tokens: ["cEUR", "cREAL", "CELO", "USDT"],
                color: "from-blue-500 to-purple-500"
              },
              {
                name: "Conservative Mix",
                description: "Stablecoins + CELO",
                tokens: ["cUSD", "cEUR", "CELO"],
                color: "from-orange-500 to-yellow-500"
              }
            ].map((template, index) => (
              <div
                key={index}
                className={`p-6 border-2 border-gray-200 rounded-xl hover:bg-gradient-to-r ${template.color} hover:bg-opacity-5 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg`}
                onClick={() => {
                  setSelectedTokens(template.tokens.filter(t => t !== fromToken))
                }}
              >
                <div className="text-xl font-bold text-gray-900 mb-2">{template.name}</div>
                <div className="text-lg text-gray-600 mb-4 font-medium">{template.description}</div>
                <div className="flex gap-2 flex-wrap">
                  {template.tokens.map((token) => (
                    <Badge
                      key={token}
                      variant="outline"
                      className="text-sm font-bold px-3 py-1"
                    >
                      {token}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 