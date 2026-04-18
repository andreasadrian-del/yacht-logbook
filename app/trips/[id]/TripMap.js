'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export default function TripMap({ points }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current || points.length === 0) return

    import('leaflet').then(({ default: L }) => {
      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      // Base layer: OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      // Overlay: OpenSeaMap nautical charts
      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
        maxZoom: 18,
        opacity: 0.8,
      }).addTo(map)

      // Track polyline
      const latlngs = points.map(p => [parseFloat(p.lat), parseFloat(p.lng)])
      const polyline = L.polyline(latlngs, {
        color: '#007AFF',
        weight: 4,
        opacity: 0.9,
      }).addTo(map)

      // Start marker (green)
      L.circleMarker(latlngs[0], {
        radius: 7,
        fillColor: '#34C759',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).bindPopup('Start').addTo(map)

      // End marker (red)
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 7,
        fillColor: '#FF3B30',
        color: '#fff',
        weight: 2,
        fillOpacity: 1,
      }).bindPopup('End').addTo(map)

      map.fitBounds(polyline.getBounds(), { padding: [40, 40] })
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [points])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0 }}
    />
  )
}
