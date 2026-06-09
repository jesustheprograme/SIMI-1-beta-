import { useEffect, useRef } from 'react'
import { PLC_PANEL_URL } from '../config'

export function PlcPanelModal({ onClose }: { onClose: () => void }) {
  const panelFrameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    panelFrameRef.current?.setAttribute(
      'src',
      `${PLC_PANEL_URL}${PLC_PANEL_URL.includes('?') ? '&' : '?'}embed=${Date.now()}`,
    )
  }, [])

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section className="plc-modal iframe-modal" role="dialog" aria-modal="true" aria-label="Panel PLC Raspberry">
        <button className="modal-close" onClick={onClose} type="button" aria-label="Cerrar panel">
          x
        </button>
        <iframe className="plc-panel-frame" ref={panelFrameRef} src="about:blank" title="Panel PLC Raspberry" />
      </section>
    </div>
  )
}
