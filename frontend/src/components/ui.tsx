import { ChevronDown, Recycle, Search } from 'lucide-react'
import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { humanize } from '../lib/data'

export function Brand() {
  return <div className="brand"><span className="brand-icon"><Recycle size={24} strokeWidth={1.9} /></span><strong>Civora</strong></div>
}

export function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading">
    <div><h1>{title}</h1><p>{description}</p></div>
    {action}
  </div>
}

export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{humanize(value)}</span>
}

export function Select({ children, className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className={`select-wrap ${className}`}>
    <select {...props}>{children}</select>
    <ChevronDown aria-hidden="true" size={16} />
  </span>
}

export function SelectField({ label, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId()
  return <div className="select-field">
    <label htmlFor={id}>{label}</label>
    <Select {...props} id={id} />
  </div>
}

export function Filter({
  label, value, onChange, choices,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  choices: { value: string; label: string }[]
}) {
  return <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
    {choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
  </Select>
}

export const choicesFor = (values: readonly string[], allLabel: string) => [
  { value: '', label: allLabel },
  ...values.map((value) => ({ value, label: humanize(value) })),
]

export function SearchBox({ value, change, placeholder }: {
  value: string; change: (value: string) => void; placeholder: string
}) {
  return <label className="search">
    <Search size={17} aria-hidden="true" />
    <input type="search" aria-label={placeholder} placeholder={placeholder} value={value}
      onChange={(event) => change(event.target.value)} />
  </label>
}

export function Details({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="details">
    {items.map(({ label, value }) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl>
}

export function FillMeter({ fill, capacity }: { fill: number; capacity: number }) {
  const percent = fill / capacity * 100
  const id = useId()
  return <div className="fill-meter">
    <meter aria-labelledby={id} value={percent} min={0} max={100} low={0} high={85} optimum={0} />
    <span id={id}>{Math.round(percent)}% full</span>
  </div>
}
