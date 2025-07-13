# C-Switch Frontend

A modern React trading platform frontend for Celo's Mento protocol.

## Features

- 📊 **Real-time Trading Charts**: Interactive candlestick charts using lightweight-charts
- 🔄 **Live Data Updates**: Automatic data refresh with React Query
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Dark Theme**: Modern dark UI optimized for trading
- ⚡ **Fast Performance**: Built with Vite for optimal development experience

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Lightweight Charts** - Trading chart library
- **Lucide React** - Icons

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/     # React components
│   │   ├── TradingChart.tsx
│   │   ├── PairSelector.tsx
│   │   └── TimeframeSelector.tsx
│   ├── hooks/         # Custom React hooks
│   │   └── useApi.ts
│   ├── types/         # TypeScript type definitions
│   │   └── api.ts
│   ├── utils/         # Utility functions
│   │   └── api.ts
│   ├── App.tsx        # Main app component
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── public/            # Static assets
├── index.html         # HTML template
└── package.json       # Dependencies and scripts
```

## API Integration

The frontend connects to the backend API at `http://localhost:3001` and includes:

- Real-time price data
- OHLC candle data
- Trading pair information
- Market statistics

## Components

### TradingChart
Interactive candlestick chart component with:
- Multiple timeframe support
- Real-time data updates
- Responsive design
- Dark theme styling

### PairSelector
Dropdown component for selecting trading pairs with:
- Loading states
- Search functionality
- Clean UI design

### TimeframeSelector
Button group for selecting chart timeframes:
- 1m, 5m, 15m, 1h, 4h, 1d options
- Active state highlighting
- Smooth transitions

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3001
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License 