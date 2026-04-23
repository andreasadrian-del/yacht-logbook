'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

export const LEG_COLORS = ['#1a73e8', '#34a853', '#ea4335', '#f29900', '#9334e6', '#00acc1', '#ff6d00', '#e91e63']

export default function TripOverviewMap({ legs, pointsByLeg }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const hasPoints = legs.some(l => (pointsByLeg[l.id] ?? []).length > 0)
    if (!hasPoints) return

    import('leaflet').then(async ({ default: L }) => {
      await import('leaflet-gesture-handling')
      await import('leaflet-gesture-handling/dist/leaflet-gesture-handling.css')

      const map = L.map(containerRef.current, { zoomControl: true, gestureHandling: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
        maxZoom: 18, opacity: 0.8,
      }).addTo(map)

      const allLatLngs = []

      legs.forEach((leg, i) => {
        const points = pointsByLeg[leg.id] ?? []
        if (points.length === 0) return
        const color = LEG_COLORS[i % LEG_COLORS.length]
        const latlngs = points.map(p => [parseFloat(p.lat), parseFloat(p.lng)])
        allLatLngs.push(...latlngs)

        L.polyline(latlngs, { color, weight: 3.5, opacity: 0.9 }).addTo(map)

        const num = i + 1
        L.marker(latlngs[0], {
          icon: L.divIcon({
            html: `<div style="background:${color};color:#fff;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35);font-family:-apple-system,sans-serif">${num}</div>`,
            className: '',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).addTo(map)
      })

      if (allLatLngs.length > 0) {
        map.invalidateSize()
        map.fitBounds(L.latLngBounds(allLatLngs), { padding: [32, 32] })
      }
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [legs, pointsByLeg])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
