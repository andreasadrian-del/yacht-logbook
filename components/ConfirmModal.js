'use client'

export default function ConfirmModal({ title, body, confirmLabel = 'OK', onConfirm, onCancel, loading = false, destructive = false }) {
  return (
    <div onClick={() => !loading && onCancel()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, padding: '28px 20px', maxWidth: 320, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: '#202124', textAlign: 'center' }}>{title}</p>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#5f6368', textAlign: 'center', lineHeight: 1.5 }}>{body}</p>
        {onConfirm ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onCancel} disabled={loading} style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: '1px solid #e8eaed', background: '#fff', color: '#202124', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', background: loading ? '#dadce0' : destructive ? '#ea4335' : '#1a73e8', color: loading ? '#9aa0a6' : '#fff', fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
            >
              {confirmLabel}
            </button>
          </div>
        ) : (
          <button onClick={onCancel} style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', background: '#1a73e8', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            {confirmLabel}
          </button>
        )}
      </div>
    </div>
  )
}
