"use client";

import { motion, useInView, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

interface Testimonial {
  content: string;
  author: string;
  role: string;
  rating: number;
  avatar: string;
}

const testimonials: Testimonial[] = [
  {
    content: "StudyFlow completely transformed how I prepare for exams. The AI scheduling is incredibly smart - it knows exactly when I need to review material. My grades have improved significantly!",
    author: "Sarah Chen",
    role: "Medical Student",
    rating: 5,
    avatar: "SC",
  },
  {
    content: "As someone with ADHD, staying organized was always a struggle. The Pomodoro timer and task breakdown features help me stay focused without feeling overwhelmed. Game changer!",
    author: "Marcus Johnson",
    role: "Computer Science Student",
    rating: 5,
    avatar: "MJ",
  },
  {
    content: "I used to spend hours planning my study schedule. Now StudyFlow does it for me in seconds. More time studying, less time planning. Worth every penny.",
    author: "Emma Rodriguez",
    role: "Law Student",
    rating: 5,
    avatar: "ER",
  },
  {
    content: "The analytics feature opened my eyes to how I was actually spending my time. Made small adjustments based on the data and saw immediate improvements.",
    author: "James Park",
    role: "Engineering Student",
    rating: 5,
    avatar: "JP",
  },
  {
    content: "Study groups feature is perfect for our project teams. We can see each other's progress and keep everyone accountable. Collaboration made easy.",
    author: "Priya Sharma",
    role: "Business Student",
    rating: 5,
    avatar: "PS",
  },
  {
    content: "Clean interface, powerful features, and actually affordable. I've tried every study app out there - this is the only one I've stuck with for more than a month.",
    author: "Alex Thompson",
    role: "Graduate Student",
    rating: 5,
    avatar: "AT",
  },
];

// Infinite marquee row
function MarqueeRow({ 
  testimonials, 
  direction = "left", 
  speed = 30 
}: { 
  testimonials: Testimonial[];
  direction?: "left" | "right";
  speed?: number;
}) {
  return (
    <div className="relative overflow-hidden py-4">
      <motion.div
        className="flex gap-6"
        animate={{ 
          x: direction === "left" ? [0, -2000] : [-2000, 0]
        }}
        transition={{
          x: {
            duration: speed,
            repeat: Infinity,
            ease: "linear"
          }
        }}
      >
        {/* Duplicate testimonials for seamless loop */}
        {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
          <TestimonialCard key={`${testimonial.author}-${index}`} testimonial={testimonial} />
        ))}
      </motion.div>
    </div>
  );
}

// Individual testimonial card
function TestimonialCard({ testimonial }: { testimonial: typeof testimonials[0] }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="flex-shrink-0 w-[400px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <div className="h-full p-6 rounded-2xl bg-card border border-border/50 relative overflow-hidden">
        {/* Gradient overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Quote icon */}
        <motion.div
          className="absolute top-4 right-4 text-primary/10"
          animate={isHovered ? { scale: 1.2, opacity: 0.2 } : { scale: 1, opacity: 0.1 }}
        >
          <Quote className="w-12 h-12" />
        </motion.div>

        <div className="relative z-10">
          {/* Stars with animation */}
          <div className="flex gap-1 mb-4">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
              >
                <Star className="w-4 h-4 fill-primary text-primary" />
              </motion.div>
            ))}
          </div>

          {/* Content */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            &ldquo;{testimonial.content}&rdquo;
          </p>

          {/* Author */}
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center"
              animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
            >
              <span className="text-sm font-semibold text-white">
                {testimonial.avatar}
              </span>
            </motion.div>
            <div>
              <p className="text-sm font-medium">{testimonial.author}</p>
              <p className="text-xs text-muted-foreground">{testimonial.role}</p>
            </div>
          </div>
        </div>

        {/* Border glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/0 pointer-events-none"
          animate={isHovered ? { borderColor: "rgba(255, 107, 53, 0.3)" } : { borderColor: "rgba(255, 107, 53, 0)" }}
        />
      </div>
    </motion.div>
  );
}

// Featured testimonial with large display
function FeaturedTestimonial() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9
    })
  };

  const next = () => {
    setDirection(1);
    setCurrent((prev) => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setDirection(-1);
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // Auto advance
  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Large quote marks */}
      <div className="absolute -top-8 -left-8 text-primary/10">
        <Quote className="w-24 h-24" />
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-card border border-border/50 p-8 md:p-12">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            {/* Stars */}
            <div className="flex justify-center gap-1 mb-6">
              {Array.from({ length: testimonials[current].rating }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Star className="w-5 h-5 fill-primary text-primary" />
                </motion.div>
              ))}
            </div>

            {/* Quote */}
            <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8 text-balance">
              &ldquo;{testimonials[current].content}&rdquo;
            </p>

            {/* Author */}
            <div className="flex flex-col items-center gap-3">
              <motion.div 
                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <span className="text-lg font-bold text-white">
                  {testimonials[current].avatar}
                </span>
              </motion.div>
              <div>
                <p className="font-semibold">{testimonials[current].author}</p>
                <p className="text-sm text-muted-foreground">{testimonials[current].role}</p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-center items-center gap-4 mt-8">
          <motion.button
            onClick={prev}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          {/* Dots */}
          <div className="flex gap-2">
            {testimonials.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => {
                  setDirection(index > current ? 1 : -1);
                  setCurrent(index);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === current ? "bg-primary" : "bg-border"
                }`}
                whileHover={{ scale: 1.3 }}
                animate={index === current ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <motion.button
            onClick={next}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 5, ease: "linear" }}
            key={current}
          />
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section id="testimonials" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, 90, 0]
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        <motion.div 
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, -90, 0]
          }}
          transition={{ duration: 20, repeat: Infinity }}
        />
      </div>

      <div ref={sectionRef} className="relative z-10">
        {/* Section Header */}
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="section-badge inline-flex"
          >
            Testimonials
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight"
          >
            Loved by{" "}
            <motion.span 
              className="gradient-text"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              10,000+
            </motion.span>
            {" "}students
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
            animate={isInView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            See what students from top universities are saying about StudyFlow.
          </motion.p>
        </div>

        {/* Featured Testimonial */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="max-w-7xl mx-auto px-6 mb-16"
        >
          <FeaturedTestimonial />
        </motion.div>

        {/* Marquee Rows */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <MarqueeRow testimonials={testimonials.slice(0, 3)} direction="left" speed={40} />
          <MarqueeRow testimonials={testimonials.slice(3, 6)} direction="right" speed={45} />
        </motion.div>
      </div>
    </section>
  );
}
