'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function LiveMap({ trackPoints, currentPosition, initialCenter }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const polylineRef = useRef(null)
  const positionMarkerRef = useRef(null)

  // Initialise map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    import('leaflet').then(async ({ default: L }) => {
      await import('leaflet-gesture-handling')
      await import('leaflet-gesture-handling/dist/leaflet-gesture-handling.css')
      const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false, gestureHandling: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', { maxZoom: 18, opacity: 0.8 }).addTo(map)

      map.setView(
        initialCenter ? [initialCenter.lat, initialCenter.lng] : [48, 10],
        initialCenter ? 14 : 4
      )

      // Empty polyline — will be updated as points come in
      polylineRef.current = L.polyline([], { color: '#1a73e8', weight: 4, opacity: 0.9 }).addTo(map)

      // Current position marker
      positionMarkerRef.current = L.circleMarker([0, 0], {
        radius: 8,
        fillColor: '#1a73e8',
        color: 'white',
        weight: 2.5,
        fillOpacity: 1,
      }).addTo(map)
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [])

  // Update polyline when track points grow
  useEffect(() => {
    if (!polylineRef.current || trackPoints.length === 0) return
    const latlngs = trackPoints.map(p => [p.lat, p.lng])
    polylineRef.current.setLatLngs(latlngs)
  }, [trackPoints])

  // Pan to current position and update marker
  useEffect(() => {
    if (!mapRef.current || !positionMarkerRef.current || !currentPosition) return
    const latlng = [currentPosition.lat, currentPosition.lng]
    positionMarkerRef.current.setLatLng(latlng)
    mapRef.current.setView(latlng, Math.max(mapRef.current.getZoom(), 14), { animate: true, duration: 1 })
  }, [currentPosition])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
