'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { softDeleteLeg } from '@/lib/db/legs'
import { formatDate } from '@/lib/format'
import LegRow from '@/components/LegRow'
import TripCard from '@/components/TripCard'
import EditTripModal from '@/components/EditTripModal'
import CreateTripModal from '@/components/CreateTripModal'
import ConfirmModal from '@/components/ConfirmModal'

export default function TripsList({ grouped, standaloneLegs, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTrip, setEditTrip] = useState(null)
  const [confirmLeg, setConfirmLeg] = useState(null)
  const [warnLeg, setWarnLeg] = useState(null)
  const [deleting, setDeleting] = useState(false)

  function handleDeleteLegRequest(leg, parentTripId = null) {
    if (!leg.ended_at) { setWarnLeg(leg); return }
    setConfirmLeg({ leg, parentTripId })
  }

  async function confirmDeleteLeg() {
    if (!confirmLeg) return
    setDeleting(true)
    await softDeleteLeg(supabase, confirmLeg.leg.id)
    setConfirmLeg(null)
    setDeleting(false)
    onRefresh()
  }

  const totalLegs = grouped.reduce((sum, { legs }) => sum + legs.length, 0) + standaloneLegs.length

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {totalLegs} {totalLegs === 1 ? 'Leg' : 'Legs'}
        </p>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ padding: '8px 16px', borderRadius: 20, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + Create Trip
        </button>
      </div>

      {grouped.map(({ trip, legs: tripLegs }) => (
        <TripCard key={trip.id} trip={trip} legs={tripLegs} onEdit={setEditTrip} onDeleteLeg={handleDeleteLegRequest} />
      ))}

      {standaloneLegs.length > 0 && (
        <>
          {grouped.length > 0 && (
            <p style={{ fontSize: 12, fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '4px 0 10px' }}>
              Unassigned Legs
            </p>
          )}
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {standaloneLegs.map((leg, i) => (
              <LegRow key={leg.id} leg={leg} tripId={null} isFirst={i === 0} onDelete={handleDeleteLegRequest} />
            ))}
          </div>
        </>
      )}

      {totalLegs === 0 && grouped.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, margin: '0 0 12px' }}>🗺️</p>
          <p style={{ fontSize: 17, fontWeight: 600, color: '#202124', margin: '0 0 6px' }}>No legs yet</p>
          <p style={{ fontSize: 14, color: '#5f6368', margin: 0 }}>Start tracking from the Tracking tab.</p>
        </div>
      )}

      {showCreateModal && (
        <CreateTripModal onClose={() => setShowCreateModal(false)} onCreated={onRefresh} />
      )}

      {editTrip && (
        <EditTripModal trip={editTrip} onClose={() => setEditTrip(null)} onSaved={onRefresh} />
      )}

      {warnLeg && (
        <ConfirmModal
          title="Leg Still Recording"
          body="This leg is currently active. Stop it on the Tracking tab before deleting."
          onCancel={() => setWarnLeg(null)}
        />
      )}

      {confirmLeg && (
        <ConfirmModal
          title="Remove Leg?"
          body={`${formatDate(confirmLeg.leg.started_at)} — this leg will be moved to the deleted archive and can be restored from the More tab.`}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          destructive
          loading={deleting}
          onConfirm={confirmDeleteLeg}
          onCancel={() => !deleting && setConfirmLeg(null)}
        />
      )}
    </>
  )
}
