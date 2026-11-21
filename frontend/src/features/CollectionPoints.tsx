import { Pencil, Plus } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { FormEvent } from 'react'
import { createPoint, getPoint, listPoints, updatePoint } from '../api/endpoints'
import type { CollectionPoint, PointInput, PointPatch, WasteType } from '../api/types'
import { DataTable } from '../components/DataTable'
import { ErrorNotice, Loading } from '../components/feedback'
import { Modal, ModalActions, useSave } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Badge, choicesFor, FillMeter, Filter, PageHeading, SearchBox, SelectField } from '../components/ui'
import { formatNumber, humanize, matches, upsert, wasteTypes } from '../lib/data'
import { useResource } from '../lib/useResource'

function PointForm({ point, close, done, onBusy }: {
  point?: CollectionPoint; close: () => void; done: (point: CollectionPoint) => void; onBusy: (busy: boolean) => void
}) {
  const { save, busy, error, setError } = useSave()
  const [confirmation, setConfirmation] = useState<PointPatch>()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const fields = new FormData(event.currentTarget)
    const input: PointInput = {
      name: String(fields.get('name')).trim(),
      address: String(fields.get('address')).trim(),
      waste_type: fields.get('waste_type') as WasteType,
      capacity: Number(fields.get('capacity')),
      current_fill_level: Number(fields.get('current_fill_level')),
    }
    if (input.name.length < 2 || input.address.length < 5) {
      setError('Enter a name of at least 2 characters and an address of at least 5 characters.')
      return
    }
    if (!Number.isFinite(input.capacity) || input.capacity <= 0) {
      setError('Capacity must be greater than zero.')
      return
    }
    if (!Number.isFinite(input.current_fill_level) || input.current_fill_level < 0 || input.current_fill_level > input.capacity) {
      setError('Estimated fill must be between zero and capacity.')
      return
    }
    if (!point) {
      run(() => createPoint(input))
      return
    }

    const changes: PointPatch = {}
    if (String(fields.get('name')) !== point.name) changes.name = input.name
    if (String(fields.get('address')) !== point.address) changes.address = input.address
    if (input.waste_type !== point.waste_type) changes.waste_type = input.waste_type
    if (input.capacity !== point.capacity) changes.capacity = input.capacity
    if (input.current_fill_level !== point.current_fill_level) changes.current_fill_level = input.current_fill_level
    const isActive = fields.get('is_active') === 'on'
    if (isActive !== point.is_active) {
      changes.is_active = isActive
      setConfirmation(changes)
      return
    }
    if (!Object.keys(changes).length) {
      setError('Change a field before saving.')
      return
    }
    run(() => updatePoint(point.id, changes))
  }

  async function run(action: () => Promise<CollectionPoint>) {
    onBusy(true)
    try { await save(action, done) }
    finally { onBusy(false) }
  }

  return <>
    <form className="modal-body form-stack" onSubmit={submit} hidden={!!confirmation}>
      {error && !confirmation && <ErrorNotice message={error} />}
      <fieldset disabled={busy} className="form-stack">
        <label>Name<input required name="name" minLength={2} maxLength={150} defaultValue={point?.name} /></label>
        <label>Address<textarea required name="address" minLength={5} maxLength={500} rows={2} defaultValue={point?.address} /></label>
        <SelectField label="Accepted waste type" name="waste_type" defaultValue={point?.waste_type ?? 'mixed'}>
          {wasteTypes.map((type) => <option key={type} value={type}>{humanize(type)}</option>)}
        </SelectField>
        <div className="form-grid">
          <label>Capacity (kg)<input required name="capacity" type="number" min="0" step="any" defaultValue={point?.capacity} /></label>
          <label>Estimated fill (kg)<input required name="current_fill_level" type="number" min="0" step="any" defaultValue={point?.current_fill_level ?? 0} /></label>
        </div>
        {point && <label className="checkbox"><input name="is_active" type="checkbox" defaultChecked={point.is_active} />Active collection point</label>}
      </fieldset>
      <ModalActions close={close} busy={busy} label={point ? 'Save changes' : 'Create collection point'} />
    </form>
    {point && confirmation && <div className="modal-body form-stack">
      <p className="confirmation" role="status">{confirmation.is_active
        ? 'Activate this collection point so it can be used for new deposits and collection requests?'
        : 'Deactivate this collection point? It will become unavailable for new deposits and collection requests.'}</p>
      {error && <ErrorNotice message={error} />}
      <ModalActions close={() => { setConfirmation(undefined); setError('') }} busy={busy}
        label={confirmation.is_active ? 'Activate point' : 'Deactivate point'}
        submit={() => void run(() => updatePoint(point.id, confirmation))} />
    </div>}
  </>
}

