import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  ArrowLeftRight, 
  TrendingUp, 
  BarChart3, 
  Rocket,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"

export function Dashboard() {
  const stats = [
    {
      title: "Total Volume (24h)",
      value: "$2.4M",
      change: "+12.5%",
      isPositive: true,
    },
    {
      title: "Active Pairs",
      value: "156",
      change: "+3",
      isPositive: true,
    },
    {
      title: "Total Liquidity",
      value: "$45.2M",
      change: "+8.2%",
      isPositive: true,
    },
    {
      title: "Gas Fees (Avg)",
      value: "0.001 CELO",
      change: "-5.1%",
      isPositive: true,
    },
  ]

  const recentSwaps = [
    {
      from: "cUSD",
      to: "cEUR",
      amount: "1,250.00",
      user: "0x1234...5678",
      time: "2 min ago",
    },
    {
      from: "cREAL",
      to: "cUSD",
      amount: "850.50",
      user: "0xabcd...efgh",
      time: "5 min ago",
    },
    {
      from: "cEUR",
      to: "cREAL",
      amount: "2,100.00",
      user: "0x9876...5432",
      time: "8 min ago",
    },
  ]

  return (
    <div className="space-y-6 mobile-optimized">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mobile-text font-semibold">Welcome to cSwitch - Your FX-focused DEX</p>
        </div>
        <Button variant="celo" size="lg" className="btn-celo font-black">
          Quick Swap
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="cool-card hover:shadow-lg transition-all duration-300 float-animation">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-black text-gray-600 mobile-text">
                {stat.title}
              </CardTitle>
              <Badge
                variant={stat.isPositive ? "default" : "destructive"}
                className="text-xs font-black"
              >
                {stat.change}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-black text-gray-900">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1 cool-card">
          <CardHeader>
            <CardTitle className="font-black">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4">
            <Button variant="outline" className="w-full justify-start hover:bg-gradient-to-r hover:from-yellow-50 hover:to-green-50 font-bold">
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              Swap cUSD ↔ cEUR
            </Button>
            <Button variant="outline" className="w-full justify-start hover:bg-gradient-to-r hover:from-yellow-50 hover:to-green-50 font-bold">
              <TrendingUp className="mr-2 h-4 w-4" />
              Multi-Swap
            </Button>
            <Button variant="outline" className="w-full justify-start hover:bg-gradient-to-r hover:from-yellow-50 hover:to-green-50 font-bold">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Charts
            </Button>
            <Button variant="outline" className="w-full justify-start hover:bg-gradient-to-r hover:from-yellow-50 hover:to-green-50 font-bold">
              <Rocket className="mr-2 h-4 w-4" />
              Launch Token
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2 cool-card">
          <CardHeader>
            <CardTitle className="font-black">Recent Swaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 md:space-y-4">
              {recentSwaps.map((swap, index) => (
                <div
                  key={index}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black">{swap.from}</span>
                      <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                      <span className="font-black">{swap.to}</span>
                    </div>
                    <Badge variant="outline" className="text-xs font-black">
                      {swap.amount}
                    </Badge>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="mobile-text font-bold">{swap.user}</div>
                    <div className="mobile-text font-semibold">{swap.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Pairs */}
      <Card className="cool-card">
        <CardHeader>
          <CardTitle className="font-black">Popular FX Pairs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { pair: "cUSD/cEUR", volume: "$450K", change: "+2.1%" },
              { pair: "cEUR/cREAL", volume: "$320K", change: "+1.8%" },
              { pair: "cUSD/cREAL", volume: "$280K", change: "-0.5%" },
              { pair: "CELO/cUSD", volume: "$180K", change: "+3.2%" },
            ].map((item, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-gradient-to-r hover:from-yellow-50 hover:to-green-50 cursor-pointer transition-all duration-200 hover:shadow-md"
              >
                <div className="font-black text-gray-900 mobile-text">{item.pair}</div>
                <div className="text-sm text-gray-600 mobile-text font-bold">{item.volume}</div>
                <div className="flex items-center gap-1 mt-1">
                  {item.change.startsWith("+") ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600" />
                  )}
                  <Badge
                    variant={item.change.startsWith("+") ? "default" : "destructive"}
                    className="text-xs font-black"
                  >
                    {item.change}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 