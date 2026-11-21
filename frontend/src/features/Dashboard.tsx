import { ClipboardList, Flag, MapPin, PackageOpen, RefreshCw, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listAssignments, listDeposits, listPoints, listReports, listRequests } from '../api/endpoints'
import { DataTable } from '../components/DataTable'
import { Empty, ErrorNotice, Loading } from '../components/feedback'
import { Badge, PageHeading } from '../components/ui'
import { byNewest, collectionStatuses, formatDate, formatNumber, humanize, isActiveAssignment, pointLabel } from '../lib/data'
import { useResource } from '../lib/useResource'

function Metric({ icon: Icon, title, value, to, loading, note }: {
  icon: LucideIcon; title: string; value?: number; to: string; loading: boolean; note?: string
}) {
  return <Link to={to} className="surface metric">
    <span className="metric-icon"><Icon size={19} /></span>
    <span className="metric-label">{title}</span>
    <strong className="metric-value">{loading
      ? <span className="metric-placeholder"><span className="sr-only">Loading</span></span>
      : value === undefined ? <span className="metric-unavailable">Unavailable</span> : formatNumber(value)}</strong>
    {note && <span className="metric-note">{note}</span>}
  </Link>
}

const depositColors = ['#637545', '#9BA685']
const requestColors = ['#9BA685', '#637545', '#455230', '#CCD4B9']

