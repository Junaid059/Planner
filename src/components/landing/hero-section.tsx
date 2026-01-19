"use client";

import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  ChevronRight, 
  Calendar, 
  Clock, 
  Target, 
  Sparkles,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Play
} from "lucide-react";

// Animated counter hook
function useCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!startOnView || isInView) {
      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(easeOut * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    }
  }, [end, duration, isInView, startOnView]);

  return { count, ref };
}

// Character reveal animation component
function AnimatedText({ 
  text, 
  className = "", 
  delay = 0,
  staggerChildren = 0.03
}: { 
  text: string; 
  className?: string;
  delay?: number;
  staggerChildren?: number;
}) {
  const words = text.split(" ");
  
  return (
    <motion.span className={className}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="inline-block whitespace-nowrap">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              className="inline-block"
              initial={{ opacity: 0, y: 50, rotateX: -90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: 0.6,
                delay: delay + (wordIndex * word.length + charIndex) * staggerChildren,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {char}
            </motion.span>
          ))}
          {wordIndex < words.length - 1 && <span>&nbsp;</span>}
        </span>
      ))}
    </motion.span>
  );
}

// Magnetic button component
function MagneticButton({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouse = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current!.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.1, y: middleY * 0.1 });
  };

  const reset = () => setPosition({ x: 0, y: 0 });

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 350, damping: 15 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const floatingCards = [
  {
    icon: Calendar,
    label: "Smart Schedule",
    position: "top-32 -left-4 md:left-8",
    rotation: -6,
    delay: 0,
  },
  {
    icon: Target,
    label: "Goal Tracking",
    position: "top-48 -right-4 md:right-8",
    rotation: 6,
    delay: 0.1,
  },
  {
    icon: Clock,
    label: "Pomodoro Timer",
    position: "bottom-32 -left-4 md:left-16",
    rotation: -3,
    delay: 0.2,
  },
  {
    icon: TrendingUp,
    label: "Analytics",
    position: "bottom-24 -right-4 md:right-20",
    rotation: 4,
    delay: 0.3,
  },
];

function FloatingCard({ 
  icon: Icon, 
  label, 
  position, 
  rotation, 
  delay 
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  position: string;
  rotation: number;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.8, rotate: 0 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        rotate: rotation,
      }}
      transition={{ 
        duration: 1, 
        delay: 0.8 + delay,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={`absolute ${position} hidden lg:flex z-20`}
    >
      <motion.div 
        className="floating-card px-4 py-3 flex items-center gap-3 backdrop-blur-sm"
        animate={{ 
          y: [0, -15, 0],
          rotate: [rotation, rotation + 2, rotation]
        }}
        transition={{
          duration: 5 + delay * 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.05, rotate: 0 }}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <span className="text-sm font-medium pr-2">{label}</span>
      </motion.div>
    </motion.div>
  );
}

