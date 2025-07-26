import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Rocket, Zap, TrendingUp, BarChart3 } from "lucide-react"

export function TokenLauncher() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Token Launcher</h1>
          <p className="text-gray-600">Launch your token with Mento liquidity</p>
        </div>
      </div>

      {/* Coming Soon Card */}
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Rocket className="h-16 w-16 text-yellow-500" />
          </div>
          <CardTitle className="text-2xl">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            The Token Launcher feature is currently under development. Soon you'll be able to:
          </p>
          <ul className="text-left space-y-2 text-gray-600">
            <li>• Create new tokens with built-in Mento liquidity</li>
            <li>• Launch tokens with automatic market making</li>
            <li>• Access to Celo's stablecoin infrastructure</li>
            <li>• Seamless integration with cSwitch DEX</li>
          </ul>
          <div className="pt-4">
            <Button
              variant="outline"
              className="w-full"
              disabled
            >
              Notify Me When Available
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feature Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Token Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Create your own token with customizable parameters and automatic liquidity provision.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Mento Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Leverage Celo's Mento protocol for stable and efficient liquidity management.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              DEX Listing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Automatic listing on cSwitch with full trading capabilities and chart integration.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 