import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function QuickSwitch() {
  const [fromToken, setFromToken] = useState("cUSD")
  const [toToken, setToToken] = useState("cEUR")
  const [amount, setAmount] = useState("")
  const [slippage, setSlippage] = useState("0.5")

  const tokens = ["cUSD", "cEUR", "cREAL", "CELO"]
  const exchangeRates = {
    "cUSD-cEUR": 0.92,
    "cUSD-cREAL": 5.15,
    "cEUR-cUSD": 1.09,
    "cEUR-cREAL": 5.60,
    "cREAL-cUSD": 0.19,
    "cREAL-cEUR": 0.18,
  }

  const getExchangeRate = (from: string, to: string) => {
    const key = `${from}-${to}`
    return exchangeRates[key as keyof typeof exchangeRates] || 1
  }

  const estimatedOutput = amount ? (parseFloat(amount) * getExchangeRate(fromToken, toToken)).toFixed(2) : "0.00"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quick Switch</h1>
          <p className="text-gray-600">Fast FX swaps between stablecoins</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Swap Interface */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Swap Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* From Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">From</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  {tokens.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setFromToken(toToken)
                  setToToken(fromToken)
                }}
                className="w-10 h-10"
              >
                ↓
              </Button>
            </div>

            {/* To Token */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">To</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={estimatedOutput}
                    readOnly
                    className="text-lg bg-gray-50"
                  />
                </div>
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                  {tokens.map((token) => (
                    <option key={token} value={token}>
                      {token}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exchange Rate */}
            <div className="flex justify-between text-sm text-gray-600">
              <span>Exchange Rate:</span>
              <span>1 {fromToken} = {getExchangeRate(fromToken, toToken).toFixed(4)} {toToken}</span>
            </div>

            {/* Slippage */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Slippage Tolerance</label>
              <div className="flex gap-2">
                {["0.1", "0.5", "1.0"].map((value) => (
                  <Button
                    key={value}
                    variant={slippage === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSlippage(value)}
                  >
                    {value}%
                  </Button>
                ))}
                <Input
                  type="number"
                  placeholder="Custom"
                  value={slippage}
                  onChange={(e) => setSlippage(e.target.value)}
                  className="w-20"
                />
              </div>
            </div>

            {/* Swap Button */}
            <Button
              variant="celo"
              size="lg"
              className="w-full"
              disabled={!amount || parseFloat(amount) <= 0}
            >
              Swap {fromToken} for {toToken}
            </Button>
          </CardContent>
        </Card>

        {/* Swap Info */}
        <Card>
          <CardHeader>
            <CardTitle>Swap Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Input Amount</span>
                <span className="text-sm font-medium">{amount || "0.00"} {fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Output Amount</span>
                <span className="text-sm font-medium">{estimatedOutput} {toToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Price Impact</span>
                <span className="text-sm font-medium text-green-600">0.02%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Liquidity Provider Fee</span>
                <span className="text-sm font-medium">0.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Network Fee</span>
                <span className="text-sm font-medium">~0.001 CELO</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Minimum Received</span>
                <span className="text-sm font-medium">
                  {(parseFloat(estimatedOutput) * (1 - parseFloat(slippage) / 100)).toFixed(2)} {toToken}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Pairs */}
      <Card>
        <CardHeader>
          <CardTitle>Popular FX Pairs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { from: "cUSD", to: "cEUR", rate: "0.92", volume: "$450K" },
              { from: "cEUR", to: "cREAL", rate: "5.60", volume: "$320K" },
              { from: "cUSD", to: "cREAL", rate: "5.15", volume: "$280K" },
              { from: "cREAL", to: "cUSD", rate: "0.19", volume: "$180K" },
            ].map((pair, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  setFromToken(pair.from)
                  setToToken(pair.to)
                }}
              >
                <div className="font-medium text-gray-900">
                  {pair.from} → {pair.to}
                </div>
                <div className="text-sm text-gray-600">1 {pair.from} = {pair.rate} {pair.to}</div>
                <div className="text-xs text-gray-500 mt-1">Vol: {pair.volume}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 