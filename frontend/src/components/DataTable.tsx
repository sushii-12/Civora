import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Empty, ErrorNotice, Loading } from './feedback'

interface Column<T> {
  label: string
  cell: (row: T) => ReactNode
  className?: string
}

export function DataTable<T extends { id: number }>({
  title, rows, columns, toolbar, status, error, retry, emptyTitle, emptyMessage, filterKey,
}: {
  title: string
  rows: T[]
  columns: Column<T>[]
  toolbar?: ReactNode
  status: 'loading' | 'ready' | 'error'
  error?: string
  retry: () => void
  emptyTitle: string
  emptyMessage: string
  filterKey?: string
}) {
  const [selection, setSelection] = useState({ key: filterKey, page: 1 })
  const setPage = (page: number) => setSelection({ key: filterKey, page })
  const size = 10
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const currentPage = selection.key === filterKey ? Math.min(pages, selection.page) : 1
  const offset = (currentPage - 1) * size
  const showRows = status === 'ready' && rows.length > 0
  const region = useRef<HTMLDivElement>(null)
  const table = useRef<HTMLTableElement>(null)
  const hintId = useId()
  const [overflowing, setOverflowing] = useState(false)

  useLayoutEffect(() => {
    const scrollArea = region.current
    const grid = table.current
    if (!showRows || !scrollArea || !grid) return
    const measure = () => setOverflowing(scrollArea.scrollWidth > scrollArea.clientWidth)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(scrollArea)
    observer.observe(grid)
    return () => observer.disconnect()
  }, [showRows])

  return <section className="surface table-card" aria-label={title}>
    {toolbar && <div className="toolbar">{toolbar}</div>}
    {status === 'loading' && <Loading />}
    {status === 'error' && <div className="panel-inset"><ErrorNotice message={error ?? 'Unable to load records.'} retry={retry} /></div>}
    {status === 'ready' && (rows.length ? <>
      {overflowing && <p className="table-scroll-hint" id={hintId}>Scroll horizontally to see all columns.</p>}
      <div ref={region} className="table-scroll" tabIndex={overflowing ? 0 : undefined} role="region"
        aria-label={title} aria-describedby={overflowing ? hintId : undefined} data-overflowing={overflowing || undefined}>
        <table ref={table}>
          <caption className="sr-only">{title}</caption>
          <thead><tr>{columns.map(({ label, className }) =>
            <th key={label} scope="col" className={className}>{label}</th>)}</tr></thead>
          <tbody>{rows.slice(offset, offset + size).map((row) => <tr key={row.id}>
            {columns.map(({ label, cell, className }) =>
              <td key={label} className={className}>{cell(row)}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="table-footer">
        <span>{offset + 1}–{Math.min(offset + size, rows.length)} of {rows.length} records</span>
        {pages > 1 && <div className="pager">
          <button aria-label="Previous page" className="icon-button" type="button" disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button>
          <span>Page {currentPage} of {pages}</span>
          <button aria-label="Next page" className="icon-button" type="button" disabled={currentPage === pages}
            onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button>
        </div>}
      </div>
    </> : <Empty title={emptyTitle}>{emptyMessage}</Empty>)}
  </section>
}
