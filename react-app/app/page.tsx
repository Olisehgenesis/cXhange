"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/AppLayout"
import { Dashboard } from "@/components/pages/Dashboard"
import { QuickSwitch } from "@/components/pages/QuickSwitch"
import { TokenLauncher } from "@/components/pages/TokenLauncher"
import { PairExplorer } from "@/components/pages/PairExplorer"
import { MultiChart } from "@/components/pages/MultiChart"
import { MultiSwap } from "@/components/pages/MultiSwap"
import { Trade } from "@/components/pages/Trade"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("dashboard")

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard />
      case "trade":
        return <Trade />
      case "quick-switch":
        return <QuickSwitch />
      case "token-launcher":
        return <TokenLauncher />
      case "pair-explorer":
        return <PairExplorer />
      case "multi-chart":
        return <MultiChart />
      case "multi-swap":
        return <MultiSwap />
      default:
        return <Dashboard />
    }
  }

  const handlePageChange = (page: string) => {
    setCurrentPage(page)
  }

  return (
    <AppLayout currentPage={currentPage} onPageChange={handlePageChange}>
      {renderPage()}
    </AppLayout>
  )
}
