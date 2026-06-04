"use client"

import { motion } from "framer-motion"
import { Car } from "lucide-react"

interface DriversNearbyProps {
  count: number
}

export function DriversNearby({ count }: DriversNearbyProps) {
  return (
    <motion.div
      className="flex items-center justify-center gap-3 py-2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="flex -space-x-2">
        {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
          <motion.div
            key={i}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/20 ring-2 ring-background"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
          >
            <Car className="h-3.5 w-3.5 text-secondary" />
          </motion.div>
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        {count} choferes cerca
      </span>
    </motion.div>
  )
}
