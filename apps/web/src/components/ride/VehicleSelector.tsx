"use client"

import { motion } from "framer-motion"
import { Car } from '@/components/icons'

type VehicleType = "standard" | "comfort" | "xl"

interface VehicleSelectorProps {
  selected: VehicleType
  onSelect: (type: VehicleType) => void
}

const vehicles: { type: VehicleType; label: string }[] = [
  { type: "standard", label: "Estándar" },
  { type: "comfort", label: "Confort" },
  { type: "xl", label: "XL" },
]

export function VehicleSelector({ selected, onSelect }: VehicleSelectorProps) {
  return (
    <div className="flex gap-3">
      {vehicles.map((vehicle) => {
        const isSelected = selected === vehicle.type
        return (
          <motion.button
            key={vehicle.type}
            onClick={() => onSelect(vehicle.type)}
            className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 transition-colors ${
              isSelected ? "gradient-border text-foreground" : "bg-muted text-muted-foreground"
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <Car className={`h-4 w-4 ${isSelected ? "text-primary" : ""}`} />
            <span className="text-sm font-medium">{vehicle.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
