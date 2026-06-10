"use client"

import { motion } from "framer-motion"
import { Banknote, CreditCard } from '@/components/icons'

type PaymentMethod = "cash" | "card"

interface PaymentSelectorProps {
  selected: PaymentMethod
  onSelect: (method: PaymentMethod) => void
}

export function PaymentSelector({ selected, onSelect }: PaymentSelectorProps) {
  return (
    <div className="flex gap-3">
      <PaymentOption
        label="Efectivo"
        icon={<Banknote className="h-5 w-5" />}
        isSelected={selected === "cash"}
        onClick={() => onSelect("cash")}
      />
      <PaymentOption
        label="Tarjeta"
        icon={<CreditCard className="h-5 w-5" />}
        isSelected={selected === "card"}
        onClick={() => onSelect("card")}
      />
    </div>
  )
}

interface PaymentOptionProps {
  label: string
  icon: React.ReactNode
  isSelected: boolean
  onClick: () => void
}

function PaymentOption({ label, icon, isSelected, onClick }: PaymentOptionProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 transition-colors ${
        isSelected ? "gradient-border text-foreground" : "bg-muted text-muted-foreground"
      }`}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </motion.button>
  )
}
