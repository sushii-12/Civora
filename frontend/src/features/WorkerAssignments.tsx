import { Info, Plus } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { createAssignment, listAssignments, listPoints, listRequests } from '../api/endpoints'
import type { WorkerAssignment } from '../api/types'
import { DataTable } from '../components/DataTable'
import { Empty, ErrorNotice, Loading } from '../components/feedback'
import { Modal, ModalActions, useSave } from '../components/Modal'
import { useToast } from '../components/Toast'
import { Badge, PageHeading, SearchBox, SelectField } from '../components/ui'
import { byNewest, formatDate, matches, pointLabel, upsert } from '../lib/data'
import { useResource } from '../lib/useResource'

type AssignmentInput = Parameters<typeof createAssignment>[0]

function NewAssignment({ close, done }: { close: () => void; done: (assignment: WorkerAssignment) => void }) {
  const requests = useResource(listRequests)
  const assignments = useResource(listAssignments)
  const points = useResource(listPoints)
  const { busy, error, save, setError } = useSave()
  const [confirm, setConfirm] = useState<AssignmentInput>()
  const assignedRequests = new Set(assignments.data?.map((assignment) => assignment.collection_request_id))
  const eligible = (requests.data ?? []).filter((request) => request.status === 'pending' && !assignedRequests.has(request.id))

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const requestId = Number(fields.get('request'))
    const workerId = Number(fields.get('worker'))
    if (!eligible.some((request) => request.id === requestId)) {
      setError('Choose a pending request without an assignment.')
      return
    }
    if (!Number.isSafeInteger(workerId) || workerId <= 0) {
      setError('Enter a positive whole-number worker ID.')
      return
    }
    setError('')
    setConfirm({ collection_request_id: requestId, worker_id: workerId })
  }

  return <Modal title="New worker assignment" close={close} busy={busy}>
    <div className="modal-body">
      {(requests.status === 'loading' || assignments.status === 'loading') && <Loading label="Checking pending requests…" />}
      {requests.error && <ErrorNotice message={requests.error} retry={requests.retry} />}
      {assignments.error && <ErrorNotice message={assignments.error} retry={assignments.retry} />}
      {requests.status === 'ready' && assignments.status === 'ready' && (eligible.length
        ? <form className="form-stack" onSubmit={submit} hidden={!!confirm}>
          <div className="notice"><Info size={18} /><span>The API has no worker directory. Enter a known worker ID. Civora checks that the account is an active worker.</span></div>
          <SelectField label="Pending collection request" required name="request" defaultValue="">
            <option value="" disabled>Choose a pending request</option>
            {eligible.map((request) => <option key={request.id} value={request.id}>
              #{request.id} · {pointLabel(points.data, request.collection_point_id)}
            </option>)}
          </SelectField>
          <label>Worker ID<input required type="number" name="worker" min={1} step={1} inputMode="numeric" /></label>
          {error && !confirm && <ErrorNotice message={error} />}
          <ModalActions close={close} label="Review assignment" />
        </form>
        : <Empty title="No eligible requests">Create a collection request before assigning work.</Empty>)}
      {confirm && <div className="form-stack">
        <p className="confirmation" role="status">Assign worker #{confirm.worker_id} to collection request #{confirm.collection_request_id}?</p>
        {error && <ErrorNotice message={error} />}
        <ModalActions close={() => { setConfirm(undefined); setError('') }} busy={busy} label="Assign worker"
          submit={() => void save(() => createAssignment(confirm), done)} />
      </div>}
    </div>
  </Modal>
}

export function WorkerAssignments() {
  const assignments = useResource(listAssignments)
  const requests = useResource(listRequests)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const notify = useToast()
  const statusByRequest = new Map(requests.data?.map((request) => [request.id, request.status]))
  const rows = (assignments.data ?? []).filter((assignment) =>
    matches(query, `#${assignment.id}`, `Request #${assignment.collection_request_id}`, `Worker #${assignment.worker_id}`))
    .sort((a, b) => byNewest(a.assigned_at, b.assigned_at) || b.id - a.id)

  function done(assignment: WorkerAssignment) {
    if (assignments.status === 'ready') assignments.update((all) => upsert(all, assignment))
    else assignments.retry()
    requests.retry()
    notify('Worker assigned to the collection request.')
    setOpen(false)
  }

  return <>
    <PageHeading title="Worker assignments" description="Assign pending collection requests and review assigned work."
      action={<button className="button button-primary" type="button" onClick={() => setOpen(true)}><Plus size={18} />New assignment</button>} />
    {requests.error && <ErrorNotice message="Collection request statuses are currently unavailable." retry={requests.retry} />}
    <DataTable title="Worker assignments" rows={rows} {...assignments} filterKey={query}
      emptyTitle={assignments.data?.length ? 'No matching assignments' : 'No worker assignments yet'}
      emptyMessage={assignments.data?.length ? 'Try a different search.' : 'Assign a worker to a pending collection request.'}
      toolbar={<SearchBox value={query} change={setQuery} placeholder="Search assignments" />}
      columns={[
        { label: 'Assignment ID', cell: (assignment) => <strong>#{assignment.id}</strong> },
        { label: 'Collection request', cell: (assignment) => `Request #${assignment.collection_request_id}` },
        { label: 'Worker', cell: (assignment) => `Worker #${assignment.worker_id}` },
        { label: 'Assigned by', cell: (assignment) => `User #${assignment.assigned_by}` },
        { label: 'Request status', cell: (assignment) => {
          const status = statusByRequest.get(assignment.collection_request_id)
          return status ? <Badge value={status} /> : '—'
        } },
        { label: 'Assigned at', cell: (assignment) => formatDate(assignment.assigned_at) },
      ]} />
    {open && <NewAssignment close={() => setOpen(false)} done={done} />}
  </>
}
