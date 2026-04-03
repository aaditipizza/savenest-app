
import React from 'react';
import { motion } from 'framer-motion';

interface PiggyBankProps {
  progress: number; // 0 to 100
}

const PiggyBank: React.FC<PiggyBankProps> = ({ progress }) => {
  // progress determines the fill level of the gold liquid inside the pig
  const fillHeight = Math.min(Math.max(progress, 0), 100);

  return (
    <div className="relative w-64 h-64 flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-champagne-gold/10 rounded-full blur-3xl transform scale-125 animate-pulse"></div>
      
      {/* Pig SVG */}
      <svg 
        viewBox="0 0 200 200" 
        className="w-full h-full relative z-10 drop-shadow-2xl"
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="pigShape">
             <path d="M100 40C60 40 30 70 30 110C30 150 60 180 100 180C140 180 170 150 170 110C170 70 140 40 100 40Z" />
             {/* Ears */}
             <path d="M50 50L30 20L40 60Z" />
             <path d="M150 50L170 20L160 60Z" />
          </clipPath>
          <linearGradient id="goldLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--theme-accent-pale)" />
            <stop offset="50%" stopColor="var(--theme-accent-light)" />
            <stop offset="100%" stopColor="var(--theme-accent)" />
          </linearGradient>
        </defs>

        {/* Outer Body Outline */}
        <path 
          d="M100 40C60 40 30 70 30 110C30 150 60 180 100 180C140 180 170 150 170 110C170 70 140 40 100 40Z" 
          stroke="var(--theme-primary)" 
          strokeWidth="4"
          fill="white"
          fillOpacity="0.3"
        />

        {/* Filling Liquid */}
        <motion.rect 
          x="30" 
          initial={{ height: 0, y: 180 }}
          animate={{ 
            height: fillHeight * 1.4, 
            y: 180 - (fillHeight * 1.4) 
          }}
          transition={{ type: "spring", stiffness: 50, damping: 15 }}
          width="140" 
          fill="url(#goldLiquid)" 
          clipPath="url(#pigShape)"
          className="piggy-fill"
        />

        {/* Pig Features */}
        {/* Ears */}
        <path d="M50 50L30 20L40 60" stroke="var(--theme-primary)" strokeWidth="3" fill="none" />
        <path d="M150 50L170 20L160 60" stroke="var(--theme-primary)" strokeWidth="3" fill="none" />
        
        {/* Snout */}
        <ellipse cx="100" cy="120" rx="20" ry="15" stroke="var(--theme-primary)" strokeWidth="3" fill="white" />
        <circle cx="93" cy="120" r="3" fill="var(--theme-primary)" />
        <circle cx="107" cy="120" r="3" fill="var(--theme-primary)" />
 
        {/* Eyes */}
        <circle cx="75" cy="85" r="4" fill="var(--theme-primary)" />
        <circle cx="125" cy="85" r="4" fill="var(--theme-primary)" />
 
        {/* Coin Slot */}
        <rect x="85" y="45" width="30" height="5" rx="2" fill="var(--theme-primary)" />
      </svg>

      {/* Floating Coins Animation */}
      <motion.div 
        initial={{ y: 0, opacity: 0 }}
        animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center"
      >
        <span className="material-icons-round text-metallic-gold text-3xl">monetization_on</span>
      </motion.div>
    </div>
  );
};

export default PiggyBank;
