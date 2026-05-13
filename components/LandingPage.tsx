import React, { useState, useEffect } from 'react';
import {
  Rabbit, Warehouse, Heart, DollarSign, BarChart3, Smartphone,
  ArrowRight, PlayCircle, CheckCircle2, Shield, Zap, Users,
  ChevronDown, Star, Menu, X, Clock, Check, Crown
} from 'lucide-react';

interface Props {
  onGetStarted: () => void;
  onDemo: () => void;
}

export const LandingPage: React.FC<Props> = ({ onGetStarted, onDemo }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: Rabbit,
      title: 'Livestock Management',
      description: 'Track every rabbit with unique tags, breed records, lineage trees, weight history, and health status.',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100'
    },
    {
      icon: Warehouse,
      title: 'Hutch & Housing',
      description: 'Real-time occupancy tracking, capacity management, and movement history for all your hutches.',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100'
    },
    {
      icon: Heart,
      title: 'Breeding Program',
      description: 'Mating records, pregnancy tracking, delivery management, palpation scheduling, and inbreeding detection.',
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      border: 'border-pink-100'
    },
    {
      icon: DollarSign,
      title: 'Financial Tracking',
      description: 'Income & expense logging, customer management, sale records, and automated transaction tracking.',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100'
    },
    {
      icon: BarChart3,
      title: 'Dashboard & Analytics',
      description: 'Real-time KPIs, breed distribution charts, financial trends, and upcoming task alerts on one screen.',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100'
    },
    {
      icon: Smartphone,
      title: 'Works Everywhere',
      description: 'Progressive Web App that installs on your phone, tablet, or desktop. Works offline too.',
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      border: 'border-cyan-100'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Your Account',
      description: 'Sign up free with Google or email. No credit card required — get started in seconds.',
    },
    {
      number: '02',
      title: 'Set Up Your Farm',
      description: 'Name your farm, add your rabbit breeds, and configure your hutch layout. Guided onboarding walks you through it.',
    },
    {
      number: '03',
      title: 'Start Tracking',
      description: 'Add your rabbits, record matings, track pregnancies, and manage finances. The app handles calculations and alerts.',
    }
  ];

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* ========== NAVIGATION ========== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200/50">
                <Rabbit size={20} className="text-white" />
              </div>
              <span className={`text-xl font-bold tracking-tight ${scrolled ? 'text-gray-900' : 'text-white'}`}>
                BunnyTrack
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {['Features', 'Pricing', 'How It Works'].map(item => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item.toLowerCase().replace(/ /g, '-'))}
                  className={`text-sm font-medium transition-colors ${
                    scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
                  }`}
                >
                  {item}
                </button>
              ))}
              <button
                onClick={onDemo}
                className={`text-sm font-medium transition-colors ${
                  scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/80 hover:text-white'
                }`}
              >
                Try Demo
              </button>
              <button
                onClick={onGetStarted}
                className="px-5 py-2.5 bg-white text-emerald-700 text-sm font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-sm"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${scrolled ? 'text-gray-600' : 'text-white'}`}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            <div className="px-4 py-4 space-y-1">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Features</button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Pricing</button>
              <button onClick={() => scrollToSection('how-it-works')} className="block w-full text-left px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50">How It Works</button>
              <button onClick={() => { onDemo(); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 text-gray-700 font-medium rounded-lg hover:bg-gray-50">Try Demo</button>
              <div className="pt-2">
                <button onClick={() => { onGetStarted(); setMobileMenuOpen(false); }} className="w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700">Get Started Free</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-700" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
                            radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0%, transparent 60%)`
        }} />
        
        {/* Floating Decorative Elements */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-green-400/10 rounded-full blur-3xl" style={{ animation: 'pulse 4s ease-in-out infinite' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-sm text-emerald-100 font-medium mb-8">
                <Zap size={14} className="text-yellow-300" />
                Professional Farm Management Software
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
                The Smart Way to
                <span className="block mt-2 bg-gradient-to-r from-emerald-200 via-green-200 to-teal-200 bg-clip-text text-transparent">
                  Manage Your Rabbitry
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-emerald-100/90 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Track livestock, breeding programs, hutch occupancy, finances, and health records — all in one beautiful app built for serious rabbit farmers.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={onGetStarted}
                  className="group flex items-center justify-center gap-2 px-8 py-4 bg-white text-emerald-800 font-bold rounded-2xl text-lg shadow-2xl shadow-black/20 hover:shadow-emerald-900/30 hover:bg-emerald-50 transition-all"
                >
                  Get Started Free
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={onDemo}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/25 text-white font-semibold rounded-2xl text-lg hover:bg-white/20 transition-all"
                >
                  <PlayCircle size={20} />
                  Try Demo
                </button>
              </div>

              <div className="mt-10 flex items-center gap-6 justify-center lg:justify-start text-emerald-200/80 text-sm">
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-300" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-300" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-emerald-300" /> Works offline</span>
              </div>
            </div>

            {/* Right: Floating Dashboard Preview */}
            <div className="hidden lg:block relative">
              <div className="relative z-10">
                {/* Mock Dashboard Card */}
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <Rabbit size={22} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">Farm Dashboard</p>
                      <p className="text-xs text-gray-500">Real-time overview</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Rabbits', value: '47', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Pregnancies', value: '5', color: 'text-pink-600', bg: 'bg-pink-50' },
                      { label: 'Revenue', value: '₦85,000', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { label: 'Occupancy', value: '78%', color: 'text-amber-600', bg: 'bg-amber-50' },
                    ].map((stat, i) => (
                      <div key={i} className={`${stat.bg} rounded-xl p-4 border border-gray-100/50`} style={{ animation: `fadeInUp 0.5s ease-out ${i * 0.1}s both` }}>
                        <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                        <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                  {/* Mini Chart Placeholder */}
                  <div className="mt-4 h-20 bg-gray-50 rounded-xl flex items-end gap-1 px-4 pb-3">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500 to-emerald-300 rounded-t" style={{ height: `${h}%`, animation: `growUp 0.8s ease-out ${i * 0.05}s both` }} />
                    ))}
                  </div>
                </div>

                {/* Floating Card: Pregnancy Alert */}
                <div className="absolute -left-8 top-16 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 w-56 transform -rotate-3 hover:rotate-0 transition-transform" style={{ animation: 'float 3s ease-in-out infinite' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Heart size={16} className="text-pink-600 fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Delivery Due!</p>
                      <p className="text-[10px] text-gray-500">Doe "Ekiti" — Tomorrow</p>
                    </div>
                  </div>
                </div>

                {/* Floating Card: Sale */}
                <div className="absolute -right-4 bottom-8 bg-white rounded-2xl shadow-xl p-4 border border-gray-100 w-52 transform rotate-2 hover:rotate-0 transition-transform" style={{ animation: 'float 3.5s ease-in-out infinite reverse' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <DollarSign size={16} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Sale Recorded</p>
                      <p className="text-[10px] text-gray-500">3 rabbits — ₦15,000</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce">
          <ChevronDown size={28} />
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Everything You Need</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Professional Tools for
              <span className="text-emerald-600"> Serious Breeders</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 leading-relaxed">
              From daily record-keeping to long-term breeding strategy, BunnyTrack gives you the tools to run your farm like a business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group bg-white rounded-2xl p-8 border ${feature.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}
              >
                <div className={`w-14 h-14 ${feature.bg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon size={28} className={feature.color} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section id="how-it-works" className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Simple Setup</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Up and Running in
              <span className="text-emerald-600"> Minutes</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 leading-relaxed">
              No complicated setup. No training required. Just sign up and start managing your farm.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Connector Line */}
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-200 to-transparent" />
                )}
                <div className="inline-flex w-24 h-24 bg-gradient-to-br from-emerald-50 to-green-50 rounded-3xl items-center justify-center mb-6 border-2 border-emerald-100 group-hover:border-emerald-300 group-hover:shadow-lg group-hover:shadow-emerald-100 transition-all">
                  <span className="text-3xl font-extrabold bg-gradient-to-br from-emerald-600 to-green-500 bg-clip-text text-transparent">{step.number}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TRUST / STATS SECTION ========== */}
      <section className="py-20 bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, rgba(255,255,255,0.15) 0%, transparent 50%)`
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Built by Rabbit Farmers,<br />
              <span className="text-emerald-200">for Rabbit Farmers</span>
            </h2>
            <p className="mt-4 text-lg text-emerald-200/80 max-w-2xl mx-auto">
              We understand the unique challenges of running a rabbitry because we've been there. BunnyTrack was born from real farm experience.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Zap, value: '20+', label: 'Powerful Features', desc: 'Everything in one place' },
              { icon: Shield, value: '100%', label: 'Data Security', desc: 'Firebase-powered cloud' },
              { icon: Users, value: 'Free', label: 'To Get Started', desc: 'No credit card required' },
              { icon: Star, value: '24/7', label: 'Always Available', desc: 'Works offline too' },
            ].map((stat, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-6 text-center hover:bg-white/15 transition-colors">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <stat.icon size={24} className="text-emerald-300" />
                </div>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="text-sm font-semibold text-emerald-200 mt-1">{stat.label}</p>
                <p className="text-xs text-emerald-300/70 mt-1">{stat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== PRICING SECTION ========== */}
      <section id="pricing" className="py-24 lg:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <p className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3">Simple, Honest Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Plans That Grow
              <span className="text-emerald-600"> With Your Farm</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500 leading-relaxed">
              Start with a free 45-day trial — long enough to experience a full breeding cycle. No credit card needed.
            </p>
          </div>

          {/* Trial Banner */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-gradient-to-r from-emerald-600 to-green-500 rounded-2xl p-6 text-center text-white shadow-xl shadow-emerald-200/40">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock size={20} />
                <span className="font-bold text-lg">45-Day Free Trial</span>
              </div>
              <p className="text-emerald-100 text-sm max-w-lg mx-auto">
                A rabbit's gestation is 31 days. Our trial covers a full breeding cycle — enter a mating, get the palpation reminder, receive the delivery alert, and see your kits born. All features, zero restrictions.
              </p>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-semibold ${billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-emerald-500' : 'bg-gray-300'
              }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0.5'
              }`} />
            </button>
            <span className={`text-sm font-semibold ${billingCycle === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
              Yearly
              <span className="ml-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Save 17%</span>
            </span>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Tier 1: Hobby */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <Rabbit size={24} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Starter</h3>
                  <p className="text-sm text-gray-500">For hobby & backyard farms</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">
                    ₦{billingCycle === 'monthly' ? '1,500' : '1,250'}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-emerald-600 font-semibold mt-1">₦15,000 billed yearly (save ₦3,000)</p>
                )}
                <p className="text-sm text-gray-400 mt-2">Up to 30 active breeders</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Full livestock management',
                  'Hutch & occupancy tracking',
                  'Breeding program & alerts',
                  'Financial tracking',
                  'Dashboard & analytics',
                  'Cloud backup & sync',
                  'Works on all devices',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-3.5 bg-white border-2 border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors"
              >
                Start 45-Day Free Trial
              </button>
            </div>

            {/* Tier 2: Commercial (Featured) */}
            <div className="relative bg-gradient-to-b from-emerald-900 to-green-800 rounded-3xl p-8 shadow-2xl shadow-emerald-200/30 text-white">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-900 text-xs font-bold rounded-full shadow-lg">
                  <Crown size={14} />
                  BEST VALUE
                </div>
              </div>

              <div className="flex items-center gap-3 mb-6 mt-2">
                <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center">
                  <Warehouse size={24} className="text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Commercial</h3>
                  <p className="text-sm text-emerald-200">For serious breeders & operations</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">
                    ₦{billingCycle === 'monthly' ? '4,000' : '3,333'}
                  </span>
                  <span className="text-emerald-200">/month</span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-emerald-300 font-semibold mt-1">₦40,000 billed yearly (save ₦8,000)</p>
                )}
                <p className="text-sm text-emerald-300/80 mt-2">Unlimited rabbits</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Everything in Starter, plus:',
                  'Unlimited active breeders',
                  'Advanced breeding analytics',
                  'Customer & sale management',
                  'Data export & backup tools',
                  'Priority support',
                  'AI-powered farm insights',
                ].map((feat, i) => (
                  <li key={i} className={`flex items-center gap-3 text-sm ${i === 0 ? 'text-emerald-300 font-semibold' : 'text-emerald-100'}`}>
                    <Check size={16} className="text-emerald-400 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={onGetStarted}
                className="w-full py-3.5 bg-white text-emerald-800 font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
              >
                Start 45-Day Free Trial
              </button>
            </div>
          </div>

          {/* Value Proposition Callout */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl border border-amber-200 p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                <DollarSign size={32} className="text-amber-600" />
              </div>
              <div className="text-center sm:text-left">
                <h4 className="text-lg font-bold text-gray-900">Save one litter, pay for a whole year</h4>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                  Missing a delivery date can mean lost kits. Saving just one litter of 5 weaners at ₦3,000 each earns you ₦15,000 — <span className="font-semibold text-emerald-700">that covers an entire year of Starter</span>. The app pays for itself from day one.
                </p>
              </div>
            </div>
          </div>

          {/* After trial info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              After your trial, your account enters read-only mode — your data is always safe and accessible.
              <br />Subscribe anytime to continue managing your farm.
            </p>
          </div>
        </div>
      </section>

      {/* ========== FINAL CTA ========== */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex p-5 bg-emerald-50 rounded-3xl mb-8">
            <Rabbit size={48} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
            Ready to Transform<br />Your Rabbit Farm?
          </h2>
          <p className="mt-6 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Join farmers who are already using BunnyTrack to save time, reduce errors, and grow their rabbitry with confidence.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="group flex items-center justify-center gap-2 px-10 py-5 bg-gradient-to-r from-emerald-600 to-green-500 text-white font-bold rounded-2xl text-lg shadow-2xl shadow-emerald-200 hover:shadow-emerald-300 hover:from-emerald-700 hover:to-green-600 transition-all"
            >
              Start Managing Your Farm
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onDemo}
              className="flex items-center justify-center gap-2 px-10 py-5 bg-gray-100 text-gray-700 font-semibold rounded-2xl text-lg hover:bg-gray-200 transition-all"
            >
              <PlayCircle size={20} />
              Try Demo First
            </button>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                <Rabbit size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">BunnyTrack</span>
            </div>
            <p className="text-sm">© {new Date().getFullYear()} BunnyTrack. Professional Rabbit Farm Management.</p>
            <div className="flex items-center gap-6 text-sm">
              <button onClick={onGetStarted} className="hover:text-white transition-colors">Get Started</button>
              <button onClick={onDemo} className="hover:text-white transition-colors">Demo</button>
            </div>
          </div>
        </div>
      </footer>

      {/* ========== CSS ANIMATIONS ========== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-3deg); }
          50% { transform: translateY(-12px) rotate(-1deg); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes growUp {
          from { height: 0%; }
        }
      `}</style>
    </div>
  );
};
