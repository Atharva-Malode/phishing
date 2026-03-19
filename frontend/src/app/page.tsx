"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShieldCheck, Search, Activity } from "lucide-react";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 animate-pulse-glow" />
      
      <div className="text-center z-10 max-w-3xl">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="mb-8 relative flex justify-center items-center h-48"
        >
          <div className="relative">
            {/* Animated Rings */}
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-primary/30 rounded-full w-40 h-40 -ml-4 -mt-4 border-dashed" 
            />
            <motion.div 
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-2 border-accent/40 rounded-full w-48 h-48 -ml-8 -mt-8" 
            />
            
            <div className="glass-panel w-32 h-32 rounded-full flex items-center justify-center relative z-10 animate-float shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Search className="w-12 h-12 text-primary absolute opacity-40 animate-pulse" />
              <ShieldCheck className="w-16 h-16 text-primary z-20" />
            </div>
          </div>
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-br from-foreground via-primary to-accent"
        >
          Watching Phishing Links
        </motion.h1>
        
        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto"
        >
          Real-time, AI-driven analysis to keep your digital life secure. We examine the invisible to protect the valuable.
        </motion.p>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <button
            onClick={() => router.push('/predict')}
            className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-300 bg-primary border border-primary/50 border-transparent rounded-full hover:bg-primary/80 hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-background"
          >
            <span className="mr-2">Next Step</span>
            <Activity className="w-5 h-5 group-hover:animate-pulse" />
            
            <div className="absolute inset-0 h-full w-full rounded-full group-hover:animate-ping opacity-20 bg-primary"></div>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
