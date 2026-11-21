export type WasteType = 'wet' | 'dry' | 'mixed'
export type CollectionStatus = 'pending' | 'assigned' | 'in_progress' | 'completed'
export type ReportType = 'improper_dumping' | 'waste_not_collected'
export type ReportStatus = 'pending' | 'under_review' | 'assigned' | 'resolved' | 'rejected'

export interface User {
  id: number
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
}

export interface PointInput {
  name: string
  address: string
  waste_type: WasteType
  capacity: number
  current_fill_level: number
}

export interface CollectionPoint extends PointInput {
  id: number
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
}

export type PointPatch = Partial<PointInput & Pick<CollectionPoint, 'is_active'>>

export interface WasteDeposit {
  id: number
  user_id: number
  collection_point_id: number
  waste_type: Exclude<WasteType, 'mixed'>
  quantity: number
  deposited_at: string
}

export interface CollectionRequest {
  id: number
  collection_point_id: number
  requested_by: number
  status: CollectionStatus
  notes: string | null
  requested_at: string
  completed_at: string | null
}

export interface WorkerAssignment {
  id: number
  collection_request_id: number
  worker_id: number
  assigned_by: number
  assigned_at: string
}

export interface Report {
  id: number
  reported_by: number
  report_type: ReportType
  collection_point_id: number | null
  collection_request_id: number | null
  description: string
  image_path: string | null
  status: ReportStatus
  reported_at: string
  resolved_at: string | null
}

export interface ReportPatch {
  status: ReportStatus
  collection_request_id?: number | null
}
