"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Minus, Plus } from '@/components/icons'

interface PriceSelectorProps {
  price: number
  onPriceChange: (price: number) => void
}

export function PriceSelector({ price, onPriceChange }: PriceSelectorProps) {
  const increment = () => onPriceChange(Math.min(price + 5, 500))
  const decrement = () => onPriceChange(Math.max(price - 5, 20))

  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-4">
      <span className="text-sm text-muted-foreground">Precio sugerido</span>
      
      <div className="flex items-center gap-4">
        <motion.button
          onClick={decrement}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card hover:bg-card/80"
          whileTap={{ scale: 0.9 }}
          aria-label="Disminuir precio"
        >
          <Minus className="h-5 w-5 text-muted-foreground" />
        </motion.button>

        <div className="min-w-[100px] text-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={price}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="gradient-text font-mono text-5xl font-bold"
            >
              ${price}
            </motion.span>
          </AnimatePresence>
        </div>

        <motion.button
          onClick={increment}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-card hover:bg-card/80"
          whileTap={{ scale: 0.9 }}
          aria-label="Aumentar precio"
        >
          <Plus className="h-5 w-5 text-muted-foreground" />
        </motion.button>
      </div>
    </div>
  )
}
