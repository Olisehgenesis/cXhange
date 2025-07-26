import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function PairExplorer() {
  const [searchTerm, setSearchTerm] = useState("")

  const pairs = [
    {
      pair: "cUSD/cEUR",
      price: "0.92",
      change24h: "+2.1%",
      volume24h: "$450K",
      liquidity: "$2.1M",
      isPositive: true,
    },
    {
      pair: "cEUR/cREAL",
      price: "5.60",
      change24h: "+1.8%",
      volume24h: "$320K",
      liquidity: "$1.8M",
      isPositive: true,
    },
    {
      pair: "cUSD/cREAL",
      price: "5.15",
      change24h: "-0.5%",
      volume24h: "$280K",
      liquidity: "$1.5M",
      isPositive: false,
    },
    {
      pair: "CELO/cUSD",
      price: "0.85",
      change24h: "+3.2%",
      volume24h: "$180K",
      liquidity: "$900K",
      isPositive: true,
    },
    {
      pair: "cREAL/cEUR",
      price: "0.18",
      change24h: "-1.2%",
      volume24h: "$120K",
      liquidity: "$600K",
      isPositive: false,
    },
    {
      pair: "CELO/cEUR",
      price: "0.78",
      change24h: "+1.5%",
      volume24h: "$95K",
      liquidity: "$450K",
      isPositive: true,
    },
  ]

  const filteredPairs = pairs.filter(pair =>
    pair.pair.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pair Explorer</h1>
          <p className="text-gray-600">Explore trading pairs, prices, and market depth</p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search pairs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-md bg-white">
              <option>All Pairs</option>
              <option>FX Pairs</option>
              <option>Stablecoin Pairs</option>
            </select>
            <select className="px-3 py-2 border border-gray-300 rounded-md bg-white">
              <option>Sort by Volume</option>
              <option>Sort by Price Change</option>
              <option>Sort by Liquidity</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Pairs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Trading Pairs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Pair</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Price</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">24h Change</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">24h Volume</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Liquidity</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPairs.map((pair, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{pair.pair}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-medium">${pair.price}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={pair.isPositive ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {pair.change24h}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {pair.volume24h}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {pair.liquidity}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button className="text-sm text-blue-600 hover:text-blue-800">
                          Trade
                        </button>
                        <button className="text-sm text-gray-600 hover:text-gray-800">
                          Chart
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Market Depth Example */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Depth - cUSD/cEUR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bids</span>
                <span className="text-gray-600">Size</span>
              </div>
              {[
                { price: "0.9215", size: "125.5K" },
                { price: "0.9210", size: "89.2K" },
                { price: "0.9205", size: "156.8K" },
                { price: "0.9200", size: "203.1K" },
                { price: "0.9195", size: "78.9K" },
              ].map((bid, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-green-600 font-medium">{bid.price}</span>
                  <span>{bid.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Market Depth - cUSD/cEUR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Asks</span>
                <span className="text-gray-600">Size</span>
              </div>
              {[
                { price: "0.9220", size: "98.3K" },
                { price: "0.9225", size: "145.7K" },
                { price: "0.9230", size: "112.4K" },
                { price: "0.9235", size: "167.9K" },
                { price: "0.9240", size: "89.6K" },
              ].map((ask, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-red-600 font-medium">{ask.price}</span>
                  <span>{ask.size}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 