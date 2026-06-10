"use client"

import { motion } from "framer-motion"
import { Car } from '@/components/icons'

const drivers = [
  { id: 1, x: 25, y: 35, rotation: 45 },
  { id: 2, x: 65, y: 55, rotation: -30 },
  { id: 3, x: 45, y: 70, rotation: 120 },
]

export function MapArea() {
  return (
    <div className="relative h-[40vh] w-full overflow-hidden bg-[#0D0D14]">
      {/* Dark map grid background */}
      <div className="absolute inset-0">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1A1A24"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Simulated roads */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Main roads */}
        <path
          d="M 0 50 Q 30 45 50 50 T 100 45"
          fill="none"
          stroke="#1F1F2E"
          strokeWidth="3"
        />
        <path
          d="M 50 0 Q 55 30 50 50 T 55 100"
          fill="none"
          stroke="#1F1F2E"
          strokeWidth="3"
        />
        <path
          d="M 20 0 Q 25 40 40 60 T 30 100"
          fill="none"
          stroke="#1A1A28"
          strokeWidth="2"
        />
        <path
          d="M 0 30 Q 40 35 70 25 T 100 30"
          fill="none"
          stroke="#1A1A28"
          strokeWidth="2"
        />
        <path
          d="M 70 0 Q 75 30 80 50 T 75 100"
          fill="none"
          stroke="#1A1A28"
          strokeWidth="2"
        />
      </svg>

      {/* User location marker */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="relative">
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 -m-4 rounded-full bg-primary/20"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          {/* Center dot */}
          <div className="relative h-4 w-4 rounded-full bg-primary shadow-[0_0_20px_rgba(108,99,255,0.6)]">
            <div className="absolute inset-1 rounded-full bg-white" />
          </div>
        </div>
      </motion.div>

      {/* Animated driver cars with bounce */}
      {drivers.map((driver, index) => (
        <motion.div
          key={driver.id}
          className="absolute"
          style={{
            left: `${driver.x}%`,
            top: `${driver.y}%`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: 1,
            scale: 1,
            x: [0, 8, 0, -8, 0],
          }}
          transition={{
            opacity: { duration: 0.5, delay: index * 0.2 },
            scale: { duration: 0.5, delay: index * 0.2 },
            x: { duration: 4, repeat: Infinity, ease: "easeInOut", delay: index * 0.5 },
          }}
        >
          <motion.div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/20 backdrop-blur-sm"
            style={{ rotate: driver.rotation }}
            animate={{
              y: [0, -4, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.3,
            }}
          >
            <Car className="h-4 w-4 text-secondary" />
          </motion.div>
        </motion.div>
      ))}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
