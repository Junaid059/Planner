"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Sparkles, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "$0",
    period: "forever",
    icon: Zap,
    features: [
      "Up to 10 study plans",
      "Basic task management",
      "Pomodoro timer",
      "Weekly progress reports",
      "Mobile app access",
    ],
    cta: "Get Started",
    highlighted: false,
    gradient: "from-gray-500/10 to-gray-500/5",
  },
  {
    name: "Pro",
    description: "For serious students",
    price: "$9",
    period: "/month",
    icon: Sparkles,
    features: [
      "Unlimited study plans",
      "Advanced analytics",
      "AI-powered scheduling",
      "Spaced repetition system",
      "Study groups",
      "Priority support",
      "Calendar integrations",
      "Custom themes",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    gradient: "from-primary/20 to-primary/5",
  },
  {
    name: "Team",
    description: "For study groups & tutors",
    price: "$29",
    period: "/month",
    icon: Crown,
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Shared study plans",
      "Group analytics",
      "Admin dashboard",
      "API access",
    ],
    cta: "Contact Sales",
    highlighted: false,
    gradient: "from-purple-500/10 to-purple-500/5",
  },
];

// Pricing card component
function PricingCard({ 
  plan, 
  index 
}: { 
  plan: typeof plans[0]; 
  index: number;
}) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{ 
        duration: 0.7, 
        delay: index * 0.15,
        ease: [0.16, 1, 0.3, 1]
      }}
      className={`relative ${plan.highlighted ? "md:-mt-8 md:mb-8 z-10" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Popular Badge with animation */}
      {plan.highlighted && (
        <motion.div 
          className="absolute -top-5 left-1/2 -translate-x-1/2 z-20"
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ delay: 0.5, type: "spring" }}
        >
          <motion.span 
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-white text-sm font-medium shadow-lg"
            animate={{ 
              boxShadow: isHovered 
                ? "0 10px 40px rgba(255, 107, 53, 0.4)" 
                : "0 4px 20px rgba(255, 107, 53, 0.3)"
            }}
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.span>
            Most Popular
          </motion.span>
        </motion.div>
      )}
      
      <motion.div 
        className={`h-full p-8 rounded-3xl border overflow-hidden relative ${
          plan.highlighted 
            ? "bg-card border-primary/30" 
            : "bg-card border-border/50"
        }`}
        animate={isHovered ? { 
          y: -10,
          scale: 1.02,
        } : { y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background gradient */}
        <motion.div 
          className={`absolute inset-0 bg-gradient-to-br ${plan.gradient}`}
          animate={{ opacity: isHovered ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        />

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%", skewX: -15 }}
          animate={isHovered ? { x: "200%" } : { x: "-100%" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />

        {/* Border glow for highlighted */}
        {plan.highlighted && (
          <motion.div
            className="absolute inset-0 rounded-3xl"
            animate={{
              boxShadow: isHovered 
                ? "inset 0 0 0 2px rgba(255, 107, 53, 0.5), 0 20px 60px rgba(255, 107, 53, 0.2)" 
                : "inset 0 0 0 1px rgba(255, 107, 53, 0.3), 0 10px 40px rgba(255, 107, 53, 0.1)"
            }}
            transition={{ duration: 0.3 }}
          />
        )}

        <div className="relative z-10">
          {/* Plan Icon & Name */}
          <div className="flex items-center gap-3 mb-2">
            <motion.div 
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                plan.highlighted ? "bg-primary/20" : "bg-secondary"
              }`}
              animate={isHovered ? { rotate: [0, -10, 10, 0], scale: 1.1 } : { rotate: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <plan.icon className={`w-5 h-5 ${plan.highlighted ? "text-primary" : "text-muted-foreground"}`} />
            </motion.div>
            <h3 className="text-xl font-semibold">{plan.name}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

          {/* Price with counter animation */}
          <div className="mb-6">
            <motion.span 
              className="text-5xl md:text-6xl font-bold"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
            >
              {plan.price}
            </motion.span>
            <span className="text-muted-foreground ml-1">{plan.period}</span>
          </div>

          {/* CTA Button */}
          <Link href="/signup" className="block mb-8">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button 
                className={`w-full h-14 rounded-xl font-medium text-base relative overflow-hidden ${
                  plan.highlighted 
                    ? "bg-primary hover:bg-primary/90 text-white shine-button" 
                    : "bg-foreground hover:bg-foreground/90 text-background"
                }`}
              >
                <span className="relative z-10 flex items-center gap-2">
                  {plan.cta}
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.span>
                </span>
              </Button>
            </motion.div>
          </Link>

          {/* Features List */}
          <ul className="space-y-3">
            {plan.features.map((feature, featureIndex) => (
              <motion.li 
                key={feature} 
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.15 + 0.4 + featureIndex * 0.05 }}
              >
                <motion.div
                  className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    plan.highlighted ? "bg-primary/20" : "bg-secondary"
                  }`}
                  whileHover={{ scale: 1.2 }}
                >
                  <Check className={`w-3 h-3 ${plan.highlighted ? "text-primary" : "text-foreground"}`} />
                </motion.div>
                <span className="text-sm text-muted-foreground">{feature}</span>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Corner decoration */}
        <motion.div
          className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full ${
            plan.highlighted ? "bg-primary/10" : "bg-muted/50"
          } blur-3xl`}
          animate={isHovered ? { scale: 1.5, opacity: 0.8 } : { scale: 1, opacity: 0.4 }}
          transition={{ duration: 0.4 }}
        />
      </motion.div>
    </motion.div>
  );
}

export function PricingSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-24 md:py-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, delay: 2 }}
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
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
            Pricing
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Simple,{" "}
            <motion.span 
              className="gradient-text"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              transparent
            </motion.span>
            {" "}pricing
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-lg text-muted-foreground"
          >
            Start free and upgrade when you need more. No hidden fees, cancel anytime.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          {plans.map((plan, index) => (
            <PricingCard key={plan.name} plan={plan} index={index} />
          ))}
        </div>

        {/* Money Back Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <motion.div 
            className="inline-flex items-center gap-3 px-6 py-3 bg-secondary/50 rounded-full"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <span className="text-sm text-muted-foreground">
              All paid plans include a <span className="text-foreground font-medium">14-day free trial</span>. 30-day money-back guarantee.
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
