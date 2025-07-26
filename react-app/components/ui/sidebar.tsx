import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onToggle?: () => void
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, isCollapsed = false, onToggle, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-screen flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 border-r border-gray-700 transition-all duration-300 shadow-xl",
        isCollapsed ? "w-20" : "w-72",
        "md:relative fixed inset-y-0 left-0 z-50",
        className
      )}
      {...props}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-700 px-4 bg-gradient-to-r from-yellow-400/10 to-green-500/10">
        {!isCollapsed && (
          <h2 className="text-xl font-black text-white celo-gradient-text">cSwitch</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-10 w-10 text-gray-300 hover:text-white hover:bg-gray-700/50"
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-auto py-4 px-2">{children}</div>
    </div>
  )
)
Sidebar.displayName = "Sidebar"

const SidebarItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode
    isActive?: boolean
  }
>(({ className, icon, isActive = false, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-4 px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer rounded-lg mx-2",
      "text-gray-300 hover:text-white hover:bg-gradient-to-r hover:from-yellow-400/20 hover:to-green-500/20",
      isActive && "bg-gradient-to-r from-yellow-400/30 to-green-500/30 text-white shadow-lg font-black",
      className
    )}
    {...props}
  >
    {icon && <span className="flex h-5 w-5 items-center justify-center">{icon}</span>}
    {children}
  </div>
))
SidebarItem.displayName = "SidebarItem"

export { Sidebar, SidebarItem } 