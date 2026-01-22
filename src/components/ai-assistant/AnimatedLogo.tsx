import { motion } from 'framer-motion';

export function AnimatedLogo() {
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      {/* Outer rotating gradient ring */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <svg viewBox="0 0 80 80" className="w-full h-full">
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#93C5FD" />
            </linearGradient>
            <linearGradient id="logoGradient2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="url(#logoGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="180 40"
          />
        </svg>
      </motion.div>

      {/* Inner static circle with icon */}
      <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 text-white"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Sparkles/AI icon */}
          <path d="M12 3v2" />
          <path d="M12 19v2" />
          <path d="M3 12h2" />
          <path d="M19 12h2" />
          <path d="M5.64 5.64l1.41 1.41" />
          <path d="M16.95 16.95l1.41 1.41" />
          <path d="M5.64 18.36l1.41-1.41" />
          <path d="M16.95 7.05l1.41-1.41" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      </div>

      {/* Subtle pulsing glow */}
      <motion.div
        className="absolute inset-0 rounded-full bg-blue-400/20 blur-xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}
