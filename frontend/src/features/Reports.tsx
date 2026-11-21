import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { getReport, listPoints, listReports, listRequests, updateReport } from '../api/endpoints'
import type { CollectionPoint, Report, ReportPatch, ReportStatus } from '../api/types'
import { DataTable } from '../components/DataTable'
import { ErrorNotice, Loading } from '../components/feedback'
import { Modal, ModalActions, useSave } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Badge, choicesFor, Details, Filter, PageHeading, SearchBox, SelectField } from '../components/ui'
import {
  byNewest, formatDate, humanize, idMatches, matches, pointChoices, pointLabel,
  reportStatuses, reportTransitions, reportTypes, upsert,
} from '../lib/data'
import { useResource } from '../lib/useResource'

function ReportEditor({ report, points, close, done, onBusy }: {
  report: Report; points?: CollectionPoint[]; close: () => void
  done: (report: Report) => void; onBusy: (busy: boolean) => void
}) {
  const requests = useResource(listRequests)
  const { busy, error, save, setError } = useSave()
  const [change, setChange] = useState<ReportPatch>()
  const eligible = (requests.data ?? []).filter((request) => request.id !== report.collection_request_id &&
    (report.collection_point_id === null || report.collection_point_id === request.collection_point_id))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const fields = new FormData(event.currentTarget)
    const status = fields.get('status') as ReportStatus
    if (status !== report.status && !reportTransitions[report.status].includes(status)) {
      setError('Choose an available status transition.')
      return
    }
    const patch: ReportPatch = { status }
    const link = fields.get('linked_request')
    if (link === 'remove') patch.collection_request_id = null
    else if (link && link !== 'keep') {
      const id = Number(link)
      if (!eligible.some((request) => request.id === id)) {
        setError('Choose a collection request available for this report.')
        return
      }
      patch.collection_request_id = id
    }
    if (status === report.status && patch.collection_request_id === undefined) {
      setError('Choose a new status or change the linked request.')
      return
    }
    setChange(patch)
  }

  async function confirm(patch: ReportPatch) {
    onBusy(true)
    try { await save(() => updateReport(report.id, patch), done) }
    finally { onBusy(false) }
  }

  return <>
    <form className="form-stack" onSubmit={submit} hidden={!!change}>
      <div className="form-grid report-editor">
        <SelectField label="Report status" name="status" defaultValue={report.status}>
          <option value={report.status}>{humanize(report.status)} (current)</option>
          {reportTransitions[report.status].map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
        </SelectField>
        <SelectField label="Linked collection request" name="linked_request" defaultValue="keep">
          <option value="keep">{report.collection_request_id === null ? 'No request linked' : `Keep request #${report.collection_request_id}`}</option>
          {eligible.map((request) => <option key={request.id} value={request.id}>
            #{request.id} · {pointLabel(points, request.collection_point_id)}
          </option>)}
          {report.collection_request_id !== null && <option value="remove">Remove linked request</option>}
        </SelectField>
      </div>
      {requests.status === 'loading' && <p className="field-help" role="status">Loading requests available to link…</p>}
      {requests.error && <ErrorNotice message={requests.error} retry={requests.retry} />}
      {requests.status === 'ready' && !eligible.length && <p className="field-help">There are no other collection requests available to link.</p>}
      {error && !change && <ErrorNotice message={error} />}
      <ModalActions close={close} label="Review changes" />
    </form>
    {change && <div className="form-stack">
      <div className="confirmation" role="status">
        <strong>Apply these changes to report #{report.id}?</strong>
        {change.status !== report.status && <p>Change status to {humanize(change.status).toLowerCase()}.</p>}
        {change.collection_request_id === null && <p>Remove the linked collection request.</p>}
        {typeof change.collection_request_id === 'number' && <p>Link collection request #{change.collection_request_id}.</p>}
        {reportTransitions[change.status].length === 0 && <p>This status closes the report.</p>}
      </div>
      {error && <ErrorNotice message={error} />}
      <ModalActions close={() => { setChange(undefined); setError('') }} busy={busy} label="Confirm update"
        submit={() => void confirm(change)} />
    </div>}
  </>
}

function ReportDetail({ id, points, close, done }: {
  id: number; points?: CollectionPoint[]; close: () => void; done: (report: Report) => void
}) {
  const result = useResource(useCallback((signal: AbortSignal) => getReport(id, signal), [id]))
  const [busy, setBusy] = useState(false)
  const report = result.data

  return <Modal title={`Citizen report #${id}`} close={close} busy={busy}>
    <div className="modal-body form-stack">
      {result.status === 'loading' && <Loading label="Loading report…" />}
      {result.error && <ErrorNotice message={result.error} retry={result.retry} />}
      {report && <>
        <Details items={[
          { label: 'Report type', value: humanize(report.report_type) },
          { label: 'Status', value: <Badge value={report.status} /> },
          { label: 'Collection point', value: pointLabel(points, report.collection_point_id) },
          { label: 'Linked request', value: report.collection_request_id === null ? '—' : `Request #${report.collection_request_id}` },
          { label: 'Reported at', value: formatDate(report.reported_at) },
          { label: 'Resolved at', value: formatDate(report.resolved_at) },
          { label: 'Reported by', value: `Citizen #${report.reported_by}` },
        ]} />
        <div className="report-description"><h3>Description</h3><p>{report.description}</p></div>
        {report.image_path && <div className="report-description">
          <h3>Attachment path</h3>
          <p><code>{report.image_path}</code></p>
        </div>}
        {reportTransitions[report.status].length
          ? <ReportEditor report={report} points={points} close={close} done={done} onBusy={setBusy} />
          : <div className="modal-actions"><button type="button" className="button button-secondary" onClick={close}>Close</button></div>}
      </>}
    </div>
  </Modal>
}

export function Reports() {
  const reports = useResource(listReports)
  const points = useResource(listPoints)
  const notify = useToast()
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [point, setPoint] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number>()
  const rows = (reports.data ?? []).filter((report) =>
    (!status || report.status === status) && (!type || report.report_type === type) &&
    idMatches(report.collection_point_id, point) && matches(query,
      `#${report.id}`, report.description, pointLabel(points.data, report.collection_point_id)))
    .sort((a, b) => byNewest(a.reported_at, b.reported_at) || b.id - a.id)

  function done(report: Report) {
    reports.update((all) => upsert(all, report))
    notify('Citizen report updated.')
    setSelected(undefined)
  }

  return <>
    <PageHeading title="Reports management" description="Review citizen reports, update their status, and link collection requests." />
    <DataTable title="Citizen reports" rows={rows} {...reports} filterKey={JSON.stringify([query, status, type, point])}
      emptyTitle={reports.data?.length ? 'No matching reports' : 'No citizen reports yet'}
      emptyMessage={reports.data?.length ? 'Try a different search or filter.' : 'Reports submitted by citizens will appear here.'}
      toolbar={<>
        <SearchBox value={query} change={setQuery} placeholder="Search reports" />
        <Filter label="Report status" value={status} onChange={setStatus} choices={choicesFor(reportStatuses, 'All statuses')} />
        <Filter label="Report type" value={type} onChange={setType} choices={choicesFor(reportTypes, 'All report types')} />
        <Filter label="Collection point" value={point} onChange={setPoint}
          choices={pointChoices(points.data, (reports.data ?? []).map((report) => report.collection_point_id))} />
      </>}
      columns={[
        { label: 'Report', cell: (report) => <div className="cell-stack"><strong>#{report.id} · {humanize(report.report_type)}</strong><span className="cell-preview">{report.description}</span></div> },
        { label: 'Collection point', cell: (report) => pointLabel(points.data, report.collection_point_id) },
        { label: 'Linked request', cell: (report) => report.collection_request_id === null ? '—' : `#${report.collection_request_id}` },
        { label: 'Status', cell: (report) => <Badge value={report.status} /> },
        { label: 'Reported at', cell: (report) => formatDate(report.reported_at) },
        { label: 'Resolved at', cell: (report) => formatDate(report.resolved_at) },
        { label: 'Actions', className: 'align-right', cell: (report) => <button type="button" className="button button-quiet"
          aria-label={`View report #${report.id}`} onClick={() => setSelected(report.id)}>Review</button> },
      ]} />
    {selected !== undefined && <ReportDetail key={selected} id={selected} points={points.data} close={() => setSelected(undefined)} done={done} />}
  </>
}
