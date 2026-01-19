"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ArrowRight, Check } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create your account",
    description: "Sign up in seconds with your email or social accounts. No credit card required to get started.",
  },
  {
    number: "02", 
    title: "Set your goals",
    description: "Tell us what you want to achieve - exams, assignments, or skill development. We'll help you plan.",
  },
  {
    number: "03",
    title: "Build your schedule",
    description: "Our AI creates a personalized study schedule based on your goals, availability, and learning style.",
  },
  {
    number: "04",
    title: "Track & improve",
    description: "Monitor your progress with detailed analytics. Adjust your approach based on what's working.",
  },
  {
    number: "05",
    title: "Achieve your goals",
    description: "Stay consistent, hit your targets, and celebrate your academic success with confidence.",
  },
];

// Step card component with animations
function StepCard({ 
  step, 
  index, 
  isLast 
}: { 
  step: typeof steps[0]; 
  index: number;
  isLast: boolean;
}) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ 
        duration: 0.7, 
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div 
        className="relative z-10 text-center md:text-left"
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
      >
        {/* Step Number with animation */}
        <motion.div 
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border-2 border-border mb-4 relative overflow-hidden"
          animate={isHovered ? { 
            borderColor: "var(--primary)",
            scale: 1.05
          } : {
            borderColor: "var(--border)",
            scale: 1
          }}
          transition={{ duration: 0.3 }}
        >
          {/* Animated background fill */}
          <motion.div 
            className="absolute inset-0 bg-primary/10"
            initial={{ y: "100%" }}
            animate={isHovered ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.3 }}
          />
          
          <motion.span 
            className="text-2xl font-bold text-primary relative z-10"
            animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
          >
            {step.number}
          </motion.span>
          
          {/* Checkmark for completed effect */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-primary"
            initial={{ scale: 0 }}
            animate={isHovered ? { scale: 1 } : { scale: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Check className="w-8 h-8 text-white" />
          </motion.div>
        </motion.div>
        
        {/* Title with underline animation */}
        <h3 className="text-lg font-semibold mb-2 relative inline-block">
          {step.title}
          <motion.div
            className="absolute -bottom-1 left-0 h-0.5 bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={isHovered ? { width: "100%" } : { width: 0 }}
            transition={{ duration: 0.3 }}
          />
        </h3>
        
        {/* Description */}
        <motion.p 
          className="text-sm text-muted-foreground leading-relaxed"
          animate={isHovered ? { color: "var(--foreground)" } : {}}
        >
          {step.description}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorks() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-20 left-10 w-32 h-32 border border-primary/20 rounded-full"
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: "linear" },
            scale: { duration: 5, repeat: Infinity }
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-10 w-48 h-48 border border-primary/10 rounded-full"
          animate={{ 
            rotate: -360,
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            rotate: { duration: 25, repeat: Infinity, ease: "linear" },
            scale: { duration: 7, repeat: Infinity }
          }}
        />
        
        {/* Floating dots */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/30 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3]
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
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
            How It Works
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Start in{" "}
            <motion.span 
              className="gradient-text"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              5 simple
            </motion.span>
            {" "}steps
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Getting started is easy. Follow these steps to transform your study routine.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="mt-16 md:mt-20">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4">
            {steps.map((step, index) => (
              <StepCard 
                key={step.number} 
                step={step} 
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="mt-16 text-center"
        >
          <motion.div
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 rounded-full text-primary font-medium cursor-pointer group"
            whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 107, 53, 0.2)" }}
            whileTap={{ scale: 0.95 }}
          >
            <span>Ready to get started?</span>
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
