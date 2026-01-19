"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { GraduationCap, Users, Award, Clock, Brain, Target, BookOpen, Zap, TrendingUp, Calendar } from "lucide-react";

const features = [
  { name: "Smart Scheduling", icon: Calendar },
  { name: "AI-Powered", icon: Brain },
  { name: "Focus Timer", icon: Clock },
  { name: "Goal Tracking", icon: Target },
  { name: "Progress Analytics", icon: TrendingUp },
  { name: "Study Plans", icon: BookOpen },
  { name: "Quick Tasks", icon: Zap },
  { name: "Team Collaboration", icon: Users },
];

const stats = [
  { value: "10K+", label: "Active Users", icon: Users },
  { value: "4.9", label: "Average Rating", icon: Award },
  { value: "1M+", label: "Study Hours", icon: Clock },
  { value: "98%", label: "Satisfaction", icon: GraduationCap },
];

// Animated stat counter
function StatItem({ stat, index }: { stat: typeof stats[0]; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ 
        duration: 0.5, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="flex flex-col items-center gap-2 px-4 md:px-8"
    >
      <motion.div
        className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2"
        whileHover={{ scale: 1.1, rotate: 5 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <stat.icon className="w-5 h-5" />
      </motion.div>
      <motion.span 
        className="text-2xl md:text-3xl font-bold gradient-text"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
      >
        {stat.value}
      </motion.span>
      <span className="text-sm text-muted-foreground">{stat.label}</span>
    </motion.div>
  );
}

// Infinite scrolling row
function MarqueeRow({ direction = "left" }: { direction?: "left" | "right" }) {
  return (
    <div className="flex">
      <motion.div
        className="flex gap-8 md:gap-12"
        animate={{ 
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"]
        }}
        transition={{ 
          duration: 30,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        {[...features, ...features].map((feature, i) => (
          <motion.div
            key={`${feature.name}-${i}`}
            className="flex items-center gap-3 flex-shrink-0 px-6 py-3 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 group"
            whileHover={{ scale: 1.05, y: -2 }}
          >
            <feature.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
            <span className="text-lg font-semibold text-muted-foreground/60 group-hover:text-foreground transition-colors duration-300 whitespace-nowrap">
              {feature.name}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function TrustedBy() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [50, 0]);

  return (
    <section 
      ref={containerRef}
      className="py-16 md:py-24 border-y border-border/50 relative overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/30 via-background to-secondary/30" />
      
      {/* Animated gradient orbs */}
      <motion.div
        className="absolute top-1/2 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.div 
        style={{ opacity, y }}
        className="max-w-7xl mx-auto px-6 relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-4"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Trusted Worldwide</span>
          </motion.div>
          
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-2xl md:text-3xl font-semibold tracking-tight"
          >
            Students from <span className="gradient-text">100+ universities</span> worldwide
          </motion.h3>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-wrap justify-center gap-4 md:gap-0 md:divide-x divide-border/50 mb-12"
        >
          {stats.map((stat, index) => (
            <StatItem key={stat.label} stat={stat} index={index} />
          ))}
        </motion.div>

        {/* Logo Marquee */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none" />
          
          <div className="space-y-4">
            <MarqueeRow direction="left" />
            <MarqueeRow direction="right" />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
