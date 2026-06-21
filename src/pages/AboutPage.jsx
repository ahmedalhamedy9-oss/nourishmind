import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Brain, Leaf, Award, Users, Globe } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const VAL_ICONS = [Brain, Heart, Leaf];

const DEFAULT = {
  badge: 'Our Story',
  headline1: 'We Believe Food is',
  headline2: 'Medicine for the Mind',
  intro: "NourishMind was born from a simple but powerful idea: that what we eat profoundly shapes how we think, feel, and heal. We're on a mission to make evidence-based nutritional psychiatry accessible to everyone — in Arabic and English.",
  stat1_value:'50,000+', stat1_label:'Students',
  stat2_value:'AR / EN', stat2_label:'Languages',
  stat3_value:'4.8 ★',  stat3_label:'Average Rating',
  stat4_value:'30+',    stat4_label:'Expert Courses',
  val1_title:'Science-First',   val1_desc:'Every course is grounded in peer-reviewed research. We never compromise on evidence quality.',
  val2_title:'Human-Centered',  val2_desc:'We design for real people navigating real struggles — with compassion and cultural sensitivity.',
  val3_title:'Holistic Approach',val3_desc:'Mind, body, and nutrition are inseparable. Our curriculum reflects that integration at every level.',
  team: [],
};

const STAT_ICONS = [Users, Globe, Award, Brain];

const AboutPage = () => {
  const [data, setData] = useState(DEFAULT);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'about'))
      .then(snap => { if (snap.exists()) setData(d => ({ ...d, ...snap.data() })); })
      .catch(() => {});
  }, []);

  const stats = [
    { icon: STAT_ICONS[0], value: data.stat1_value, label: data.stat1_label },
    { icon: STAT_ICONS[1], value: data.stat2_value, label: data.stat2_label },
    { icon: STAT_ICONS[2], value: data.stat3_value, label: data.stat3_label },
    { icon: STAT_ICONS[3], value: data.stat4_value, label: data.stat4_label },
  ];

  const values = [
    { icon: VAL_ICONS[0], title: data.val1_title, desc: data.val1_desc },
    { icon: VAL_ICONS[1], title: data.val2_title, desc: data.val2_desc },
    { icon: VAL_ICONS[2], title: data.val3_title, desc: data.val3_desc },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6 }}>
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
              <Heart className="w-3.5 h-3.5" /> {data.badge}
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white mb-6 leading-tight">
              {data.headline1}<br /><span className="text-primary">{data.headline2}</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">{data.intro}</p>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-4 sm:px-12 border-y border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.1 }} className="text-center">
              <s.icon className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-3xl font-extrabold text-white">{s.value}</p>
              <p className="text-gray-400 text-sm">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-12 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {values.map((item, i) => (
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
          {(data.team || []).map((member, i) => (
            <motion.div key={i}
              initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }}
              transition={{ delay:i*0.1 }} viewport={{ once:true }}
              className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/40 transition-colors">
              {member.avatar
                ? <img src={member.avatar} alt={member.name} style={{width:80,height:80,borderRadius:'50%',objectFit:'cover',margin:'0 auto 16px',border:'2px solid rgba(74,155,142,0.3)',display:'block'}} />
                : <div style={{width:80,height:80,borderRadius:'50%',background:'rgba(74,155,142,0.15)',display:'flex',alignItems:'center',justifyContent:'center',color:'#5fbfb0',fontWeight:700,fontSize:28,margin:'0 auto 16px'}}>{member.name?.[0]||'?'}</div>
              }
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
};

export default AboutPage;
