import { Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { createRequest, getRequest, listPoints, listRequests, updateRequestNotes } from '../api/endpoints'
import type { CollectionPoint, CollectionRequest } from '../api/types'
import { DataTable } from '../components/DataTable'
import { Empty, ErrorNotice, Loading } from '../components/feedback'
import { Modal, ModalActions, useSave } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Badge, choicesFor, Details, Filter, PageHeading, SearchBox, SelectField } from '../components/ui'
import { byNewest, collectionStatuses, formatDate, matches, pointLabel, upsert } from '../lib/data'
import { useResource } from '../lib/useResource'

function NewRequest({ close, done }: { close: () => void; done: (request: CollectionRequest) => void }) {
  const points = useResource(listPoints)
  const { busy, error, save, setError } = useSave()
  const activePoints = (points.data ?? []).filter((point) => point.is_active)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const id = Number(fields.get('point'))
    if (!activePoints.some((point) => point.id === id)) {
      setError('Choose an active collection point.')
      return
    }
    void save(() => createRequest({ collection_point_id: id, notes: String(fields.get('notes')).trim() || null }), done)
  }

  return <Modal title="New collection request" close={close} busy={busy}>
    <div className="modal-body">
      {points.status === 'loading' && <Loading label="Loading collection points…" />}
      {points.error && <ErrorNotice message={points.error} retry={points.retry} />}
      {points.status === 'ready' && (activePoints.length
        ? <form className="form-stack" onSubmit={submit}>
          <fieldset className="form-stack" disabled={busy}>
            <SelectField label="Collection point" name="point" required defaultValue="">
              <option value="" disabled>Choose an active collection point</option>
              {activePoints.map((point) => <option key={point.id} value={point.id}>{point.name} (#{point.id})</option>)}
            </SelectField>
            <label>Collection notes <span className="optional">Optional</span>
              <textarea name="notes" maxLength={1000} rows={4} placeholder="Add instructions for collection" />
            </label>
          </fieldset>
          {error && <ErrorNotice message={error} />}
          <ModalActions close={close} busy={busy} label="Create request" />
        </form>
        : <Empty title="No active collection points">Create or activate a collection point to request collection.</Empty>)}
    </div>
  </Modal>
}

function RequestDetail({ id, points, close, done }: {
  id: number; points?: CollectionPoint[]; close: () => void; done: (request: CollectionRequest) => void
}) {
  const resource = useResource(useCallback((signal: AbortSignal) => getRequest(id, signal), [id]))
  const { busy, error, save } = useSave()
  const request = resource.data

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const notes = String(new FormData(event.currentTarget).get('notes')).trim() || null
    void save(() => updateRequestNotes(id, notes), done)
  }

  return <Modal title={`Collection request #${id}`} close={close} busy={busy}>
    <div className="modal-body">
      {resource.status === 'loading' && <Loading label="Loading collection request…" />}
      {resource.error && <ErrorNotice message={resource.error} retry={resource.retry} />}
      {request && <form className="form-stack" onSubmit={submit}>
        <Details items={[
          { label: 'Collection point', value: pointLabel(points, request.collection_point_id) },
          { label: 'Status', value: <Badge value={request.status} /> },
          { label: 'Requested at', value: formatDate(request.requested_at) },
          { label: 'Completed at', value: formatDate(request.completed_at) },
          { label: 'Requested by', value: `User #${request.requested_by}` },
        ]} />
        <label>Collection notes<textarea name="notes" defaultValue={request.notes ?? ''} rows={4} maxLength={1000} disabled={busy} /></label>
        {error && <ErrorNotice message={error} />}
        <ModalActions close={close} busy={busy} label="Save notes" />
      </form>}
    </div>
  </Modal>
}

export function CollectionRequests() {
  const requests = useResource(listRequests)
  const points = useResource(listPoints)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState<'new' | number>()
  const notify = useToast()
  const rows = (requests.data ?? []).filter((request) =>
    (!status || request.status === status) && matches(query,
      `#${request.id}`, request.notes, pointLabel(points.data, request.collection_point_id), request.collection_point_id))
    .sort((a, b) => byNewest(a.requested_at, b.requested_at) || b.id - a.id)

  const close = () => setDialog(undefined)
  const done = (request: CollectionRequest) => {
    if (requests.status === 'ready') requests.update((all) => upsert(all, request))
    else requests.retry()
    notify(dialog === 'new' ? 'Collection request created.' : 'Collection notes updated.')
    close()
  }

  return <>
    <PageHeading title="Collection requests" description="Request waste pickup and manage collection notes."
      action={<button className="button button-primary" type="button" onClick={() => setDialog('new')}><Plus size={18} />New request</button>} />
    <DataTable title="Collection requests" rows={rows} {...requests} filterKey={JSON.stringify([query, status])}
      emptyTitle={requests.data?.length ? 'No matching requests' : 'No collection requests yet'}
      emptyMessage={requests.data?.length ? 'Try a different search or filter.' : 'Request a pickup from an active collection point.'}
      toolbar={<>
        <SearchBox value={query} change={setQuery} placeholder="Search collection requests" />
        <Filter label="Request status" value={status} onChange={setStatus} choices={choicesFor(collectionStatuses, 'All statuses')} />
      </>}
      columns={[
        { label: 'Request ID', cell: (request) => <strong>#{request.id}</strong> },
        { label: 'Collection point', cell: (request) => pointLabel(points.data, request.collection_point_id) },
        { label: 'Notes', cell: (request) => <span className="cell-preview">{request.notes || '—'}</span> },
        { label: 'Status', cell: (request) => <Badge value={request.status} /> },
        { label: 'Requested at', cell: (request) => formatDate(request.requested_at) },
        { label: 'Actions', className: 'align-right', cell: (request) =>
          <button className="button button-quiet" type="button" aria-label={`View request #${request.id}`} onClick={() => setDialog(request.id)}>View details</button> },
      ]} />
    {dialog === 'new' && <NewRequest close={close} done={done} />}
    {typeof dialog === 'number' && <RequestDetail key={dialog} id={dialog} points={points.data} close={close} done={done} />}
  </>
}
