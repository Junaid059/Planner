"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { 
  Calendar, 
  Timer, 
  Target, 
  BarChart3, 
  Brain, 
  Users,
  Zap,
  Bell,
  ArrowRight
} from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Smart Scheduling",
    description: "AI-powered scheduling that adapts to your learning style and optimizes study sessions for maximum retention.",
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Timer,
    title: "Pomodoro Timer",
    description: "Built-in focus timer with customizable work/break intervals to maintain peak productivity throughout your sessions.",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Target,
    title: "Goal Tracking",
    description: "Set academic goals, track your progress, and celebrate milestones as you achieve them one by one.",
    color: "from-green-500/20 to-green-500/5",
    iconColor: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description: "Detailed insights into your study habits, time spent per subject, and performance trends over time.",
    color: "from-purple-500/20 to-purple-500/5",
    iconColor: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: Brain,
    title: "Spaced Repetition",
    description: "Science-backed review system that helps you remember what you learn for longer with less effort.",
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: Users,
    title: "Study Groups",
    description: "Collaborate with classmates, share notes, and hold each other accountable with group study features.",
    color: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  {
    icon: Zap,
    title: "Quick Capture",
    description: "Instantly capture ideas, tasks, and notes from anywhere with our quick-add feature.",
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    icon: Bell,
    title: "Smart Reminders",
    description: "Intelligent notifications that remind you at the right time without being overwhelming.",
    color: "from-rose-500/20 to-rose-500/5",
    iconColor: "text-rose-500",
    bgColor: "bg-rose-500/10",
  },
];

// Animated text reveal
function AnimatedHeading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Feature card with hover effects
function FeatureCard({ 
  feature, 
  index 
}: { 
  feature: typeof features[0]; 
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.08,
        ease: [0.16, 1, 0.3, 1]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <motion.div 
        className={`h-full p-6 rounded-2xl bg-card border border-border/50 overflow-hidden relative`}
        whileHover={{ 
          y: -8,
          scale: 1.02,
          transition: { duration: 0.3 }
        }}
      >
        {/* Gradient background on hover */}
        <motion.div 
          className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0`}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />
        
        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%", skewX: -15 }}
          animate={isHovered ? { x: "200%" } : { x: "-100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Content */}
        <div className="relative z-10">
          {/* Icon with animation */}
          <motion.div 
            className={`w-14 h-14 rounded-2xl ${feature.bgColor} flex items-center justify-center mb-5`}
            animate={isHovered ? { 
              scale: 1.1,
              rotate: [0, -5, 5, 0]
            } : { scale: 1, rotate: 0 }}
            transition={{ duration: 0.4 }}
          >
            <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
          </motion.div>
          
          {/* Title with underline animation */}
          <h3 className="text-lg font-semibold mb-3 relative inline-block">
            {feature.title}
            <motion.div 
              className={`absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r ${feature.color.replace('/20', '').replace('/5', '')}`}
              initial={{ width: 0 }}
              animate={{ width: isHovered ? "100%" : 0 }}
              transition={{ duration: 0.3 }}
            />
          </h3>
          
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>

          {/* Learn more link */}
          <motion.div 
            className={`mt-4 flex items-center gap-2 text-sm font-medium ${feature.iconColor}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -10 }}
            transition={{ duration: 0.3 }}
          >
            <span>Learn more</span>
            <motion.span
              animate={isHovered ? { x: [0, 4, 0] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </motion.div>
        </div>

        {/* Corner decoration */}
        <motion.div
          className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full ${feature.bgColor} opacity-20 blur-2xl`}
          animate={isHovered ? { scale: 1.5, opacity: 0.4 } : { scale: 1, opacity: 0.2 }}
          transition={{ duration: 0.4 }}
        />
      </motion.div>
    </motion.div>
  );
}

export function FeaturesSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-32 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />
      </div>

      <div ref={sectionRef} className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <motion.span
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="section-badge inline-flex"
          >
            Features
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Everything you need to{" "}
            <motion.span 
              className="gradient-text"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              excel
            </motion.span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Powerful tools designed specifically for students to organize, focus, and achieve their academic goals.
          </motion.p>
        </div>

        {/* Features Grid */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard 
              key={feature.title} 
              feature={feature} 
              index={index}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-muted-foreground mb-4">
            And many more features to supercharge your study sessions
          </p>
          <motion.div
            className="inline-flex items-center gap-2 text-primary font-medium cursor-pointer group"
            whileHover={{ scale: 1.05 }}
          >
            <span>View all features</span>
            <motion.span
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ArrowRight className="w-4 h-4" />
            </motion.span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
