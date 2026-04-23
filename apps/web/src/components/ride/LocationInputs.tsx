"use client"

import { motion } from "framer-motion"
import { ArrowUpDown } from "lucide-react"

interface LocationInputsProps {
  pickup: string
  destination: string
  onPickupChange: (value: string) => void
  onDestinationChange: (value: string) => void
  onSwap: () => void
}

export function LocationInputs({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  onSwap,
}: LocationInputsProps) {
  return (
    <div className="relative flex flex-col gap-3">
      {/* Pickup input */}
      <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-primary shadow-[0_0_10px_rgba(108,99,255,0.6)]" />
        <input
          type="text"
          placeholder="¿Dónde te recogemos?"
          value={pickup}
          onChange={(e) => onPickupChange(e.target.value)}
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Swap button */}
      <motion.button
        onClick={onSwap}
        className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-muted hover:bg-muted/80"
        whileTap={{ scale: 0.9, rotate: 180 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        aria-label="Intercambiar ubicaciones"
      >
        <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
      </motion.button>

      {/* Destination input */}
      <div className="flex items-center gap-3 rounded-xl bg-muted px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-secondary shadow-[0_0_10px_rgba(0,212,170,0.6)]" />
        <input
          type="text"
          placeholder="¿A dónde vas?"
          value={destination}
          onChange={(e) => onDestinationChange(e.target.value)}
          className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Vertical line connecting dots */}
      <div className="absolute left-[1.625rem] top-[2.25rem] h-[calc(100%-3rem)] w-px bg-gradient-to-b from-primary to-secondary" />
    </div>
  )
}
