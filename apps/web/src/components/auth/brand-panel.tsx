"use client";
import { motion } from "framer-motion";

export function BrandPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 flex-col justify-between p-12">
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Glow blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-violet-600/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-indigo-600/25 blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-indigo-900 font-black text-xl leading-none">P</span>
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">Pass</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        className="relative z-10 space-y-6"
      >
        <div className="space-y-3">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Study smarter.
            <br />
            <span className="text-indigo-300">Pass faster.</span>
          </h2>
          <p className="text-indigo-200 text-base leading-relaxed max-w-xs">
            AI-powered ZIMSEC exam preparation. Practice with past papers, get instant guidance,
            and track your progress to exam day.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {[
            { icon: "📄", text: "Past papers & marking guides" },
            { icon: "🧠", text: "AI-guided study sessions" },
            { icon: "📊", text: "Progress tracking & streaks" },
          ].map((item, i) => (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-3"
            >
              <span className="text-lg">{item.icon}</span>
              <span className="text-indigo-200 text-sm">{item.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
