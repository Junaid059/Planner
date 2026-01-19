"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowRight, Sparkles, Rocket } from "lucide-react";

// Animated counter
function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      let startTime: number;
      const duration = 2000;
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
  }, [end, isInView]);

  return (
    <span ref={ref} className="font-bold">
      {count}{suffix}
    </span>
  );
}

// Floating avatar with animation
function FloatingAvatar({ 
  initials, 
  index, 
  total 
}: { 
  initials: string; 
  index: number; 
  total: number;
}) {
  return (
    <motion.div
      className="w-12 h-12 rounded-full bg-primary/20 border-2 border-foreground flex items-center justify-center relative"
      initial={{ opacity: 0, scale: 0, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 15
      }}
      style={{ zIndex: total - index }}
      whileHover={{ 
        scale: 1.2, 
        zIndex: 100,
        transition: { duration: 0.2 }
      }}
    >
      <span className="text-sm font-semibold text-primary">{initials}</span>
      
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/50"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.5, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: index * 0.3
        }}
      />
    </motion.div>
  );
}

export function CTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const avatars = ["SC", "MJ", "ER", "JP", "PS"];

  return (
    <section className="py-24 md:py-32 bg-foreground text-background relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <motion.div 
          className="absolute inset-0 opacity-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.05 }}
          transition={{ duration: 1 }}
        >
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </motion.div>

        {/* Animated gradient orbs */}
        <motion.div 
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />

        {/* Floating particles */}
        {[
          { left: 10, top: 20, duration: 6, delay: 0 },
          { left: 25, top: 80, duration: 7, delay: 1 },
          { left: 40, top: 15, duration: 8, delay: 2 },
          { left: 55, top: 70, duration: 5, delay: 0.5 },
          { left: 70, top: 30, duration: 9, delay: 3 },
          { left: 85, top: 60, duration: 6, delay: 1.5 },
          { left: 15, top: 50, duration: 7, delay: 2.5 },
          { left: 30, top: 90, duration: 8, delay: 4 },
          { left: 60, top: 40, duration: 5, delay: 0.8 },
          { left: 75, top: 85, duration: 6, delay: 1.2 },
          { left: 90, top: 25, duration: 7, delay: 3.5 },
          { left: 5, top: 65, duration: 8, delay: 2.2 },
          { left: 45, top: 95, duration: 9, delay: 4.5 },
          { left: 80, top: 10, duration: 6, delay: 0.3 },
          { left: 50, top: 55, duration: 7, delay: 1.8 },
        ].map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary/40 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay
            }}
          />
        ))}
      </div>

      <div ref={sectionRef} className="max-w-4xl mx-auto px-6 relative z-10">
        <div className="text-center">
          {/* Avatar Stack with enhanced animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="flex -space-x-3">
              {avatars.map((initials, i) => (
                <FloatingAvatar 
                  key={initials} 
                  initials={initials} 
                  index={i}
                  total={avatars.length}
                />
              ))}
              <motion.div 
                className="w-12 h-12 rounded-full bg-primary border-2 border-foreground flex items-center justify-center z-0 relative overflow-hidden"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: avatars.length * 0.1, type: "spring" }}
                whileHover={{ scale: 1.1 }}
              >
                <span className="text-sm font-semibold text-white relative z-10">
                  +<AnimatedCounter end={9} />k
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
              </motion.div>
            </div>
          </motion.div>

          {/* Main Heading with character animation */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Ready to transform your{" "}
            <motion.span 
              className="text-primary relative"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              study routine
              <motion.span
                className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.6, delay: 0.6 }}
              />
            </motion.span>
            ?
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg text-background/70 max-w-2xl mx-auto"
          >
            Join thousands of students who are already studying smarter, not harder.
            Get started for free today.
          </motion.p>

          {/* CTA Buttons with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/signup">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  size="lg" 
                  className="bg-primary hover:bg-primary/90 text-white h-14 px-8 text-base font-medium rounded-xl shine-button relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Rocket className="w-5 h-5" />
                    </motion.span>
                    Start for free
                    <motion.span
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </motion.span>
                  </span>
                </Button>
              </motion.div>
            </Link>
            
            <Link href="#pricing">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button 
                  variant="outline" 
                  size="lg"
                  className="h-14 px-8 text-base font-medium rounded-xl border-background/20 text-background hover:bg-background/10 hover:text-background group relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    View pricing
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </span>
                  <motion.div
                    className="absolute inset-0 bg-background/5"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-background/50"
          >
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05, color: "rgba(255,255,255,0.8)" }}
            >
              <motion.span
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-4 h-4" />
              </motion.span>
              <span>No credit card required</span>
            </motion.div>
            <motion.div 
              className="flex items-center gap-2"
              whileHover={{ scale: 1.05, color: "rgba(255,255,255,0.8)" }}
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Free forever plan available</span>
            </motion.div>
          </motion.div>

          {/* Decorative bottom element */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 flex justify-center"
          >
            <div className="w-32 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
