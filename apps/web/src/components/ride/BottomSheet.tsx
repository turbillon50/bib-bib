"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { LocationInputs } from "./LocationInputs"
import { VehicleSelector } from "./VehicleSelector"
import { PriceSelector } from "./PriceSelector"
import { PaymentSelector } from "./PaymentSelector"
import { DriversNearby } from "./DriversNearby"
import { useGeolocation } from "@/hooks/useGeolocation"
import { useTripStore } from "@/store/tripStore"
import { api } from "@/lib/api"

type VehicleType = "standard" | "comfort" | "xl"
type PaymentMethod = "cash" | "card"

interface BottomSheetProps {
  nearbyDriversCount?: number
}

export function BottomSheet({ nearbyDriversCount = 0 }: BottomSheetProps) {
  const router = useRouter()
  const { location } = useGeolocation()
  const center = location
    ? { lat: location.latitude, lng: location.longitude }
    : { lat: 19.4326, lng: -99.1332 }

  const [pickup, setPickup] = useState("")
  const [destination, setDestination] = useState("")
  const [vehicleType, setVehicleType] = useState<VehicleType>("standard")
  const [price, setPrice] = useState(95)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash")
  const [isSearching, setIsSearching] = useState(false)

  const handleSwap = () => {
    const temp = pickup
    setPickup(destination)
    setDestination(temp)
  }

  const handleSearch = async () => {
    if (!pickup || !destination) return
    setIsSearching(true)
    try {
      const res = await api.post("/rides", {
        originAddress: pickup,
        originLatitude: center.lat,
        originLongitude: center.lng,
        destinationAddress: destination,
        destinationLatitude: center.lat + 0.01,
        destinationLongitude: center.lng + 0.01,
        proposedPrice: price,
        paymentMethod,
        vehicleType,
        isScheduled: false,
      })
      const { setActiveRide } = useTripStore.getState()
      setActiveRide(res.data?.data?.ride)
      router.push("/app/offers")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <motion.div
      className="flex-1 rounded-t-3xl bg-card px-5 pb-8 pt-6"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="mb-6 flex justify-center">
        <div className="h-1 w-12 rounded-full bg-muted" />
      </div>

      <div className="flex flex-col gap-5">
        <LocationInputs
          pickup={pickup}
          destination={destination}
          onPickupChange={setPickup}
          onDestinationChange={setDestination}
          onSwap={handleSwap}
        />

        <VehicleSelector selected={vehicleType} onSelect={setVehicleType} />

        <PriceSelector price={price} onPriceChange={setPrice} />

        <PaymentSelector selected={paymentMethod} onSelect={setPaymentMethod} />

        <motion.button
          onClick={handleSearch}
          disabled={isSearching || !pickup || !destination}
          className="cta-glow gradient-bg pulse-glow relative w-full rounded-xl py-4 text-base font-semibold text-white transition-opacity disabled:opacity-50"
          whileTap={{ scale: 0.98 }}
        >
          {isSearching ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <motion.span
                className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              Buscando...
            </motion.span>
          ) : (
            "Buscar chofer"
          )}
        </motion.button>

        {nearbyDriversCount > 0 && <DriversNearby count={nearbyDriversCount} />}
      </div>
    </motion.div>
  )
}
