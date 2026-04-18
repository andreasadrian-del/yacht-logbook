'use client'
import { createContext, useContext, useState, useEffect } from 'react'

const TripContext = createContext(null)

export function TripProvider({ children }) {
  const [tripId, setTripIdState] = useState(null)
  const [isTracking, setIsTracking] = useState(null) // null = hydrating
  const [tripStartTime, setTripStartTime] = useState(null)
  const [currentPosition, setCurrentPosition] = useState(null)

  useEffect(() => {
    const storedId = localStorage.getItem('activeTripId')
    const storedTime = localStorage.getItem('tripStartTime')
    if (storedId) {
      setTripIdState(storedId)
      setIsTracking(true)
      if (storedTime) setTripStartTime(parseInt(storedTime))
    } else {
      setIsTracking(false)
    }
  }, [])

  function startTrip(id) {
    const now = Date.now()
    setTripIdState(id)
    setIsTracking(true)
    setTripStartTime(now)
    localStorage.setItem('activeTripId', id)
    localStorage.setItem('tripStartTime', now.toString())
  }

  function endTrip() {
    setTripIdState(null)
    setIsTracking(false)
    setTripStartTime(null)
    setCurrentPosition(null)
    localStorage.removeItem('activeTripId')
    localStorage.removeItem('tripStartTime')
  }

  return (
    <TripContext.Provider value={{ tripId, isTracking, tripStartTime, currentPosition, setCurrentPosition, startTrip, endTrip }}>
      {children}
    </TripContext.Provider>
  )
}

export function useTripContext() {
  return useContext(TripContext)
}
