"use client";

import { motion, Variants } from "framer-motion";
import { Mail, GraduationCap, Building2, BookOpen } from "lucide-react";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
};

const PersonCard = ({ person, isGuide = false }: { person: any, isGuide?: boolean }) => (
  <motion.div variants={itemVariants} className={`glass-panel p-6 rounded-2xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300 ${isGuide ? 'md:col-span-2 lg:col-span-1 lg:w-96 mx-auto w-full' : ''}`}>
    <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-16 -mt-16 opacity-50 group-hover:opacity-80 transition-opacity ${isGuide ? 'bg-accent' : 'bg-primary'}`}></div>
    
    <div className="flex flex-col items-center text-center relative z-10">
      <div className={`w-28 h-28 rounded-full p-1 mb-4 ${isGuide ? 'bg-gradient-to-tr from-accent to-primary' : 'bg-white/10 dark:bg-white/5 border border-white/20'}`}>
        <div className="w-full h-full rounded-full overflow-hidden bg-secondary">
          <img src={person.image} alt={person.name} className="w-full h-full object-cover" />
        </div>
      </div>
      
      <span className={`text-xs font-bold tracking-wider uppercase mb-2 ${isGuide ? 'text-accent' : 'text-primary'}`}>{person.role}</span>
      <h3 className="text-xl font-bold mb-4">{person.name}</h3>
      
      <div className="w-full space-y-3 text-sm text-muted-foreground text-left">
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-foreground/50" />
          <span className="truncate">{person.college}</span>
        </div>
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-foreground/50" />
          <span className="truncate">{person.department}</span>
        </div>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-4 h-4 text-foreground/50" />
          <span>{person.semester}</span>
        </div>
        <div className="flex items-center gap-3 pt-2 mt-2 border-t border-white/10">
          <Mail className="w-4 h-4 text-foreground/50" />
          <a href={`mailto:${person.email}`} className="truncate hover:text-primary transition-colors">{person.email}</a>
        </div>
      </div>
    </div>
  </motion.div>
);

export default function InfoPage() {
  const guide = {
    role: "Project Guide",
    name: "Dr. Alan Turing",
    college: "Institute of Technology",
    email: "alan.turing@institute.edu",
    semester: "Faculty",
    department: "Computer Science and Engineering",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alan"
  };

  const students = [
    {
      role: "Lead Developer",
      name: "Alice Smith",
      college: "Institute of Technology",
      email: "alice@student.edu",
      semester: "8th Semester",
      department: "CSE",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice"
    },
    {
      role: "AI/ML Engineer",
      name: "Bob Jones",
      college: "Institute of Technology",
      email: "bob@student.edu",
      semester: "8th Semester",
      department: "CSE",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob"
    },
    {
      role: "UI/UX Designer",
      name: "Charlie Brown",
      college: "Institute of Technology",
      email: "charlie@student.edu",
      semester: "8th Semester",
      department: "CSE",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie"
    },
    {
      role: "Security Analyst",
      name: "Diana Prince",
      college: "Institute of Technology",
      email: "diana@student.edu",
      semester: "8th Semester",
      department: "CSE",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Diana"
    }
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] py-16 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-bold mb-4"
        >
          Team & Information
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-muted-foreground text-lg max-w-2xl mx-auto"
        >
          Meet the dedicated team behind the Explainable AI Phishing Detection platform.
        </motion.p>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-16"
      >
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-semibold flex-shrink-0 text-accent">Project Guide</h2>
            <div className="h-px w-full bg-gradient-to-r from-accent/50 to-transparent"></div>
          </div>
          <div className="flex justify-center">
            <PersonCard person={guide} isGuide={true} />
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-2xl font-semibold flex-shrink-0 text-primary">Development Team</h2>
            <div className="h-px w-full bg-gradient-to-r from-primary/50 to-transparent"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {students.map((student, idx) => (
              <PersonCard key={idx} person={student} />
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