// Stats counter section
function StatsSection() {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  
  const stats = [
    { value: 10, suffix: "K+", label: "Active Students" },
    { value: 98, suffix: "%", label: "Satisfaction Rate" },
    { value: 1, suffix: "M+", label: "Tasks Completed" },
  ];

  return (
    <motion.div 
      ref={containerRef}
      className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.5 }}
    >
      {stats.map((stat, index) => (
        <motion.div 
          key={stat.label}
          className="text-center"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
        >
          <div className="flex items-baseline justify-center gap-1">
            <CounterNumber end={stat.value} />
            <span className="text-3xl md:text-4xl font-bold text-primary">{stat.suffix}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

function CounterNumber({ end }: { end: number }) {
  const { count, ref } = useCounter(end, 2000);
  return (
    <span ref={ref} className="text-3xl md:text-4xl font-bold counter-number">
      {count}
    </span>
  );
}

// Animated curved lines background
function AnimatedBackground() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, 50]);
  const opacity = useTransform(scrollY, [0, 300], [0.6, 0.2]);

  return (
    <motion.div className="curved-bg" style={{ opacity }}>
      <svg
        viewBox="0 0 1440 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <motion.path
          d="M-100 200C200 200 400 350 700 350C1000 350 1200 200 1500 200"
          stroke="currentColor"
          strokeWidth="1"
          className="text-border"
          fill="none"
          style={{ y: y1 }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        <motion.path
          d="M-100 350C200 350 400 500 700 500C1000 500 1200 350 1500 350"
          stroke="currentColor"
          strokeWidth="1"
          className="text-border"
          fill="none"
          style={{ y: y2 }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.3, ease: "easeInOut" }}
        />
        <motion.path
          d="M-100 500C200 500 400 650 700 650C1000 650 1200 500 1500 500"
          stroke="currentColor"
          strokeWidth="1"
          className="text-border"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, delay: 0.6, ease: "easeInOut" }}
        />
      </svg>
      
      {/* Animated gradient orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          x: [0, -30, 0],
          y: [0, -50, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </motion.div>
  );
}

export function HeroSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-mesh"
    >
      <AnimatedBackground />
      
      {/* Floating Cards */}
      {floatingCards.map((card) => (
        <FloatingCard key={card.label} {...card} />
      ))}

      <motion.div 
        className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20"
        style={{ y, opacity, scale }}
      >
        <div className="flex flex-col items-center text-center">
          {/* Badge with shimmer effect */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.span 
              className="section-badge relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
              <span className="relative z-10">Study Planner</span>
            </motion.span>
          </motion.div>

          {/* Main Headline with character animation */}
          <motion.div
            className="mt-8 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight max-w-4xl text-balance">
              <AnimatedText text="Study smarter," delay={0.3} />
              <br className="hidden sm:block" />
              <AnimatedText text="achieve" delay={0.6} />
              {" "}
              <motion.span 
                className="gradient-text inline-block"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
              >
                more
              </motion.span>
            </h1>
          </motion.div>

          {/* Subheadline with blur fade in */}
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl text-balance"
          >
            The all-in-one study platform that helps students organize their learning,
            track progress, and reach their academic goals faster.
          </motion.p>

          {/* CTA Buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 flex flex-col sm:flex-row items-center gap-4"
          >
            <MagneticButton>
              <Link href="/signup">
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white h-14 px-8 text-base font-medium rounded-xl shine-button animate-glow-pulse group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start for free
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.span>
                  </span>
                </Button>
              </Link>
            </MagneticButton>
            
            <MagneticButton>
              <Link href="#how-it-works">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-xl border-border group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    See how it works
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-primary/5"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </Link>
            </MagneticButton>
          </motion.div>

          {/* Trust Indicators with stagger animation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
          >
            {[
              { icon: CheckCircle2, text: "Free forever plan" },
              { icon: CheckCircle2, text: "No credit card required" },
              { icon: CheckCircle2, text: "10,000+ students" }
            ].map((item, index) => (
              <motion.div
                key={item.text}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.05, color: "var(--primary)" }}
              >
                <item.icon className="w-4 h-4 text-primary" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats Counter Section */}
          <StatsSection />

          {/* Hero Image/Dashboard Preview with 3D effect */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.2, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 md:mt-20 w-full max-w-5xl"
            style={{ perspective: 1000 }}
          >
            <motion.div 
              className="relative"
              whileHover={{ rotateX: 2, rotateY: -2, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {/* Animated Glow Effect */}
              <motion.div 
                className="absolute -inset-4 bg-gradient-to-r from-primary/30 via-primary/10 to-primary/30 rounded-3xl blur-2xl"
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.05, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              
              {/* Dashboard Preview Card */}
              <div className="relative floating-card overflow-hidden rounded-2xl border border-border/50 shadow-2xl">
                <div className="bg-card p-1">
                  {/* Browser Chrome */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
                    <div className="flex items-center gap-1.5">
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-red-400"
                        whileHover={{ scale: 1.3 }}
                      />
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-yellow-400"
                        whileHover={{ scale: 1.3 }}
                      />
                      <motion.div 
                        className="w-3 h-3 rounded-full bg-green-400"
                        whileHover={{ scale: 1.3 }}
                      />
                    </div>
                    <div className="flex-1 mx-4">
                      <motion.div 
                        className="w-full max-w-sm mx-auto h-7 bg-secondary rounded-lg flex items-center px-3 gap-2"
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                        <span className="text-xs text-muted-foreground">studyflow.app/dashboard</span>
                      </motion.div>
                    </div>
                  </div>

                  {/* Dashboard Content Preview */}
                  <div className="p-6 md:p-8 bg-background/50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Stats Cards with stagger animation */}
                      {[
                        { icon: BookOpen, value: "24", label: "Study hours this week", color: "bg-primary/10 text-primary" },
                        { icon: Target, value: "12", label: "Tasks completed", color: "bg-green-500/10 text-green-500" },
                        { icon: Sparkles, value: "87%", label: "Weekly goal progress", color: "bg-blue-500/10 text-blue-500" }
                      ].map((stat, index) => (
                        <motion.div 
                          key={stat.label}
                          className="bg-card rounded-xl p-4 border border-border/50 premium-card"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                          whileHover={{ y: -5, scale: 1.02 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                              <stat.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-2xl font-semibold">{stat.value}</p>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Progress Bar with animation */}
                    <motion.div 
                      className="mt-6 bg-card rounded-xl p-4 border border-border/50"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.3 }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium">Today&apos;s Progress</span>
                        <span className="text-sm text-muted-foreground">6/8 tasks</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: "75%" }}
                          transition={{ duration: 1.5, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
                        />
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
