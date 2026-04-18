'use client'

import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

const EVENT_COLORS = {
  tack: '#1a73e8',
  jibe: '#1a73e8',
  reef: '#f29900',
  unreef: '#34a853',
  comment: '#9334e6',
}

export default function TripMap({ points, entries = [] }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current || points.length === 0) return

    import('leaflet').then(({ default: L }) => {
      const map = L.map(containerRef.current, { zoomControl: true })
      mapRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a>',
        maxZoom: 18,
        opacity: 0.8,
      }).addTo(map)

      const latlngs = points.map(p => [parseFloat(p.lat), parseFloat(p.lng)])
      const polyline = L.polyline(latlngs, { color: '#1a73e8', weight: 3, opacity: 0.9 }).addTo(map)

      L.circleMarker(latlngs[0], {
        radius: 7, fillColor: '#34a853', color: '#fff', weight: 2, fillOpacity: 1,
      }).bindPopup('Start').addTo(map)

      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 7, fillColor: '#ea4335', color: '#fff', weight: 2, fillOpacity: 1,
      }).bindPopup('End').addTo(map)

      entries.forEach(entry => {
        if (entry.lat == null || entry.lng == null) return
        const color = EVENT_COLORS[entry.event_type] ?? '#5f6368'
        const label = entry.event_type === 'comment' ? '💬' : entry.event_type
        L.circleMarker([parseFloat(entry.lat), parseFloat(entry.lng)], {
          radius: 5, fillColor: color, color: '#fff', weight: 1.5, fillOpacity: 1,
        }).bindPopup(label.charAt(0).toUpperCase() + label.slice(1)).addTo(map)
      })

      map.fitBounds(polyline.getBounds(), { padding: [30, 30] })
    })

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [points, entries])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
}