function EditPoint({ id, close, done }: { id: number; close: () => void; done: (point: CollectionPoint) => void }) {
  const load = useCallback((signal: AbortSignal) => getPoint(id, signal), [id])
  const point = useResource(load)
  const [busy, setBusy] = useState(false)
  return <Modal title="Edit collection point" close={close} busy={busy}>
    {point.status === 'loading' && <Loading label="Loading collection point…" />}
    {point.error && <div className="modal-body"><ErrorNotice message={point.error} retry={point.retry} /></div>}
    {point.data && <PointForm point={point.data} close={close} done={done} onBusy={setBusy} />}
  </Modal>
}

function NewPoint({ close, done }: { close: () => void; done: (point: CollectionPoint) => void }) {
  const [busy, setBusy] = useState(false)
  return <Modal title="New collection point" close={close} busy={busy}>
    <PointForm close={close} done={done} onBusy={setBusy} />
  </Modal>
}

export function CollectionPoints() {
  const points = useResource(listPoints)
  const notify = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [editor, setEditor] = useState<'new' | number>()
  const rows = (points.data ?? []).filter((point) =>
    matches(query, point.name, point.address, '#' + point.id, point.id) &&
    (!type || point.waste_type === type) &&
    (!status || status === (point.is_active ? 'active' : 'inactive')))
    .sort((a, b) => a.id - b.id)

  const close = () => setEditor(undefined)
  const done = (point: CollectionPoint) => {
    if (points.status === 'ready') points.update((all) => upsert(all, point))
    else points.retry()
    notify(editor === 'new' ? 'Collection point created.' : 'Collection point updated.')
    close()
  }

  return <>
    <PageHeading title="Collection points" description="Manage locations, accepted waste types, capacities, and estimated fill."
      action={<button type="button" className="button button-primary" onClick={() => setEditor('new')}><Plus size={18} />New collection point</button>} />
    <DataTable title="Collection points" rows={rows} {...points} filterKey={JSON.stringify([query, type, status])}
      emptyTitle={points.data?.length ? 'No matching collection points' : 'No collection points yet'}
      emptyMessage={points.data?.length ? 'Try a different search or filter.' : 'Create a collection point to manage an available disposal location.'}
      toolbar={<>
        <SearchBox value={query} change={setQuery} placeholder="Search collection points" />
        <Filter label="Waste type" value={type} onChange={setType} choices={choicesFor(wasteTypes, 'All waste types')} />
        <Filter label="Point status" value={status} onChange={setStatus} choices={choicesFor(['active', 'inactive'], 'All statuses')} />
      </>}
      columns={[
        { label: 'Collection point', cell: (point) => <div className="cell-stack point-cell"><strong>{point.name}</strong><span>{point.address}</span></div> },
        { label: 'Waste type', cell: (point) => <Badge value={point.waste_type} /> },
        { label: 'Capacity', cell: (point) => `${formatNumber(point.capacity)} kg` },
        { label: 'Estimated fill', cell: (point) => <div className="cell-stack"><strong>{formatNumber(point.current_fill_level)} kg</strong><FillMeter fill={point.current_fill_level} capacity={point.capacity} /></div> },
        { label: 'Status', cell: (point) => <Badge value={point.is_active ? 'active' : 'inactive'} /> },
        { label: 'Actions', className: 'align-right', cell: (point) => <button type="button" className="button button-quiet"
          aria-label={`Edit ${point.name}`} onClick={() => setEditor(point.id)}><Pencil size={15} />Edit</button> },
      ]} />
    {editor === 'new' && <NewPoint close={close} done={done} />}
    {typeof editor === 'number' && <EditPoint key={editor} id={editor} close={close} done={done} />}
  </>
}
