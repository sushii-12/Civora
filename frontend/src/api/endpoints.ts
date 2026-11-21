import { api, publicApi } from './client'
import type {
  CollectionPoint, CollectionRequest, PointInput, PointPatch, Report,
  ReportPatch, Token, User, WasteDeposit, WorkerAssignment,
} from './types'

export const signIn = (email: string, password: string, signal?: AbortSignal) =>
  publicApi.post<Token>('/auth/login', { email, password }, { signal }).then(({ data }) => data)
export const getProfile = (signal?: AbortSignal, accessToken?: string) =>
  (accessToken ? publicApi : api).get<User>('/auth/me', {
    signal,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  }).then(({ data }) => data)

const points = '/collection-points/'
const deposits = '/waste-deposits/'
const requests = '/collection-requests/'
const assignments = '/worker-assignments/'
const reports = '/dumping-reports/'

export const listPoints = (signal?: AbortSignal) =>
  api.get<CollectionPoint[]>(points, { signal }).then(({ data }) => data)
export const getPoint = (id: number, signal?: AbortSignal) =>
  api.get<CollectionPoint>(points + id, { signal }).then(({ data }) => data)
export const createPoint = (body: PointInput) =>
  api.post<CollectionPoint>(points, body).then(({ data }) => data)
export const updatePoint = (id: number, body: PointPatch) =>
  api.patch<CollectionPoint>(points + id, body).then(({ data }) => data)

export const listDeposits = (signal?: AbortSignal) =>
  api.get<WasteDeposit[]>(deposits, { signal }).then(({ data }) => data)

export const listRequests = (signal?: AbortSignal) =>
  api.get<CollectionRequest[]>(requests, { signal }).then(({ data }) => data)
export const getRequest = (id: number, signal?: AbortSignal) =>
  api.get<CollectionRequest>(requests + id, { signal }).then(({ data }) => data)
export const createRequest = (body: { collection_point_id: number; notes: string | null }) =>
  api.post<CollectionRequest>(requests, body).then(({ data }) => data)
export const updateRequestNotes = (id: number, notes: string | null) =>
  api.patch<CollectionRequest>(requests + id, { notes }).then(({ data }) => data)

export const listAssignments = (signal?: AbortSignal) =>
  api.get<WorkerAssignment[]>(assignments, { signal }).then(({ data }) => data)
export const createAssignment = (body: { collection_request_id: number; worker_id: number }) =>
  api.post<WorkerAssignment>(assignments, body).then(({ data }) => data)

export const listReports = (signal?: AbortSignal) =>
  api.get<Report[]>(reports, { signal }).then(({ data }) => data)
export const getReport = (id: number, signal?: AbortSignal) =>
  api.get<Report>(reports + id, { signal }).then(({ data }) => data)
export const updateReport = (id: number, body: ReportPatch) =>
  api.patch<Report>(reports + id, body).then(({ data }) => data)
