import './GridFooter.css'

interface GridFooterProps {
  totalRows: number
  rowsInDom: number
  lastOperationMs: number
  operation: string
}

export function GridFooter({ totalRows, rowsInDom, lastOperationMs, operation }: GridFooterProps) {
  return (
    <footer className="grid-footer" aria-live="polite">
      <span className="grid-footer__stat">
        <strong>{rowsInDom}</strong> rows in DOM
      </span>
      <span className="grid-footer__divider" aria-hidden="true">
        ·
      </span>
      <span className="grid-footer__stat">
        <strong>{totalRows.toLocaleString()}</strong> total records
      </span>
      <span className="grid-footer__divider" aria-hidden="true">
        ·
      </span>
      <span className="grid-footer__stat">
        Last operation ({operation}): <strong>{lastOperationMs.toFixed(2)} ms</strong>
      </span>
    </footer>
  )
}
