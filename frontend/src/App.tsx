
import { Routes, Route } from 'react-router-dom';
import TradingApp from './pages/TradingApp';
import TradePage from './pages/TradePage';
import EarnPage from './pages/earn';
import Header from './components/Header';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Header />
      <Routes>
        <Route path="/" element={<TradingApp />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/earn" element={<EarnPage />} />
        <Route path="/swap" element={<TradePage />} />
        <Route path="/stake" element={<EarnPage />} />
      </Routes>
    </div>
  );
}

export default App;