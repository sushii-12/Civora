import { useState } from 'react'
import { listDeposits, listPoints } from '../api/endpoints'
import { DataTable } from '../components/DataTable'
import { Badge, choicesFor, Filter, PageHeading, SearchBox } from '../components/ui'
import { byNewest, formatDate, formatNumber, idMatches, matches, pointChoices, pointLabel } from '../lib/data'
import { useResource } from '../lib/useResource'

export function WasteDeposits() {
  const deposits = useResource(listDeposits)
  const points = useResource(listPoints)
  const [query, setQuery] = useState('')
  const [type, setType] = useState('')
  const [point, setPoint] = useState('')
  const [order, setOrder] = useState('recent')
  const rows = (deposits.data ?? []).filter((deposit) =>
    (!type || deposit.waste_type === type) && idMatches(deposit.collection_point_id, point) &&
    matches(query, `#${deposit.id}`, `Citizen #${deposit.user_id}`, deposit.user_id,
      pointLabel(points.data, deposit.collection_point_id), deposit.collection_point_id, deposit.waste_type))
    .sort((a, b) => {
      const recent = byNewest(a.deposited_at, b.deposited_at) || b.id - a.id
      if (order === 'oldest') return -recent
      if (order === 'quantity') return b.quantity - a.quantity || recent
      return recent
    })

  return <>
    <PageHeading title="Waste deposits" description="Browse disposal records declared by citizens." />
    <DataTable title="Waste deposits" rows={rows} {...deposits} filterKey={JSON.stringify([query, type, point, order])}
      emptyTitle={deposits.data?.length ? 'No matching deposits' : 'No waste deposits yet'}
      emptyMessage={deposits.data?.length ? 'Try a different search or filter.' : 'Citizen-declared disposal records will appear here.'}
      toolbar={<>
        <SearchBox value={query} change={setQuery} placeholder="Search deposits" />
        <Filter label="Waste type" value={type} onChange={setType} choices={choicesFor(['wet', 'dry'], 'All waste types')} />
        <Filter label="Collection point" value={point} onChange={setPoint}
          choices={pointChoices(points.data, (deposits.data ?? []).map((deposit) => deposit.collection_point_id))} />
        <Filter label="Sort deposits" value={order} onChange={setOrder} choices={[
          { value: 'recent', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'quantity', label: 'Highest quantity' },
        ]} />
      </>}
      columns={[
        { label: 'Deposit ID', cell: (deposit) => <strong>#{deposit.id}</strong> },
        { label: 'Citizen', cell: (deposit) => `Citizen #${deposit.user_id}` },
        { label: 'Collection point', cell: (deposit) => pointLabel(points.data, deposit.collection_point_id) },
        { label: 'Waste type', cell: (deposit) => <Badge value={deposit.waste_type} /> },
        { label: 'Quantity', cell: (deposit) => <strong>{formatNumber(deposit.quantity)} kg</strong> },
        { label: 'Recorded at', cell: (deposit) => formatDate(deposit.deposited_at) },
      ]} />
  </>
}
