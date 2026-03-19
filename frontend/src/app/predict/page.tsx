"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Activity,
  AlertTriangle,
  Info,
  CheckCircle2,
  Link as LinkIcon,
  Mail,
} from "lucide-react";

export default function PredictPage() {
  const [type, setType] = useState<"url" | "email">("url");
  const [input, setInput] = useState("");
  const [isPredicting, setIsPredicting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<null | {
    isPhishing: boolean;
    score: number;
    reasons: any[];
    explanation?: string;
  }>(null);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsPredicting(true);
    setResult(null);
    setError(null);

    try {
      const endpoint =
        type === "url"
          ? "http://localhost:8000/link"
          : "http://localhost:8000/email";

      const body =
        type === "url"
          ? JSON.stringify({ url: input })
          : JSON.stringify({ text: input });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
      });

      if (!response.ok) {
        throw new Error("Backend error");
      }

      const data = await response.json();

      // 🧠 SAFE NORMALIZATION
      const safeScore = Math.min(100, Math.max(0, data.score ?? 0));

      setResult({
        isPhishing: data.is_phishing ?? false,
        score: safeScore,
        reasons: data.top_features ?? [],
        explanation: data.explanation ?? "",
      });
    } catch (err) {
      console.error(err);
      setError("Backend not reachable. Make sure FastAPI is running.");
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center py-16 px-4 md:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl flex flex-col items-center"
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            AI Threat Analysis
          </h1>

          <div className="inline-flex glass-panel p-1 rounded-xl mb-6 shadow-sm">
            <button
              onClick={() => {
                setType("url");
                setResult(null);
              }}
              className={`px-6 py-3 rounded-lg ${
                type === "url" ? "bg-primary text-white" : ""
              }`}
            >
              <LinkIcon className="inline w-4 h-4 mr-2" />
              URL
            </button>

            <button
              onClick={() => {
                setType("email");
                setResult(null);
              }}
              className={`px-6 py-3 rounded-lg ${
                type === "email" ? "bg-primary text-white" : ""
              }`}
            >
              <Mail className="inline w-4 h-4 mr-2" />
              Email
            </button>
          </div>
        </div>

        <form onSubmit={handlePredict} className="w-full">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                type === "url" ? "Enter URL..." : "Paste email..."
              }
              className="flex-1 p-4 rounded-xl bg-black/20"
            />

            <button
              disabled={isPredicting}
              className="px-6 py-4 bg-primary rounded-xl"
            >
              {isPredicting ? "Analyzing..." : "Predict"}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {error && (
            <div className="mt-6 text-red-500">{error}</div>
          )}

          {result && !isPredicting && (
            <motion.div className="mt-10 w-full p-6 rounded-2xl border">
              <div className="flex items-center gap-4 mb-4">
                {result.isPhishing ? (
                  <ShieldAlert className="text-red-500" />
                ) : (
                  <ShieldCheck className="text-green-500" />
                )}

                <h2 className="text-2xl font-bold">
                  {result.isPhishing ? "Phishing" : "Safe"}
                </h2>
              </div>

              <div className="mb-4">
                Score: <b>{result.score}%</b>
              </div>

              {/* 🧠 EXPLANATION */}
              {result.explanation && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">AI Analysis</h3>
                  <p>{result.explanation}</p>
                </div>
              )}

              {/* 🧠 FEATURES */}
              <div>
                <h3 className="font-semibold mb-2">Signals</h3>

                {result.reasons.length > 0 ? (
                  result.reasons.map((r, i) => {
                    const isObj =
                      typeof r === "object" && r !== null;

                    const text = isObj ? r.feature : r;

                    return (
                      <div key={i} className="mb-2">
                        {text}
                      </div>
                    );
                  })
                ) : (
                  <div>No signals detected</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
// "use client";

// import { useState } from "react";
// import { motion, AnimatePresence } from "framer-motion";
// import { ShieldAlert, ShieldCheck, Search, Activity, AlertTriangle, Info, CheckCircle2, Link as LinkIcon, Mail } from "lucide-react";

// export default function PredictPage() {
//   const [type, setType] = useState<"url" | "email">("url");
//   const [input, setInput] = useState("");
//   const [isPredicting, setIsPredicting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
  
//   // Update result interface to match backend API schema
//   const [result, setResult] = useState<null | { 
//     isPhishing: boolean; 
//     score: number; 
//     reasons: { feature: string; impact: number; effect: string }[] | string[];
//     explanation?: string;
//   }>(null);

//   const handlePredict = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!input.trim()) return;

//     setIsPredicting(true);
//     setResult(null);
//     setError(null);

//     if (type === "url") {
//       try {
//         const response = await fetch("http://localhost:8000/analyze", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ url: input }),
//         });

//         if (!response.ok) {
//           throw new Error("Failed to fetch analysis from server");
//         }

//         const data = await response.json();
        
//         setResult({
//           isPhishing: data.is_phishing,
//           score: data.score,
//           reasons: data.top_features,
//           explanation: data.explanation
//         });
//       } catch (err) {
//         console.error("API Error:", err);
//         setError("Could not connect to the backend API. Ensure it is running on port 8000.");
//       } finally {
//         setIsPredicting(false);
//       }
//     } else {
//       try {
//         const response = await fetch("http://localhost:8000/predict", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ text: input }),
//         });

//         if (!response.ok) {
//           throw new Error("Failed to fetch analysis from server");
//         }

//         const data = await response.json();
        
//         setResult({
//           isPhishing: data.is_phishing,
//           score: data.score,
//           reasons: data.top_features,
//           explanation: data.explanation
//         });
//       } catch (err) {
//         console.error("API Error:", err);
//         setError("Could not connect to the backend API. Ensure it is running on port 8000.");
//       } finally {
//         setIsPredicting(false);
//       }
//     }
//   };

//   return (
//     <div className="min-h-[calc(100vh-5rem)] flex flex-col items-center py-16 px-4 md:px-8 relative overflow-hidden">
//       {/* Background Decor */}
//       <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] -z-10" />

//       <motion.div 
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1, y: 0 }}
//         className="w-full max-w-4xl flex flex-col items-center"
//       >
//         <div className="text-center mb-12">
//           <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">AI Threat Analysis</h1>
//           <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
//             Paste a suspicious URL, email header, or content snippet below. Our advanced model will break down its safety profile in real-time.
//           </p>

//           {/* Type Toggle */}
//           <div className="inline-flex glass-panel p-1 rounded-xl mb-6 shadow-sm">
//             <button
//               onClick={() => { setType("url"); setResult(null); setError(null); }}
//               className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
//                 type === "url" 
//                   ? "bg-primary text-primary-foreground shadow-md" 
//                   : "text-muted-foreground hover:text-foreground hover:bg-white/5"
//               }`}
//             >
//               <LinkIcon className="w-4 h-4" />
//               Analyze URL
//             </button>
//             <button
//               onClick={() => { setType("email"); setResult(null); setError(null); }}
//               className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
//                 type === "email" 
//                   ? "bg-primary text-primary-foreground shadow-md" 
//                   : "text-muted-foreground hover:text-foreground hover:bg-white/5"
//               }`}
//             >
//               <Mail className="w-4 h-4" />
//               Analyze Email Text
//             </button>
//           </div>
//         </div>

//         <form onSubmit={handlePredict} className="w-full relative group">
//           <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
//           <div className="relative glass-panel rounded-2xl p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
//             <div className="flex-1 relative">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
//               <input
//                 type={type === "url" ? "url" : "text"}
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 placeholder={type === "url" ? "https://example.com/login..." : "Paste email content here..."}
//                 className="w-full bg-transparent border-none text-foreground px-12 py-4 h-14 rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/50 text-lg"
//               />
//             </div>
//             <button
//               type="submit"
//               disabled={isPredicting || !input.trim()}
//               className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 h-14 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] disabled:opacity-50 disabled:hover:shadow-none flex items-center justify-center gap-2 relative overflow-hidden shrink-0"
//             >
//               {isPredicting ? (
//                 <>
//                   <Activity className="w-5 h-5 animate-spin" />
//                   <span>Analyzing</span>
//                 </>
//               ) : (
//                 <>
//                   <span>Predict</span>
//                   <div className="absolute inset-0 h-full w-full opacity-0 hover:opacity-20 bg-white transition-opacity"></div>
//                 </>
//               )}
//             </button>
//           </div>
//         </form>

//         <AnimatePresence mode="wait">
//           {error && (
//             <motion.div
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               className="mt-6 w-full max-w-3xl rounded-xl p-4 bg-destructive/10 border border-destructive/20 text-destructive text-center flex items-center justify-center gap-2 font-medium"
//             >
//               <AlertTriangle className="w-5 h-5" />
//               {error}
//             </motion.div>
//           )}

//           {result && !isPredicting && (
//             <motion.div
//               initial={{ opacity: 0, scale: 0.95, y: 20 }}
//               animate={{ opacity: 1, scale: 1, y: 0 }}
//               exit={{ opacity: 0, scale: 0.95, y: -20 }}
//               transition={{ duration: 0.5, type: "spring" }}
//               className={`mt-12 w-full max-w-3xl rounded-3xl p-8 border ${
//                 result.isPhishing 
//                   ? "bg-destructive/10 border-destructive/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]" 
//                   : "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]"
//               }`}
//             >
//               <div className="flex flex-col md:flex-row items-center gap-8">
//                 <div className="relative flex-shrink-0">
//                   <div className={`absolute inset-0 rounded-full blur-xl ${result.isPhishing ? "bg-destructive/40" : "bg-emerald-500/40"}`}></div>
//                   <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-4 ${result.isPhishing ? "border-destructive/50 bg-destructive/10" : "border-emerald-500/50 bg-emerald-500/10"}`}>
//                     {result.isPhishing ? (
//                       <ShieldAlert className="w-16 h-16 text-destructive animate-pulse" />
//                     ) : (
//                       <ShieldCheck className="w-16 h-16 text-emerald-500" />
//                     )}
//                   </div>
//                 </div>

//                 <div className="flex-1 text-center md:text-left">
//                   <h2 className="text-3xl font-bold mb-2 flex items-center justify-center md:justify-start gap-3">
//                     {result.isPhishing ? "Phishing Detected" : "Status Safe"}
//                   </h2>
//                   <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
//                     <div className="h-2 w-full max-w-xs bg-secondary rounded-full overflow-hidden">
//                       <motion.div 
//                         initial={{ width: 0 }}
//                         animate={{ width: `${result.score}%` }}
//                         transition={{ duration: 1, delay: 0.2 }}
//                         className={`h-full ${result.isPhishing ? "bg-destructive" : "bg-emerald-500"}`}
//                       />
//                     </div>
//                     <span className={`font-mono font-bold ${result.isPhishing ? "text-destructive" : "text-emerald-500"}`}>
//                       {result.score}% {result.isPhishing ? "Risk" : "Safe"}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {result.explanation && (
//                 <div className="mt-8 pt-8 border-t border-white/10">
//                   <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
//                     <Info className="w-5 h-5 text-accent" />
//                     AI Agent Analysis
//                   </h3>
//                   <div className="glass-panel p-6 rounded-2xl text-lg text-foreground/90 leading-relaxed border border-accent/20 bg-accent/5">
//                     {result.explanation}
//                   </div>
//                 </div>
//               )}

//               <div className="mt-8 pt-8 border-t border-white/10">
//                 <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
//                   <Activity className="w-5 h-5 text-accent" />
//                   Raw Feature Diagnostics
//                 </h3>
//                 <div className="grid gap-4">
//                   {result.reasons.length > 0 ? result.reasons.map((reason, idx) => {
//                     // Check if reason is an object (from API) or a string (mock emails)
//                     const isObj = typeof reason === 'object';
//                     const featureText = isObj ? `Term: "${reason.feature}"` : reason;
//                     const impactText = isObj ? `(SHAP Impact: ${reason.impact > 0 ? '+' : ''}${reason.impact})` : '';
//                     const isPhishyIndicator = isObj ? reason.effect === "phishing" : result.isPhishing;

//                     return (
//                       <motion.div 
//                         key={idx}
//                         initial={{ opacity: 0, x: -20 }}
//                         animate={{ opacity: 1, x: 0 }}
//                         transition={{ delay: 0.3 + (idx * 0.1) }}
//                         className="glass-panel p-4 rounded-xl flex items-start justify-between gap-3"
//                       >
//                         <div className="flex items-start gap-3">
//                           {isPhishyIndicator ? (
//                             <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
//                           ) : (
//                             <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
//                           )}
//                           <p className="text-muted-foreground">
//                             <span className="font-semibold text-foreground/80">{featureText}</span> {isObj && `strongly contributed toward a ${reason.effect} prediction.`}
//                           </p>
//                         </div>
//                         {isObj && (
//                           <div className={`text-xs font-mono font-bold px-2 py-1 rounded-md ${isPhishyIndicator ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
//                             {impactText}
//                           </div>
//                         )}
//                       </motion.div>
//                     );
//                   }) : (
//                     <div className="text-muted-foreground italic p-4 text-center">No significant extracted features analyzed.</div>
//                   )}
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>
//       </motion.div>
//     </div>
//   );
// }
