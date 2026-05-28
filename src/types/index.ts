// ─── CLIMACORE TYPE SYSTEM ─────────────────────────────────────────────────────

export type Role = 'industry' | 'government' | 'citizen';

export type ComplianceStatus = 'COMPLIANT' | 'WARNING' | 'CRITICAL';

export type NoticeStatus = 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';

export type ReportStatus = 'GENERATED' | 'PROCESSING' | 'FAILED';

export type AlertType = 'CRITICAL' | 'WARNING' | 'INFO' | 'OK';

export type EscalationState = 'completed' | 'active' | 'pending';

export type Page = 'dashboard' | 'emissions' | 'compliance' | 'reports' | 'heatmap' | 'alerts' | 'civilian' | 'settings';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  facilityId?: string;
}

export interface Facility {
  id: string;
  name: string;
  sector: string;
  location: string;
  coordinates: [number, number];
  score: number;
  status: ComplianceStatus;
  violations: number;
  lastAudit: string;
  contactEmail: string;
  registrationNo: string;
}

export interface EmissionRecord {
  id: string;
  facilityId: string;
  facilityName: string;
  date: string;
  fuel: number;
  electricity: number;
  production: number;
  co2: number;
  nox: number;
  sox: number;
  pm25: number;
  status: ComplianceStatus;
}

export interface MonthlyEmission {
  month: string;
  co2: number;
  nox: number;
  sox: number;
  pm25: number;
}

export interface ComplianceThreshold {
  sectorType: string;
  co2Limit: number;
  noxLimit: number;
  soxLimit: number;
  pm25Limit: number;
}

export interface ComplianceNotice {
  id: string;
  facilityId: string;
  facilityName: string;
  type: 'WARNING' | 'VIOLATION' | 'CRITICAL';
  title: string;
  message: string;
  breachedParams: string[];
  deadline: string;
  issuedDate: string;
  status: NoticeStatus;
}

export interface Report {
  id: string;
  name: string;
  date: string;
  size: string;
  status: ReportStatus;
  type: string;
  facilityId?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  time: string;
  date: string;
  facility?: string;
  read: boolean;
}

export interface AQIReading {
  city: string;
  state: string;
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  so2: number;
  no2: number;
  co: number;
  o3: number;
  timestamp: string;
  coordinates: [number, number];
}

export interface EscalationStep {
  id: string;
  step: number;
  title: string;
  description: string;
  date: string;
  status: EscalationState;
  responsible: string;
}

export interface CivilianReport {
  id: string;
  reporterName: string;
  location: string;
  description: string;
  date: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED';
  category: string;
}

export interface SectorAverage {
  sector: string;
  avgCo2: number;
  avgNox: number;
  avgSox: number;
  facilityCount: number;
}

export interface WasteDocument {
  id: string;
  facilityId: string;
  fileName: string;
  uploadDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  type: string;
  size: string;
}

// ─── EMISSION FACTOR CONSTANTS (EPA/IPCC) ─────────────────────────────────────
export const EMISSION_FACTORS = {
  coal: { co2: 2.42, nox: 7.4, sox: 11.8 },       // per tonne
  naturalGas: { co2: 2.75, nox: 1.7, sox: 0.01 },  // per 1000 m³
  diesel: { co2: 2.68, nox: 10.3, sox: 3.6 },      // per kL
  electricity: { co2: 0.82, nox: 0.0, sox: 0.0 },  // per MWh (India grid)
} as const;
