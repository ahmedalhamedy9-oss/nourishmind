import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Star, Lock } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const DEFAULT_PLANS = [
  {
    id: 'single',
    name: 'Single Course',
    price_usd: 49,
    period: 'one-time',
    description: 'Perfect for exploring one topic in depth.',
    icon: 'Zap',
    color: 'border-white/20',
    features: [
      'Access to 1 course of your choice',
      'Certificate of completion',
      'Lifetime access to purchased course',
      'Mobile & desktop access',
    ],
    cta: 'Buy a Course',
    highlighted: false,
  },
  {
    id: 'quarterly',
    name: 'Quarterly Plan',
    price_usd: 89,
    period: '3 months',
    description: 'Full access to all subscription courses for 3 months.',
    icon: 'Star',
    color: 'border-primary',
    features: [
      'Access to ALL subscription courses',
      'New courses added monthly',
      'All certificates included',
      'Priority support',
      'Download for offline viewing',
    ],
    cta: 'Start Quarterly',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    id: 'annual',
    name: 'Annual Plan',
    price_usd: 249,
    period: 'per year',
    description: 'Best value — save 30% compared to quarterly.',
    icon: 'Crown',
    color: 'border-yellow-500/40',
    features: [
      'Everything in Quarterly',
      'Save 30% vs quarterly',
      'Early access to new courses',
      'Live Q&A sessions',
      '1-on-1 consultation (monthly)',
    ],
    cta: 'Get Annual Access',
    highlighted: false,
    badge: 'Best Value',
  },
];

const IconMap = { Zap, Star, Crown };

const PricingPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'pricing'),
      snap => { if (snap.exists()) setPlans(snap.data().plans || DEFAULT_PLANS); },
      () => {}
    );
    return unsub;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section className="pt-32 pb-16 px-4 sm:px-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-primary text-xs font-bold uppercase tracking-widest mb-3">Pricing</p>
          <h1 className="text-5xl font-extrabold text-white mb-4">Simple, Transparent Pricing</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Choose what works for you — a single course or full platform access.</p>
        </motion.div>
      </section>

      <section className="pb-20 px-4 sm:px-12 max-w-6xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-6">
          {plans.map((plan, i) => {
            const Icon = IconMap[plan.icon] || Star;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative bg-card border-2 ${plan.color} rounded-2xl p-7 flex flex-col ${plan.highlighted ? 'shadow-[0_0_40px_hsl(173_38%_44%_/_0.2)]' : ''}`}
              >
                {plan.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-black px-4 py-1 rounded-full uppercase tracking-wide ${plan.highlighted ? 'bg-primary text-white' : 'bg-yellow-500 text-black'}`}>
                    {plan.badge}
                  </span>
                )}

                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${plan.highlighted ? 'bg-primary/20' : 'bg-white/5'}`}>
                  <Icon className={`w-6 h-6 ${plan.highlighted ? 'text-primary' : 'text-gray-300'}`} />
                </div>

                <h3 className="text-white font-extrabold text-xl mb-1">{plan.name}</h3>
                <p className="text-gray-400 text-sm mb-5">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-white">${plan.price_usd}</span>
                  <span className="text-gray-400 text-sm ml-2">/ {plan.period}</span>
                </div>

                <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                  {plan.features?.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => navigate('/signup')}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${plan.highlighted ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_0_20px_hsl(173_38%_44%_/_0.3)]' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                >
                  {plan.cta}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Note */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-xl px-5 py-3 text-gray-400 text-sm">
            <Lock className="w-4 h-4 text-primary" />
            Secure payment coming soon — contact us to enroll
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
