"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus, Sparkles, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "Is StudyFlow really free to use?",
    answer: "Yes! Our Free plan is completely free forever with no hidden costs. It includes core features like task management, the Pomodoro timer, and weekly progress reports. You can upgrade to Pro anytime for advanced features.",
    icon: "",
  },
  {
    question: "How does the AI scheduling work?",
    answer: "Our AI analyzes your learning patterns, available time slots, and upcoming deadlines to create an optimal study schedule. It adapts based on your progress and adjusts recommendations to maximize retention using spaced repetition principles.",
    icon: "",
  },
  {
    question: "Can I use StudyFlow on my phone?",
    answer: "Absolutely! StudyFlow works seamlessly on all devices. Access your study plans, track tasks, and use the timer from your phone, tablet, or computer. Your data syncs automatically across all devices.",
    icon: "",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains accessible on the Free plan forever. If you downgrade from Pro, you keep all your existing data but lose access to Pro features. You can export your data anytime from the settings.",
    icon: "",
  },
  {
    question: "Can I collaborate with classmates?",
    answer: "Yes! With Pro and Team plans, you can create study groups, share study plans, and track group progress together. It is perfect for study buddies, project teams, or tutoring sessions.",
    icon: "",
  },
  {
    question: "Do you offer student discounts?",
    answer: "Students with a valid .edu email address get 20% off Pro plans. Simply sign up with your university email to automatically receive the discount at checkout.",
    icon: "",
  },
  {
    question: "How secure is my data?",
    answer: "We take security seriously. All data is encrypted in transit and at rest using industry-standard AES-256 encryption. We never sell your data and comply with GDPR and CCPA regulations.",
    icon: "",
  },
  {
    question: "Can I integrate with my calendar?",
    answer: "Pro users can sync with Google Calendar, Apple Calendar, and Outlook. Your study sessions automatically appear in your calendar, and you can import existing events to avoid scheduling conflicts.",
    icon: "",
  },
];

// Premium FAQ Item Component
function FAQItem({ 
  faq, 
  index, 
  isOpen, 
  onToggle 
}: { 
  faq: typeof faqs[0]; 
  index: number; 
  isOpen: boolean; 
  onToggle: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="relative group"
    >
      <motion.div
        className={`
          relative overflow-hidden rounded-2xl border transition-all duration-500
          ${isOpen 
            ? 'border-primary/30 bg-primary/5 shadow-lg shadow-primary/5' 
            : 'border-border/50 bg-card/50 hover:border-border hover:bg-card/80'
          }
        `}
        layout
      >
        {/* Gradient overlay on hover/open */}
        <div className={`
          absolute inset-0 opacity-0 transition-opacity duration-500
          ${isOpen ? 'opacity-100' : 'group-hover:opacity-50'}
          bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5
        `} />
        
        {/* Shine effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12" />
        </div>

        {/* Question */}
        <button
          onClick={onToggle}
          className="w-full text-left px-6 py-5 flex items-center gap-4 relative z-10"
        >
          {/* Icon */}
          <motion.span 
            className="text-2xl flex-shrink-0"
            animate={{ 
              scale: isOpen ? 1.1 : 1,
              rotate: isOpen ? [0, -10, 10, 0] : 0
            }}
            transition={{ duration: 0.4 }}
          >
            {faq.icon}
          </motion.span>

          {/* Question text */}
          <span className="flex-1 text-base md:text-lg font-medium pr-4">
            {faq.question}
          </span>

          {/* Toggle icon */}
          <motion.div
            className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              transition-colors duration-300
              ${isOpen 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-secondary text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary'
              }
            `}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {isOpen ? (
              <Minus className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </motion.div>
        </button>

        {/* Answer */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6 pl-[4.5rem] relative z-10"
              >
                <p className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Animated character text
function AnimatedHeading({ text, highlight }: { text: string; highlight: string }) {
  const parts = text.split(highlight);
  
  return (
    <motion.h2 className="mt-6 text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight">
      {parts[0].split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.03 }}
        >
          {char}
        </motion.span>
      ))}
      <span className="gradient-text">
        {highlight.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: (parts[0].length + i) * 0.03 }}
          >
            {char}
          </motion.span>
        ))}
      </span>
      {parts[1]?.split('').map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: (parts[0].length + highlight.length + i) * 0.03 }}
        >
          {char}
        </motion.span>
      ))}
    </motion.h2>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 md:py-32 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-1/4 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            x: [0, -50, 0],
            y: [0, 30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="max-w-3xl mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary"
          >
            <HelpCircle className="w-4 h-4" />
            <span>FAQ</span>
            <Sparkles className="w-4 h-4" />
          </motion.div>
          
          {/* Animated heading */}
          <AnimatedHeading text="Common questions" highlight="questions" />
          
          <motion.p
            initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-4 text-lg text-muted-foreground max-w-md mx-auto"
          >
            Everything you need to know about StudyFlow.
          </motion.p>
        </div>

        {/* FAQ Items */}
        <div className="mt-12 md:mt-16 space-y-4">
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              faq={faq}
              index={index}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </div>

        {/* Still have questions CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <motion.div
            className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="text-center sm:text-left">
              <p className="font-medium">Still have questions?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Our team is here to help you 24/7
              </p>
            </div>
            <motion.a
              href="#"
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors relative overflow-hidden group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">Contact Support</span>
              <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
