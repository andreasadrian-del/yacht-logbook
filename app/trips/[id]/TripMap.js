'use client'

import { useEffect, useRef } from 'react'

export default function TripMap({ points }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (mapRef.current || !containerRef.current || points.length === 0) return

    // Dynamically import Leaflet so it never runs on the server
    import('leaflet').then(({ default: L }) => {
      // Fix default icon paths broken by bundlers
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

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
        weight: 3,
        opacity: 0.85,
      }).addTo(map)

      // Start marker (green circle)
      const startIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:#34C759;border:2.5px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.4)">
        </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      // End marker (red circle)
      const endIcon = L.divIcon({
        className: '',
        html: `<div style="
          width:14px;height:14px;border-radius:50%;
          background:#FF3B30;border:2.5px solid white;
          box-shadow:0 1px 4px rgba(0,0,0,0.4)">
        </div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })

      L.marker(latlngs[0], { icon: startIcon }).bindPopup('Start').addTo(map)
      L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).bindPopup('End').addTo(map)

      // Fit map to track
      map.fitBounds(polyline.getBounds(), { padding: [32, 32] })
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
      style={{ height: '100%', width: '100%' }}
    />
  )
}