export function Dashboard() {
  const points = useResource(listPoints)
  const deposits = useResource(listDeposits)
  const requests = useResource(listRequests)
  const assignments = useResource(listAssignments)
  const reports = useResource(listReports)

  const activitySources = [
    { name: 'waste deposits', ...deposits },
    { name: 'collection requests', ...requests },
    { name: 'citizen reports', ...reports },
  ]
  const sources = [
    { name: 'collection points', ...points },
    { name: 'worker assignments', ...assignments },
    ...activitySources,
  ]
  const failed = sources.filter((source) => source.status === 'error')
  const loading = sources.some((source) => source.status === 'loading')
  const statusByRequest = new Map(requests.data?.map((request) => [request.id, request.status]))
  const missingRequestStatus = !!(requests.data && assignments.data?.some(
    (assignment) => !statusByRequest.has(assignment.collection_request_id),
  ))
  const activeAssignments = requests.data && assignments.data && !missingRequestStatus
    ? assignments.data.filter((assignment) => isActiveAssignment(statusByRequest.get(assignment.collection_request_id))).length
    : undefined
  const depositMix = ['wet', 'dry'].map((type, index) => ({
    name: humanize(type),
    count: deposits.data?.filter((deposit) => deposit.waste_type === type).length ?? 0,
    color: depositColors[index],
  }))
  const requestMix = collectionStatuses.map((status, index) => ({
    name: humanize(status),
    count: requests.data?.filter((request) => request.status === status).length ?? 0,
    color: requestColors[index],
  }))

  const activityLoading = activitySources.some((source) => source.status === 'loading')
  const failedActivitySources = activitySources.filter((source) => source.status === 'error')
  const activityError = failedActivitySources.length === activitySources.length
  const activityIncomplete = !activityLoading && !activityError && failedActivitySources.length > 0
  const activity = [
    ...(deposits.data ?? []).map((deposit) => ({
      key: `deposit-${deposit.id}`, label: 'Waste deposit', record: deposit.id, to: '/waste-deposits',
      point: deposit.collection_point_id, type: deposit.waste_type, date: deposit.deposited_at, icon: PackageOpen,
    })),
    ...(requests.data ?? []).map((request) => ({
      key: `request-${request.id}`, label: 'Collection request', record: request.id, to: '/collection-requests',
      point: request.collection_point_id, type: request.status, date: request.requested_at, icon: ClipboardList,
    })),
    ...(reports.data ?? []).map((report) => ({
      key: `report-${report.id}`, label: 'Citizen report', record: report.id, to: '/reports',
      point: report.collection_point_id, type: report.status, date: report.reported_at, icon: Flag,
    })),
  ].sort((a, b) => byNewest(a.date, b.date)).slice(0, 6).map((event, id) => ({ ...event, id }))
  const reload = () => sources.forEach((source) => source.retry())
  const series = (items: typeof depositMix) => items.map(({ name, count, color }) =>
    <li key={name}><i style={{ background: color }} aria-hidden="true" /><span>{name}</span><strong>{formatNumber(count)}</strong></li>)

  return <>
    <PageHeading title="Dashboard overview" description="Monitor waste operations and the work awaiting attention."
      action={<button className="button button-secondary" type="button" disabled={loading} onClick={reload}>
        <RefreshCw size={16} className={loading ? 'spin' : undefined} />Refresh data
      </button>} />
    {failed.length > 0 && <ErrorNotice message={`Unable to load ${failed.map(({ name }) => name).join(', ')}.`}
      retry={() => failed.forEach((source) => source.retry())} />}
    <section aria-label="Waste operations summary" className="metrics">
      <Metric icon={MapPin} title="Collection points" value={points.data?.length} to="/collection-points" loading={points.status === 'loading'} />
      <Metric icon={PackageOpen} title="Waste deposits" value={deposits.data?.length} to="/waste-deposits" loading={deposits.status === 'loading'} />
      <Metric icon={ClipboardList} title="Pending requests" value={requests.data?.filter(({ status }) => status === 'pending').length}
        to="/collection-requests" loading={requests.status === 'loading'} />
      <Metric icon={UsersRound} title="Active assignments" value={activeAssignments} to="/worker-assignments"
        loading={assignments.status === 'loading' || requests.status === 'loading'}
        note={missingRequestStatus ? 'Some assignments are missing request statuses.' : undefined} />
      <Metric icon={Flag} title="Pending reports" value={reports.data?.filter(({ status }) => status === 'pending').length}
        to="/reports" loading={reports.status === 'loading'} />
    </section>
    <div className="chart-grid">
      <section className="surface chart-card" aria-labelledby="deposit-chart">
        <header className="section-header"><h2 id="deposit-chart">Waste deposits by type</h2><p>Citizen-declared records</p></header>
        {deposits.status === 'loading' && <Loading label="Loading deposits…" />}
        {deposits.error && <ErrorNotice message={deposits.error} retry={deposits.retry} />}
        {deposits.data && (deposits.data.length ? <>
          <div className="bar-area">
            <ResponsiveContainer width="100%" height={164}>
              <BarChart data={depositMix} margin={{ top: 8, right: 3, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke="#e7e8de" strokeDasharray="3 4" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#555d49', fontSize: 13 }} dy={3} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#555d49', fontSize: 12 }} width={35} tickCount={5} />
                <Tooltip cursor={{ fill: '#eeefe5' }} formatter={(value) => [value, 'Deposits']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={66} isAnimationActive={false}>
                  {depositMix.map(({ name, color }) => <Cell key={name} fill={color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="chart-legend deposit-legend" aria-label="Deposits by type">{series(depositMix)}</ul>
        </> : <Empty title="No deposits recorded">The waste-type breakdown will appear here.</Empty>)}
      </section>
      <section className="surface chart-card" aria-labelledby="request-chart">
        <header className="section-header"><h2 id="request-chart">Collection request status</h2><p>Distribution by current status</p></header>
        {requests.status === 'loading' && <Loading label="Loading collection requests…" />}
        {requests.error && <ErrorNotice message={requests.error} retry={requests.retry} />}
        {requests.data && (requests.data.length ? <div className="pie-layout">
          <div className="pie-area">
            <ResponsiveContainer width="100%" height={188}>
              <PieChart>
                <Pie data={requestMix.filter(({ count }) => count > 0)} dataKey="count" nameKey="name"
                  innerRadius="67%" outerRadius="94%" stroke="none" paddingAngle={2} startAngle={90} endAngle={-270} isAnimationActive={false}>
                  {requestMix.filter(({ count }) => count > 0).map(({ name, color }) => <Cell key={name} fill={color} />)}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Requests']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pie-total" aria-hidden="true"><strong>{formatNumber(requests.data.length)}</strong><span>Total requests</span></div>
          </div>
          <ul className="chart-legend" aria-label="Requests by status">{series(requestMix)}</ul>
        </div> : <Empty title="No collection requests">Request statuses will appear here as work is recorded.</Empty>)}
      </section>
    </div>
    <section aria-labelledby="recent-activity" className="activity">
      <div className="section-header"><h2 id="recent-activity">Recent activity</h2>
        <p>{activityIncomplete ? 'Latest activity from available sources' : 'Latest deposits, collection requests, and citizen reports'}</p>
      </div>
      {activityIncomplete && <div className="notice activity-notice" role="status">
        Activity is incomplete. Could not load {failedActivitySources.map(({ name }) => name).join(', ')}.
      </div>}
      {points.status === 'error' && activity.some((event) => event.point !== null) &&
        <p className="activity-notice field-help">Collection point names are unavailable. Showing point IDs.</p>}
      <DataTable title="Recent activity" rows={activity}
        status={activityLoading ? 'loading' : activityError ? 'error' : 'ready'}
        error="Activity is currently unavailable." retry={() => failedActivitySources.forEach((source) => source.retry())}
        emptyTitle={activityIncomplete ? 'No activity in available records' : 'No recent activity'}
        emptyMessage={activityIncomplete ? 'Retry the missing sources to check for activity.' : 'New deposits, requests, and reports will appear here.'}
        columns={[
          { label: 'Activity', cell: (event) => <Link to={event.to} className="activity-link"><span><event.icon size={16} /></span>{event.label} #{event.record}</Link> },
          { label: 'Collection point', cell: (event) => pointLabel(points.data, event.point) },
          { label: 'Status or type', cell: (event) => <Badge value={event.type} /> },
          { label: 'Recorded at', cell: (event) => formatDate(event.date) },
        ]} />
    </section>
  </>
}
