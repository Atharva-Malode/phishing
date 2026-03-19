"use client";

import { motion, Variants } from "framer-motion";
import { Check, Shield, Zap, Building2 } from "lucide-react";

export default function PricingPage() {
  const tiers = [
    {
      name: "Developer",
      price: "0",
      description: "Perfect for testing and small personal projects.",
      icon: <Zap className="w-6 h-6 text-emerald-500" />,
      features: [
        "1,000 API requests/month",
        "Standard latency",
        "Community support",
        "Basic threat intelligence"
      ],
      buttonText: "Start Free",
      popular: false,
      color: "emerald"
    },
    {
      name: "Pro",
      price: "49",
      description: "For growing businesses needing reliable protection.",
      icon: <Shield className="w-6 h-6 text-primary" />,
      features: [
        "50,000 API requests/month",
        "Low latency (<100ms)",
        "Priority email support",
        "Advanced Explainable AI",
        "Real-time webhook alerts"
      ],
      buttonText: "Get Started",
      popular: true,
      color: "primary"
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "Dedicated resources and advanced security compliance.",
      icon: <Building2 className="w-6 h-6 text-accent" />,
      features: [
        "Unlimited API requests",
        "Ultra-low latency (<20ms)",
        "24/7 dedicated support",
        "Custom model fine-tuning",
        "SLA Guarantee (99.99%)",
        "On-premise deployment options"
      ],
      buttonText: "Contact Sales",
      popular: false,
      color: "accent"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] py-16 px-4 md:px-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10" />

      <div className="text-center mb-16 relative z-10">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          Simple, Transparent Pricing
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Choose the perfect API plan for your needs. Scale your security seamlessly as your application grows.
        </motion.p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10 max-w-6xl mx-auto"
      >
        {tiers.map((tier, idx) => (
          <motion.div 
            key={idx}
            variants={itemVariants}
            className={`relative glass-panel rounded-3xl p-8 flex flex-col ${
              tier.popular 
                ? "border-primary/50 shadow-[0_0_30px_rgba(59,130,246,0.15)] md:-translate-y-4" 
                : "border-white/10 opacity-90 hover:opacity-100"
            } transition-opacity duration-300 group hover:shadow-xl`}
          >
            {tier.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                Most Popular
              </div>
            )}
            
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">{tier.name}</h3>
                <p className="text-muted-foreground text-sm mt-1">{tier.description}</p>
              </div>
              <div className={`p-3 rounded-2xl bg-${tier.color}/10`}>
                {tier.icon}
              </div>
            </div>

            <div className="mb-8 flex items-baseline gap-2">
              {tier.price !== "Custom" && <span className="text-3xl font-bold text-muted-foreground">$</span>}
              <span className="text-5xl font-bold tracking-tight">{tier.price}</span>
              {tier.price !== "Custom" && <span className="text-muted-foreground">/mo</span>}
            </div>

            <div className="flex-1">
              <ul className="space-y-4 mb-8">
                {tier.features.map((feature, fIdx) => (
                  <li key={fIdx} className="flex items-start gap-3 text-sm">
                    <Check className={`w-5 h-5 flex-shrink-0 ${tier.popular ? 'text-primary' : 'text-emerald-500'}`} />
                    <span className="text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              className={`w-full py-4 rounded-xl font-bold transition-all ${
                tier.popular 
                  ? "bg-primary hover:bg-primary/90 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.5)]" 
                  : "bg-white/5 hover:bg-white/10 text-foreground border border-white/10"
              }`}
            >
              {tier.buttonText}
            </button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
