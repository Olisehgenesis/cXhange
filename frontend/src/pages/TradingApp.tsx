import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  CheckCircle,
  ArrowLeftRight,
  PiggyBank,
  Award,
  Globe
} from 'lucide-react';

// Enhanced Animated Trader Component
function AnimatedTrader() {
  const [animationPhase, setAnimationPhase] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationPhase(prev => (prev + 1) % 4)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative w-96 h-96 mx-auto mb-12">
      {/* Enhanced Trading Environment */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-80 h-40 bg-gradient-to-t from-gray-800 via-gray-700 to-gray-600 rounded-t-3xl shadow-2xl border-t-4 border-blue-500">
        {/* Multiple Monitors with Enhanced Graphics */}
        <div className="absolute -top-24 left-6 w-20 h-16 bg-gray-900 rounded-lg border-2 border-gray-600 shadow-xl">
          <div className="w-full h-full bg-gradient-to-b from-green-400 to-green-600 rounded-md p-1.5 overflow-hidden">
            <div className={`w-full h-1.5 bg-white/40 rounded mb-1 ${animationPhase === 0 ? 'animate-pulse' : ''}`}></div>
            <div className="flex justify-between items-end h-8">
              <div className="w-1.5 h-6 bg-green-300 rounded opacity-80 animate-pulse"></div>
              <div className="w-1.5 h-4 bg-green-300 rounded opacity-60"></div>
              <div className="w-1.5 h-7 bg-green-300 rounded opacity-90 animate-pulse" style={{animationDelay: '0.5s'}}></div>
              <div className="w-1.5 h-3 bg-green-300 rounded opacity-50"></div>
              <div className="w-1.5 h-8 bg-green-300 rounded opacity-95 animate-pulse" style={{animationDelay: '1s'}}></div>
              <div className="w-1.5 h-5 bg-green-300 rounded opacity-75"></div>
            </div>
          </div>
        </div>
        
        <div className="absolute -top-24 right-6 w-20 h-16 bg-gray-900 rounded-lg border-2 border-gray-600 shadow-xl">
          <div className="w-full h-full bg-gradient-to-b from-blue-400 to-purple-600 rounded-md p-1.5 overflow-hidden">
            <div className={`w-full h-1.5 bg-white/40 rounded mb-1 ${animationPhase === 1 ? 'animate-pulse' : ''}`}></div>
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-blue-300 rounded animate-pulse"></div>
              <div className="w-4/5 h-1.5 bg-purple-300 rounded"></div>
              <div className="w-3/5 h-1.5 bg-blue-300 rounded animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="w-2/3 h-1.5 bg-purple-300 rounded"></div>
            </div>
          </div>
        </div>

        {/* Center Monitor - Price Display */}
        <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 w-20 h-16 bg-gray-900 rounded-lg border-2 border-gray-600 shadow-xl">
          <div className="w-full h-full bg-gradient-to-b from-orange-400 to-red-600 rounded-md p-1.5 overflow-hidden">
            <div className="text-center">
              <div className="text-white text-xs font-bold mb-1">CELO/USD</div>
              <div className="text-white text-sm font-bold animate-pulse">$2.45</div>
              <div className="text-green-200 text-xs">+5.2%</div>
            </div>
          </div>
        </div>

        {/* Enhanced Keyboard */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-24 h-4 bg-gray-600 rounded shadow-inner">
          <div className="w-full h-full bg-gradient-to-b from-gray-500 to-gray-700 rounded flex space-x-0.5 p-1">
            <div className="flex-1 h-full bg-gray-400 rounded-sm"></div>
            <div className="flex-1 h-full bg-gray-400 rounded-sm"></div>
            <div className="flex-1 h-full bg-gray-400 rounded-sm"></div>
            <div className="flex-1 h-full bg-gray-400 rounded-sm"></div>
          </div>
        </div>

        {/* Animated Trader */}
        <div className="absolute -top-32 left-1/2 transform -translate-x-1/2">
          <div className="relative">
            {/* Trader Body */}
            <div className="w-16 h-20 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full shadow-lg border-2 border-blue-400 relative">
              {/* Head */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-gradient-to-b from-yellow-300 to-yellow-400 rounded-full border-2 border-yellow-200 shadow-md">
                <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>
                <div className="absolute top-2 right-2 w-2 h-2 bg-black rounded-full"></div>
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full"></div>
              </div>
              
              {/* Arms */}
              <div className={`absolute top-4 left-0 w-3 h-8 bg-blue-500 rounded-full transform origin-top ${animationPhase === 0 ? 'rotate-12' : animationPhase === 2 ? '-rotate-12' : 'rotate-0'} transition-transform duration-500`}></div>
              <div className={`absolute top-4 right-0 w-3 h-8 bg-blue-500 rounded-full transform origin-top ${animationPhase === 0 ? '-rotate-12' : animationPhase === 2 ? 'rotate-12' : 'rotate-0'} transition-transform duration-500`}></div>
              
              {/* Trading Indicators */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className={`w-2 h-2 bg-green-400 rounded-full animate-ping ${animationPhase === 1 ? 'opacity-100' : 'opacity-0'}`}></div>
              </div>
            </div>
            
            {/* Floating Coins */}
            <div className={`absolute -top-16 -right-4 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold text-yellow-800 shadow-lg ${animationPhase === 3 ? 'animate-bounce' : ''}`}>
              $
            </div>
            <div className={`absolute -top-12 -left-4 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center text-xs font-bold text-green-800 shadow-lg ${animationPhase === 1 ? 'animate-bounce' : ''}`} style={{animationDelay: '0.5s'}}>
              ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const TradingApp: React.FC = () => {
  const navigate = useNavigate();
  const [animationStep, setAnimationStep] = useState(0)
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)
  const [stats, setStats] = useState({
    pairs: 0,
    time: 0,
    security: 0,
    users: 0
  })

  // Animated counter effect
  useEffect(() => {
    const timer = setTimeout(() => setAnimationStep(1), 500)
    return () => clearTimeout(timer)
  }, [])

  // Stats animation
  useEffect(() => {
    if (animationStep === 1) {
      const intervals = [
        setInterval(() => setStats(prev => ({ ...prev, pairs: Math.min(prev.pairs + 5, 100) })), 50),
        setInterval(() => setStats(prev => ({ ...prev, time: Math.min(prev.time + 0.1, 2) })), 100),
        setInterval(() => setStats(prev => ({ ...prev, security: Math.min(prev.security + 5, 100) })), 30),
        setInterval(() => setStats(prev => ({ ...prev, users: Math.min(prev.users + 500, 10000) })), 20)
      ]
      
      setTimeout(() => intervals.forEach(clearInterval), 3000)
      return () => intervals.forEach(clearInterval)
    }
  }, [animationStep])

  const features = [
    {
      icon: ArrowLeftRight,
      title: "Lightning Trading",
      description: "Execute trades instantly with our next-generation smart contracts. Experience zero delays and maximum efficiency in every transaction.",
      gradient: "from-emerald-500 to-teal-600",
      bgGradient: "from-emerald-50 to-teal-50",
      stats: "< 0.3s execution",
      benefits: ["Zero slippage protection", "MEV resistance", "Cross-chain bridges", "Smart order routing"]
    },
    {
      icon: PiggyBank,
      title: "Premium Yields",
      description: "Maximize your returns with our advanced yield farming strategies. Access exclusive pools and auto-compounding rewards.",
      gradient: "from-purple-500 to-indigo-600",
      bgGradient: "from-purple-50 to-indigo-50",
      stats: "Up to 35% APY",
      benefits: ["Auto-compounding rewards", "Multiple token rewards", "Flexible lock periods", "Risk management tools"]
    },
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Your assets are protected by military-grade encryption and multi-layer security protocols. Trade with complete confidence.",
      gradient: "from-blue-500 to-cyan-600",
      bgGradient: "from-blue-50 to-cyan-50",
      stats: "100% secure",
      benefits: ["Multi-sig wallets", "Insurance coverage", "Regular security audits", "Cold storage protection"]
    },
    {
      icon: Zap,
      title: "Blazing Speed",
      description: "Experience the fastest DeFi platform on Celo. Our optimized infrastructure delivers unmatched performance and reliability.",
      gradient: "from-yellow-500 to-orange-600",
      bgGradient: "from-yellow-50 to-orange-50",
      stats: "25,000+ TPS",
      benefits: ["Instant confirmations", "Batch processing", "Layer 2 scaling", "Optimized gas fees"]
    },
    {
      icon: Globe,
      title: "Global Access",
      description: "Trade from anywhere in the world with full compliance and regulatory clarity. No geographical restrictions or barriers.",
      gradient: "from-green-500 to-emerald-600",
      bgGradient: "from-green-50 to-emerald-50",
      stats: "195+ countries",
      benefits: ["Mobile-first design", "Multi-language support", "Local payment methods", "24/7 global support"]
    },
    {
      icon: Award,
      title: "Best-in-Class Rates",
      description: "Enjoy the most competitive trading fees in DeFi. Our advanced algorithms ensure you always get the best possible rates.",
      gradient: "from-rose-500 to-pink-600",
      bgGradient: "from-rose-50 to-pink-50",
      stats: "0.05% trading fees",
      benefits: ["Dynamic fee optimization", "Volume-based discounts", "Loyalty rewards", "Fee rebates program"]
    }
  ]



  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        {/* Floating Background Elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-r from-blue-400/10 to-indigo-400/10 animate-float-slower blur-3xl"></div>
          <div className="absolute top-1/2 right-1/5 w-80 h-80 rounded-full bg-gradient-to-r from-cyan-400/10 to-blue-400/10 animate-float-slow blur-3xl"></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 rounded-full bg-gradient-to-r from-indigo-400/10 to-purple-400/10 animate-float blur-3xl"></div>
        </div>

        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Left Column - Content */}
              <div className="space-y-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                      <TrendingUp className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                      MiloFX
                    </h1>
                  </div>
                  
                  <h2 className="text-2xl lg:text-4xl font-bold text-gray-900 leading-tight">
                    The Future of <span className="text-blue-600">DeFi Trading</span> is Here
                  </h2>
                  
                  <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                    Experience lightning-fast trading, premium yields, and bank-grade security on the most advanced DeFi platform built on Celo.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <button 
                    onClick={() => navigate('/trade')}
                    className="px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
                  >
                    <ArrowLeftRight className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Start Trading
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/earn')}
                    className="px-8 py-4 rounded-2xl bg-white text-blue-600 font-semibold border-2 border-blue-200 hover:border-blue-300 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                  >
                    <PiggyBank className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                    Earn Yields
                  </button>
                </motion.div>

                {/* Quick Stats */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="flex flex-wrap gap-8 pt-8"
                >
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.pairs}+</div>
                    <div className="text-sm text-gray-600">Trading Pairs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{stats.time}s</div>
                    <div className="text-sm text-gray-600">Avg. Execution</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.security}%</div>
                    <div className="text-sm text-gray-600">Security Score</div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Animated Trader */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="relative"
              >
                <AnimatedTrader />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
              >
                <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-full mb-4">Platform Features</span>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                  Why Choose MiloFX?
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Experience the next generation of DeFi trading with cutting-edge features designed for maximum efficiency and security
                </p>
              </motion.div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  onMouseEnter={() => setHoveredFeature(index)}
                  onMouseLeave={() => setHoveredFeature(null)}
                  className="group relative"
                >
                  <div className={`bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-blue-100/50 relative overflow-hidden h-full transition-all duration-500 ${hoveredFeature === index ? 'scale-105 shadow-2xl' : 'hover:scale-102'}`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
                    <div className="relative z-10">
                      <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white mb-6 shadow-lg`}>
                        <feature.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4">{feature.title}</h3>
                      <p className="text-gray-600 leading-relaxed mb-6">{feature.description}</p>
                      
                      <div className="mb-6">
                        <div className="text-2xl font-bold text-blue-600 mb-2">{feature.stats}</div>
                        <div className="space-y-2">
                          {feature.benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-center text-sm text-gray-600">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              {benefit}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-3xl p-12 text-center text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative z-10">
                <h2 className="text-3xl lg:text-4xl font-bold mb-6">
                  Ready to Start Trading?
                </h2>
                <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                  Join thousands of traders who have already discovered the future of DeFi on MiloFX
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button 
                    onClick={() => navigate('/trade')}
                    className="px-8 py-4 rounded-2xl bg-white text-blue-600 font-semibold hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                  >
                    <TrendingUp className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Start Trading Now
                  </button>
                  <button 
                    onClick={() => navigate('/earn')}
                    className="px-8 py-4 rounded-2xl bg-white/20 backdrop-blur-sm text-white font-semibold border border-white/30 hover:bg-white/30 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center group"
                  >
                    <PiggyBank className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                    Explore Yields
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}

export default TradingApp; 