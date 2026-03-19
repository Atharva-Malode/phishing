"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Mail, MapPin, Phone, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] py-16 px-4 md:px-8 max-w-7xl mx-auto relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[120px] -z-10" />

      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          Get in Touch
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Have questions about our API, pricing, or need technical support? We'd love to hear from you.
        </motion.p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12 items-start">
        {/* Contact Info Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 space-y-8"
        >
          <div className="glass-panel p-8 rounded-3xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-2xl rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500"></div>
            
            <h3 className="text-2xl font-bold mb-6 relative z-10">Contact Information</h3>
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Email Us</h4>
                  <p className="text-muted-foreground text-sm">support@phishguard.ai</p>
                  <p className="text-muted-foreground text-sm">sales@phishguard.ai</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 text-accent">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Office Location</h4>
                  <p className="text-muted-foreground text-sm">Institute of Technology</p>
                  <p className="text-muted-foreground text-sm">Innovation Lab, CSE Dept</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 text-emerald-500">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Call Us</h4>
                  <p className="text-muted-foreground text-sm">+1 (555) 123-4567</p>
                  <p className="text-muted-foreground text-sm">Mon-Fri, 9am-5pm EST</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Contact Form */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-3"
        >
          <div className="glass-panel p-8 md:p-10 rounded-3xl">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-primary" />
              Send a Message
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Your Name</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground/80">Email Address</label>
                  <input 
                    type="email" 
                    required
                    className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Subject</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50"
                  placeholder="How can we help?"
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Message</label>
                <textarea 
                  required
                  rows={5}
                  className="w-full bg-background/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 resize-none"
                  placeholder="Write your message here..."
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                ></textarea>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_4px_20px_rgba(59,130,246,0.25)] hover:shadow-[0_4px_25px_rgba(59,130,246,0.4)]"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : submitted ? (
                  <>Message Sent Successfully</>
                ) : (
                  <>
                    Send Message
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
