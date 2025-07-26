"use client"

import React, { useState } from "react"
import { Sidebar, SidebarItem } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  BarChart3, 
  ArrowLeftRight, 
  Rocket, 
  Search, 
  TrendingUp, 
  SplitSquareVertical,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X,
  Activity
} from "lucide-react"

interface AppLayoutProps {
  children: React.ReactNode
  currentPage?: string
  onPageChange?: (page: string) => void
}

export function AppLayout({ children, currentPage = "dashboard", onPageChange }: AppLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navigationItems = [
    { id: "dashboard", label: "Dashboard", icon: <BarChart3 className="h-5 w-5" /> },
    { id: "trade", label: "Trade", icon: <Activity className="h-5 w-5" /> },
    { id: "quick-switch", label: "Quick Switch", icon: <ArrowLeftRight className="h-5 w-5" /> },
    { id: "token-launcher", label: "Token Launcher", icon: <Rocket className="h-5 w-5" /> },
    { id: "pair-explorer", label: "Pair Explorer", icon: <Search className="h-5 w-5" /> },
    { id: "multi-chart", label: "MultiChart", icon: <TrendingUp className="h-5 w-5" /> },
    { id: "multi-swap", label: "MultiSwap", icon: <SplitSquareVertical className="h-5 w-5" /> },
  ]

  const handleNavigation = (pageId: string) => {
    setIsMobileMenuOpen(false)
    if (onPageChange) {
      onPageChange(pageId)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}>
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        >
          {navigationItems.map((item) => (
            <SidebarItem
              key={item.id}
              icon={item.icon}
              isActive={currentPage === item.id}
              className="cursor-pointer font-semibold"
              onClick={() => handleNavigation(item.id)}
            >
              {!isSidebarCollapsed && <span className="font-bold">{item.label}</span>}
            </SidebarItem>
          ))}
          
          {/* Spacer to push wallet section down */}
          <div className="flex-1" />
          
          {/* Wallet Section - Now at bottom */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <SidebarItem
              icon={<Wallet className="h-5 w-5" />}
              isActive={false}
              className="cursor-pointer font-semibold"
            >
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 font-medium">
                    {isWalletConnected ? "Connected" : "Not Connected"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsWalletConnected(!isWalletConnected)}
                    className="mt-1 h-6 text-xs text-gray-300 hover:text-white font-bold"
                  >
                    {isWalletConnected ? "Disconnect" : "Connect Wallet"}
                  </Button>
                </div>
              )}
            </SidebarItem>
          </div>
        </Sidebar>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-sm px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden h-10 w-10"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <h1 className="text-xl md:text-2xl font-bold celo-gradient-text">cSwitch</h1>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Input
                placeholder="Search tokens, pairs, or addresses..."
                className="pl-10 bg-white/50 backdrop-blur-sm border-gray-200 focus:border-yellow-400 font-medium"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Gas Fee */}
            <div className="hidden md:flex items-center gap-2">
              <Zap className="h-4 w-4 text-gray-500" />
              <Badge variant="outline" className="text-xs font-bold">
                0.001 CELO
              </Badge>
            </div>

            {/* Wallet Info */}
            {isWalletConnected ? (
              <div className="flex items-center gap-2">
                <Badge variant="celo" className="text-xs font-bold">
                  Connected
                </Badge>
                <span className="hidden md:block text-sm text-gray-600 font-semibold">
                  0x1234...5678
                </span>
              </div>
            ) : (
              <Button
                variant="celo"
                size="sm"
                onClick={() => setIsWalletConnected(true)}
                className="text-xs px-3 py-1 font-bold"
              >
                Connect
              </Button>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 via-blue-50 to-green-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
} 