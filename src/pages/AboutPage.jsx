import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Brain, Leaf, Award, Users, Globe } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const TEAM = [
  { name: 'Dr. Ahmed Al-Hamedy', role: 'Founder & Lead Psychiatrist', bio: 'Psychiatrist and founder of Dawn for Mental Health. Pioneer of nutritional psychiatry in the Arabic-speaking world.', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&q=80' },
  { name: 'Dr. Sarah Ahmed', role: 'Head of Nutrition', bio: 'Clinical nutritionist with 15 years of experience integrating diet and mental wellness.', avatar: 'https://images.unsplash.com/photo-1659301254614-8d6a9d46f26a?w=200&q=80' },
  { name: 'Dr. Layla Mansour', role: 'Psychotherapy Lead', bio: 'Specialist in CBT and mindfulness-based interventions for anxiety and depression.', avatar: 'https://images.unsplash.com/photo-1612944095914-33fd0a85fcfc?w=200&q=80' },
];

const STATS = [
  { icon: Users, value: '50,000+', label: 'Students' },
  { icon: Globe, value: 'AR / EN', label: 'Languages' },
  { icon: Award, value: '4.8 ★', label: 'Average Rating' },
  { icon: Brain, value: '30+', label: 'Expert Courses' },
];

const AboutPage = () => (
  <div className="min-h-screen bg-background">
    <Header />

    {/* Hero */}
    <section className="relative pt-32 pb-20 px-4 sm:px-12 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Heart className="w-3.5 h-3.5" /> Our Story
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
            We Believe Food is<br /><span className="text-primary">Medicine for the Mind</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
            NourishMind was born from a simple but powerful idea: that what we eat profoundly shapes how we think, feel, and heal. We're on a mission to make evidence-based nutritional psychiatry accessible to everyone — in Arabic and English.
          </p>
        </motion.div>
      </div>
    </section>

    {/* Stats */}
    <section className="py-12 px-4 sm:px-12 border-y border-border">
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
        {STATS.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="text-center">
            <s.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-extrabold text-white">{s.value}</p>
            <p className="text-gray-400 text-sm">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Mission */}
    <section className="py-20 px-4 sm:px-12 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Brain, title: 'Science-First', desc: 'Every course is grounded in peer-reviewed research. We never compromise on evidence quality.' },
          { icon: Heart, title: 'Human-Centered', desc: 'We design for real people navigating real struggles — with compassion and cultural sensitivity.' },
          { icon: Leaf, title: 'Holistic Approach', desc: 'Mind, body, and nutrition are inseparable. Our curriculum reflects that integration at every level.' },
        ].map((item, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-7 hover:border-primary/40 transition-colors">
            <div className="w-12 h-12 bg-primary/15 rounded-xl flex items-center justify-center mb-4">
              <item.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
            <p className="text-gray-400 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Team */}
    <section className="py-16 px-4 sm:px-12 max-w-6xl mx-auto">
      <h2 className="text-3xl font-extrabold text-white mb-10 text-center">Meet the Team</h2>
      <div className="grid sm:grid-cols-3 gap-6">
        {TEAM.map((member, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
            className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
            <img src={member.avatar} alt={member.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-2 border-primary/30" />
            <h3 className="text-white font-bold">{member.name}</h3>
            <p className="text-primary text-sm font-semibold mb-3">{member.role}</p>
            <p className="text-gray-400 text-sm leading-relaxed">{member.bio}</p>
          </motion.div>
        ))}
      </div>
    </section>

    <Footer />
  </div>
);

export default AboutPage;
