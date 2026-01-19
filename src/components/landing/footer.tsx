"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Twitter, Github, Linkedin, Instagram, ArrowUpRight, Heart, Sparkles } from "lucide-react";
import { useState } from "react";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Integrations", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "Help Center", href: "#" },
    { label: "Community", href: "#" },
    { label: "Templates", href: "#" },
  ],
  legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter", color: "hover:bg-blue-500/20 hover:text-blue-400" },
  { icon: Github, href: "#", label: "GitHub", color: "hover:bg-gray-500/20 hover:text-gray-300" },
  { icon: Linkedin, href: "#", label: "LinkedIn", color: "hover:bg-blue-600/20 hover:text-blue-500" },
  { icon: Instagram, href: "#", label: "Instagram", color: "hover:bg-pink-500/20 hover:text-pink-400" },
];

// Magnetic Social Button
function MagneticSocialButton({ 
  social, 
  index 
}: { 
  social: typeof socialLinks[0]; 
  index: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.a
      href={social.href}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        w-10 h-10 rounded-xl bg-secondary/50 border border-border/50 
        flex items-center justify-center text-muted-foreground 
        transition-all duration-300 relative overflow-hidden group
        ${social.color}
      `}
      aria-label={social.label}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <social.icon className="w-4 h-4 relative z-10" />
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-white/10 to-transparent" />
    </motion.a>
  );
}

// Animated Footer Link
function FooterLink({ 
  link, 
  index 
}: { 
  link: { label: string; href: string }; 
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={link.href}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 group"
      >
        <span className="relative">
          {link.label}
          <motion.span
            className="absolute -bottom-0.5 left-0 h-px bg-primary"
            initial={{ width: 0 }}
            animate={{ width: isHovered ? "100%" : 0 }}
            transition={{ duration: 0.3 }}
          />
        </span>
        <motion.span
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : -5 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowUpRight className="w-3 h-3" />
        </motion.span>
      </Link>
    </motion.li>
  );
}

// Animated Column Header
function ColumnHeader({ title, index }: { title: string; index: number }) {
  return (
    <motion.h3
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="font-medium text-sm mb-4 relative inline-block"
    >
      {title}
      <motion.span
        className="absolute -bottom-1 left-0 h-0.5 bg-gradient-to-r from-primary to-purple-500 rounded-full"
        initial={{ width: 0 }}
        whileInView={{ width: "50%" }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
      />
    </motion.h3>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-gradient-to-b from-background to-background/95 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gradient mesh */}
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(var(--primary-rgb),0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(var(--primary-rgb),0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 md:py-20 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Link href="/" className="flex items-center gap-2 group">
                <motion.div 
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center relative overflow-hidden"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span className="text-white font-bold text-lg relative z-10">S</span>
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </motion.div>
                <span className="font-semibold text-xl tracking-tight">
                  Study<span className="gradient-text">Flow</span>
                </span>
              </Link>
            </motion.div>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed"
            >
              The all-in-one study platform that helps students organize their learning and achieve their academic goals.
            </motion.p>

            {/* Newsletter signup */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6"
            >
              <p className="text-sm font-medium mb-3">Stay updated</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full px-4 py-2.5 text-sm rounded-xl bg-secondary/50 border border-border/50 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                  />
                </div>
                <motion.button
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors relative overflow-hidden group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10">Subscribe</span>
                  <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </motion.button>
              </div>
            </motion.div>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social, index) => (
                <MagneticSocialButton key={social.label} social={social} index={index} />
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <ColumnHeader title="Product" index={0} />
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <FooterLink key={link.label} link={link} index={index} />
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <ColumnHeader title="Company" index={1} />
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <FooterLink key={link.label} link={link} index={index} />
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <ColumnHeader title="Resources" index={2} />
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <FooterLink key={link.label} link={link} index={index} />
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <ColumnHeader title="Legal" index={3} />
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <FooterLink key={link.label} link={link} index={index} />
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 pt-8 border-t border-border/50"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} StudyFlow. All rights reserved.
            </p>
            
            <motion.div 
              className="flex items-center gap-2 text-sm text-muted-foreground"
              whileHover={{ scale: 1.05 }}
            >
              <span>Made with</span>
              <motion.span
                animate={{ 
                  scale: [1, 1.2, 1],
                }}
                transition={{ 
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              </motion.span>
              <span>for students worldwide</span>
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </motion.div>
          </div>
        </motion.div>

        {/* Back to top button */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center z-50 hover:scale-110 transition-transform"
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.9 }}
        >
          <motion.svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path d="M18 15l-6-6-6 6" />
          </motion.svg>
        </motion.button>
      </div>
    </footer>
  );
}
