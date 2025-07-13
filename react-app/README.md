# cSwitch - FX-Focused DEX on Celo

A modern, clean, and developer-ready React interface for a Celo-themed FX-focused decentralized exchange called "cSwitch". Built with Next.js, Tailwind CSS, and ShadCN UI components.

## 🎨 Design Features

- **Celo Theme**: Light design with gold/green tones
- **Rounded Corners**: Soft, modern UI with gentle shadows
- **Responsive**: Optimized for web and mobile devices
- **Clean Layout**: Professional DEX interface ready for production

## 🧭 Interface Sections

### Left Sidebar (Collapsible)
- **Dashboard**: Overview with statistics and recent activity
- **Quick Switch**: FX swaps between cUSD, cEUR, cREAL
- **Token Launcher**: Launch tokens with Mento liquidity (Coming Soon)
- **Pair Explorer**: View pairs, prices, and market depth
- **MultiChart**: Add/view multiple FX pairs in one screen
- **MultiSwap**: Swap one token into multiple assets at once
- **Wallet Info**: Balance, address, and connection status

### Header
- **App Name**: cSwitch with gradient branding
- **Search Bar**: Token and pair search functionality
- **Gas Fee Estimator**: Real-time gas cost display
- **Wallet Connection**: Connect/disconnect wallet interface

## 🧱 Technical Stack

- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS 4.0
- **UI Components**: ShadCN UI with custom Celo theme
- **Icons**: Lucide React (ready for integration)
- **Package Manager**: pnpm
- **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd react-app
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Project Structure

```
├── app/
│   ├── globals.css          # Global styles with Celo theme
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with routing
├── components/
│   ├── layout/
│   │   └── AppLayout.tsx    # Main app layout with sidebar
│   ├── pages/
│   │   ├── Dashboard.tsx    # Dashboard overview
│   │   ├── QuickSwitch.tsx  # FX swap interface
│   │   ├── TokenLauncher.tsx # Token creation (coming soon)
│   │   ├── PairExplorer.tsx # Trading pairs explorer
│   │   ├── MultiChart.tsx   # Multi-pair charts
│   │   └── MultiSwap.tsx    # Multi-asset swaps
│   └── ui/                  # ShadCN UI components
├── lib/
│   └── utils.ts             # Utility functions
└── tailwind.config.js       # Tailwind config with Celo theme
```

## 🎯 Features Implemented

### ✅ Completed
- Responsive layout with collapsible sidebar
- Dashboard with statistics and recent activity
- Quick Switch interface for FX swaps
- Pair Explorer with search and filtering
- MultiChart interface (placeholder charts)
- MultiSwap functionality
- Token Launcher (coming soon page)
- Wallet connection interface
- Search functionality
- Gas fee display
- Celo-themed design system

### 🔄 Ready for Integration
- Wallet connection logic (hooks ready)
- Real-time price feeds
- Chart integration (placeholder ready)
- Swap execution logic
- Token metadata and balances
- Transaction history
- Liquidity pool data

## 🎨 Customization

### Celo Theme Colors
The interface uses a custom Celo color palette:
- **Gold**: #FCFF52
- **Green**: #35D07F  
- **Yellow**: #FFD700
- **Light**: #FCF6F1
- **Dark**: #1E002B

### Adding New Components
1. Create components in `components/ui/`
2. Follow ShadCN UI patterns
3. Use the `cn()` utility for class merging
4. Include Celo theme variants where appropriate

## 🔧 Development

### Adding New Pages
1. Create page component in `components/pages/`
2. Add routing logic in `app/page.tsx`
3. Update sidebar navigation in `AppLayout.tsx`

### Styling Guidelines
- Use Tailwind CSS classes
- Follow the established design system
- Maintain Celo brand colors
- Ensure responsive design
- Use ShadCN UI components as base

## 📱 Responsive Design

The interface is fully responsive and optimized for:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (320px - 767px)

## 🔮 Future Enhancements

- Real-time price feeds integration
- Advanced charting with TradingView
- Order book and market depth
- Liquidity pool management
- Token launch functionality
- Advanced trading features
- Mobile app version

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

Built with ❤️ for the Celo ecosystem

