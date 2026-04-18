'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const TripContext = createContext(null)

export function TripProvider({ children }) {
  const [tripId, setTripIdState] = useState(null)
  const [isTracking, setIsTracking] = useState(null) // null = hydrating
  const [currentPosition, setCurrentPosition] = useState(null)

  useEffect(() => {
    const stored = localStorage.getItem('activeTripId')
    if (stored) { setTripIdState(stored); setIsTracking(true) }
    else setIsTracking(false)
  }, [])

  function startTrip(id) {
    setTripIdState(id)
    setIsTracking(true)
    localStorage.setItem('activeTripId', id)
  }

  function endTrip() {
    setTripIdState(null)
    setIsTracking(false)
    setCurrentPosition(null)
    localStorage.removeItem('activeTripId')
  }

  return (
    <TripContext.Provider value={{ tripId, isTracking, currentPosition, setCurrentPosition, startTrip, endTrip }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTripContext() {
  return useContext(TripContext)
}
