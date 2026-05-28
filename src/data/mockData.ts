// ─── CLIMACORE MOCK DATA ───────────────────────────────────────────────────────
import type {
  Facility,
  EmissionRecord,
  MonthlyEmission,
  ComplianceThreshold,
  ComplianceNotice,
  Report,
  Alert,
  AQIReading,
  EscalationStep,
  CivilianReport,
  SectorAverage,
  WasteDocument,
} from '../types';

// ─── 1. FACILITIES ─────────────────────────────────────────────────────────────
export const FACILITIES: Facility[] = [
  {
    id: 'FAC-001',
    name: 'Tata Steel Jamshedpur',
    sector: 'Steel',
    location: 'Jamshedpur, Jharkhand',
    coordinates: [22.7996, 86.2029],
    score: 92,
    status: 'COMPLIANT',
    violations: 0,
    lastAudit: '2026-03-15',
    contactEmail: 'env.compliance@tatasteel.com',
    registrationNo: 'CPCB/JH/STL/2024-0091',
  },
  {
    id: 'FAC-002',
    name: 'Reliance Petrochemicals Jamnagar',
    sector: 'Chemical',
    location: 'Jamnagar, Gujarat',
    coordinates: [22.4707, 70.0577],
    score: 45,
    status: 'CRITICAL',
    violations: 7,
    lastAudit: '2026-01-22',
    contactEmail: 'hse@reliancepetrochem.in',
    registrationNo: 'CPCB/GJ/CHM/2023-0547',
  },
  {
    id: 'FAC-003',
    name: 'NTPC Singrauli',
    sector: 'Power',
    location: 'Singrauli, Madhya Pradesh',
    coordinates: [24.0797, 82.6574],
    score: 78,
    status: 'WARNING',
    violations: 2,
    lastAudit: '2026-02-10',
    contactEmail: 'environment@ntpc.co.in',
    registrationNo: 'CPCB/MP/PWR/2024-0312',
  },
  {
    id: 'FAC-004',
    name: 'Hindalco Renukoot',
    sector: 'Aluminium',
    location: 'Renukoot, Uttar Pradesh',
    coordinates: [24.2167, 83.0333],
    score: 88,
    status: 'COMPLIANT',
    violations: 0,
    lastAudit: '2026-04-01',
    contactEmail: 'enviro@hindalco.com',
    registrationNo: 'CPCB/UP/ALU/2024-0188',
  },
  {
    id: 'FAC-005',
    name: 'JSW Steel Bellary',
    sector: 'Steel',
    location: 'Bellary, Karnataka',
    coordinates: [15.1394, 76.9214],
    score: 65,
    status: 'WARNING',
    violations: 3,
    lastAudit: '2026-03-28',
    contactEmail: 'ehs@jsw.in',
    registrationNo: 'CPCB/KA/STL/2024-0276',
  },
  {
    id: 'FAC-006',
    name: 'Vedanta Tuticorin',
    sector: 'Smelting',
    location: 'Tuticorin, Tamil Nadu',
    coordinates: [8.7642, 78.1348],
    score: 38,
    status: 'CRITICAL',
    violations: 11,
    lastAudit: '2025-11-05',
    contactEmail: 'compliance@vedanta.co.in',
    registrationNo: 'CPCB/TN/SMT/2023-0933',
  },
  {
    id: 'FAC-007',
    name: 'Grasim Nagda',
    sector: 'Textile',
    location: 'Nagda, Madhya Pradesh',
    coordinates: [23.4577, 75.4155],
    score: 91,
    status: 'COMPLIANT',
    violations: 0,
    lastAudit: '2026-04-12',
    contactEmail: 'env@grasim.com',
    registrationNo: 'CPCB/MP/TXT/2024-0415',
  },
  {
    id: 'FAC-008',
    name: 'Adani Power Mundra',
    sector: 'Power',
    location: 'Mundra, Gujarat',
    coordinates: [22.8394, 69.719],
    score: 72,
    status: 'WARNING',
    violations: 4,
    lastAudit: '2026-02-28',
    contactEmail: 'env.mundra@adani.com',
    registrationNo: 'CPCB/GJ/PWR/2024-0604',
  },
];

// ─── 2. EMISSION HISTORY ───────────────────────────────────────────────────────
export const EMISSION_HISTORY: EmissionRecord[] = [
  { id: 'EM-001', facilityId: 'FAC-001', facilityName: 'Tata Steel Jamshedpur', date: '2026-05-01', fuel: 420, electricity: 310, production: 1850, co2: 238.4, nox: 42.1, sox: 11.3, pm25: 8.7, status: 'COMPLIANT' },
  { id: 'EM-002', facilityId: 'FAC-001', facilityName: 'Tata Steel Jamshedpur', date: '2026-04-01', fuel: 435, electricity: 325, production: 1920, co2: 245.1, nox: 44.6, sox: 12.0, pm25: 9.2, status: 'COMPLIANT' },
  { id: 'EM-003', facilityId: 'FAC-002', facilityName: 'Reliance Petrochemicals Jamnagar', date: '2026-05-01', fuel: 510, electricity: 290, production: 1400, co2: 268.3, nox: 51.8, sox: 16.4, pm25: 13.5, status: 'CRITICAL' },
  { id: 'EM-004', facilityId: 'FAC-002', facilityName: 'Reliance Petrochemicals Jamnagar', date: '2026-04-01', fuel: 490, electricity: 275, production: 1350, co2: 255.7, nox: 48.9, sox: 15.1, pm25: 12.8, status: 'CRITICAL' },
  { id: 'EM-005', facilityId: 'FAC-003', facilityName: 'NTPC Singrauli', date: '2026-05-01', fuel: 600, electricity: 180, production: 2200, co2: 272.5, nox: 52.3, sox: 16.8, pm25: 13.1, status: 'WARNING' },
  { id: 'EM-006', facilityId: 'FAC-003', facilityName: 'NTPC Singrauli', date: '2026-04-01', fuel: 580, electricity: 175, production: 2150, co2: 265.0, nox: 49.7, sox: 15.5, pm25: 12.4, status: 'WARNING' },
  { id: 'EM-007', facilityId: 'FAC-004', facilityName: 'Hindalco Renukoot', date: '2026-05-01', fuel: 380, electricity: 420, production: 1600, co2: 232.6, nox: 40.2, sox: 10.8, pm25: 8.1, status: 'COMPLIANT' },
  { id: 'EM-008', facilityId: 'FAC-004', facilityName: 'Hindalco Renukoot', date: '2026-04-01', fuel: 370, electricity: 410, production: 1580, co2: 228.9, nox: 38.7, sox: 10.2, pm25: 7.6, status: 'COMPLIANT' },
  { id: 'EM-009', facilityId: 'FAC-005', facilityName: 'JSW Steel Bellary', date: '2026-05-01', fuel: 460, electricity: 340, production: 1750, co2: 258.2, nox: 49.8, sox: 14.7, pm25: 11.9, status: 'WARNING' },
  { id: 'EM-010', facilityId: 'FAC-005', facilityName: 'JSW Steel Bellary', date: '2026-04-01', fuel: 470, electricity: 350, production: 1780, co2: 262.4, nox: 51.2, sox: 15.3, pm25: 12.5, status: 'CRITICAL' },
  { id: 'EM-011', facilityId: 'FAC-006', facilityName: 'Vedanta Tuticorin', date: '2026-05-01', fuel: 530, electricity: 260, production: 1100, co2: 285.1, nox: 54.6, sox: 17.9, pm25: 14.8, status: 'CRITICAL' },
  { id: 'EM-012', facilityId: 'FAC-006', facilityName: 'Vedanta Tuticorin', date: '2026-04-01', fuel: 540, electricity: 270, production: 1120, co2: 291.3, nox: 55.1, sox: 18.2, pm25: 15.1, status: 'CRITICAL' },
  { id: 'EM-013', facilityId: 'FAC-007', facilityName: 'Grasim Nagda', date: '2026-05-01', fuel: 280, electricity: 220, production: 950, co2: 168.4, nox: 30.5, sox: 8.1, pm25: 5.9, status: 'COMPLIANT' },
  { id: 'EM-014', facilityId: 'FAC-007', facilityName: 'Grasim Nagda', date: '2026-04-01', fuel: 275, electricity: 215, production: 940, co2: 165.2, nox: 29.8, sox: 7.8, pm25: 5.5, status: 'COMPLIANT' },
  { id: 'EM-015', facilityId: 'FAC-008', facilityName: 'Adani Power Mundra', date: '2026-05-01', fuel: 570, electricity: 195, production: 2050, co2: 270.8, nox: 51.4, sox: 16.2, pm25: 12.9, status: 'WARNING' },
  { id: 'EM-016', facilityId: 'FAC-008', facilityName: 'Adani Power Mundra', date: '2026-04-01', fuel: 555, electricity: 190, production: 2000, co2: 264.3, nox: 49.1, sox: 15.0, pm25: 12.0, status: 'WARNING' },
  { id: 'EM-017', facilityId: 'FAC-001', facilityName: 'Tata Steel Jamshedpur', date: '2026-03-01', fuel: 440, electricity: 330, production: 1900, co2: 248.7, nox: 45.3, sox: 12.4, pm25: 9.5, status: 'COMPLIANT' },
  { id: 'EM-018', facilityId: 'FAC-006', facilityName: 'Vedanta Tuticorin', date: '2026-03-01', fuel: 550, electricity: 280, production: 1080, co2: 296.8, nox: 54.9, sox: 18.5, pm25: 15.4, status: 'CRITICAL' },
];

// ─── 3. MONTHLY TRENDS ─────────────────────────────────────────────────────────
export const MONTHLY_TRENDS: MonthlyEmission[] = [
  { month: 'JAN', co2: 242.5, nox: 43.2, sox: 12.1, pm25: 9.8 },
  { month: 'FEB', co2: 238.1, nox: 42.0, sox: 11.8, pm25: 9.4 },
  { month: 'MAR', co2: 245.8, nox: 44.1, sox: 12.5, pm25: 10.1 },
  { month: 'APR', co2: 251.3, nox: 45.8, sox: 13.2, pm25: 10.7 },
  { month: 'MAY', co2: 268.9, nox: 49.4, sox: 14.8, pm25: 12.3 },
  { month: 'JUN', co2: 274.2, nox: 50.6, sox: 15.4, pm25: 12.9 },
  { month: 'JUL', co2: 262.1, nox: 47.8, sox: 14.1, pm25: 11.6 },
  { month: 'AUG', co2: 255.6, nox: 46.2, sox: 13.5, pm25: 11.0 },
  { month: 'SEP', co2: 248.3, nox: 44.5, sox: 12.8, pm25: 10.3 },
  { month: 'OCT', co2: 256.7, nox: 46.9, sox: 13.7, pm25: 11.2 },
  { month: 'NOV', co2: 271.4, nox: 50.1, sox: 15.1, pm25: 12.7 },
  { month: 'DEC', co2: 278.5, nox: 51.8, sox: 15.9, pm25: 13.4 },
];

// ─── 4. COMPLIANCE THRESHOLDS ──────────────────────────────────────────────────
export const COMPLIANCE_THRESHOLDS: ComplianceThreshold[] = [
  { sectorType: 'Steel', co2Limit: 260, noxLimit: 50, soxLimit: 15, pm25Limit: 12 },
  { sectorType: 'Chemical', co2Limit: 220, noxLimit: 40, soxLimit: 12, pm25Limit: 10 },
  { sectorType: 'Power', co2Limit: 280, noxLimit: 55, soxLimit: 18, pm25Limit: 14 },
  { sectorType: 'Textile', co2Limit: 180, noxLimit: 35, soxLimit: 10, pm25Limit: 8 },
  { sectorType: 'Aluminium', co2Limit: 250, noxLimit: 48, soxLimit: 14, pm25Limit: 11 },
  { sectorType: 'Smelting', co2Limit: 240, noxLimit: 45, soxLimit: 13, pm25Limit: 10 },
];

// ─── 5. COMPLIANCE NOTICES ─────────────────────────────────────────────────────
export const COMPLIANCE_NOTICES: ComplianceNotice[] = [
  {
    id: 'CN-001',
    facilityId: 'FAC-002',
    facilityName: 'Reliance Petrochemicals Jamnagar',
    type: 'CRITICAL',
    title: 'Excess CO₂ & PM2.5 Emissions',
    message: 'Facility has exceeded permissible CO₂ limits by 22% and PM2.5 by 35% for three consecutive months. Immediate corrective action required under Section 21 of Air (Prevention and Control of Pollution) Act.',
    breachedParams: ['CO₂', 'PM2.5', 'SOx'],
    deadline: '2026-06-15',
    issuedDate: '2026-05-10',
    status: 'PENDING',
  },
  {
    id: 'CN-002',
    facilityId: 'FAC-006',
    facilityName: 'Vedanta Tuticorin',
    type: 'CRITICAL',
    title: 'Multiple Parameter Breach — Enforcement Warning',
    message: 'All four monitored parameters exceeded thresholds. TNPCB has been notified. Failure to remediate within 30 days will trigger facility closure under Environment Protection Act, 1986.',
    breachedParams: ['CO₂', 'NOx', 'SOx', 'PM2.5'],
    deadline: '2026-06-05',
    issuedDate: '2026-05-05',
    status: 'ACKNOWLEDGED',
  },
  {
    id: 'CN-003',
    facilityId: 'FAC-005',
    facilityName: 'JSW Steel Bellary',
    type: 'WARNING',
    title: 'NOx and PM2.5 Threshold Approach',
    message: 'NOx levels at 99.6% of permissible limit and PM2.5 at 104% for April 2026. Advisory issued for voluntary reduction.',
    breachedParams: ['NOx', 'PM2.5'],
    deadline: '2026-07-01',
    issuedDate: '2026-05-12',
    status: 'PENDING',
  },
  {
    id: 'CN-004',
    facilityId: 'FAC-008',
    facilityName: 'Adani Power Mundra',
    type: 'WARNING',
    title: 'SOx Exceedance Detected',
    message: 'SOx emissions detected at 16.2 kg vs. threshold of 18 kg — within 10% of maximum. Recommended installation of additional FGD units.',
    breachedParams: ['SOx'],
    deadline: '2026-07-15',
    issuedDate: '2026-05-14',
    status: 'PENDING',
  },
  {
    id: 'CN-005',
    facilityId: 'FAC-003',
    facilityName: 'NTPC Singrauli',
    type: 'VIOLATION',
    title: 'Repeated NOx Limit Exceedance',
    message: 'NOx recorded at 52.3 kg against limit of 55 kg for Power sector. Two consecutive months of >95% utilization detected — formal violation logged.',
    breachedParams: ['NOx'],
    deadline: '2026-06-30',
    issuedDate: '2026-05-08',
    status: 'RESOLVED',
  },
];

// ─── 6. REPORTS ────────────────────────────────────────────────────────────────
export const REPORTS: Report[] = [
  { id: 'RPT-001', name: 'Monthly Emission Summary — May 2026', date: '2026-05-20', size: '2.4 MB', status: 'GENERATED', type: 'Emission Summary', facilityId: 'FAC-001' },
  { id: 'RPT-002', name: 'Compliance Audit Report — Q1 2026', date: '2026-04-05', size: '5.1 MB', status: 'GENERATED', type: 'Audit Report' },
  { id: 'RPT-003', name: 'AQI Impact Assessment — NCR Region', date: '2026-05-18', size: '3.8 MB', status: 'PROCESSING', type: 'Impact Assessment' },
  { id: 'RPT-004', name: 'Vedanta Tuticorin — Enforcement Dossier', date: '2026-05-12', size: '8.2 MB', status: 'GENERATED', type: 'Enforcement', facilityId: 'FAC-006' },
  { id: 'RPT-005', name: 'Sector Benchmark Analysis — 2025-26', date: '2026-05-01', size: '4.6 MB', status: 'GENERATED', type: 'Benchmark Analysis' },
  { id: 'RPT-006', name: 'Waste Disposal Compliance — Jamnagar', date: '2026-05-22', size: '1.9 MB', status: 'FAILED', type: 'Waste Compliance', facilityId: 'FAC-002' },
];

// ─── 7. ALERTS ─────────────────────────────────────────────────────────────────
export const ALERTS: Alert[] = [
  { id: 'ALT-001', type: 'CRITICAL', message: 'Vedanta Tuticorin PM2.5 exceeded 150% of threshold — immediate shutdown advisory issued.', time: '14:32', date: '2026-05-26', facility: 'Vedanta Tuticorin', read: false },
  { id: 'ALT-002', type: 'CRITICAL', message: 'Reliance Jamnagar CO₂ breach — 3rd consecutive month above limits.', time: '11:15', date: '2026-05-26', facility: 'Reliance Petrochemicals Jamnagar', read: false },
  { id: 'ALT-003', type: 'WARNING', message: 'JSW Bellary NOx levels approaching critical threshold (99.6% utilization).', time: '09:48', date: '2026-05-26', facility: 'JSW Steel Bellary', read: false },
  { id: 'ALT-004', type: 'WARNING', message: 'NTPC Singrauli coal consumption up 8% MoM — projected emission overshoot in June.', time: '16:05', date: '2026-05-25', facility: 'NTPC Singrauli', read: true },
  { id: 'ALT-005', type: 'INFO', message: 'Tata Steel Jamshedpur submitted monthly compliance report ahead of schedule.', time: '10:22', date: '2026-05-25', facility: 'Tata Steel Jamshedpur', read: true },
  { id: 'ALT-006', type: 'OK', message: 'Grasim Nagda achieved 100% compliance for 6 consecutive months — green certification eligible.', time: '08:30', date: '2026-05-24', facility: 'Grasim Nagda', read: true },
  { id: 'ALT-007', type: 'WARNING', message: 'Adani Mundra FGD unit maintenance overdue — SOx readings trending upward.', time: '13:10', date: '2026-05-24', facility: 'Adani Power Mundra', read: true },
  { id: 'ALT-008', type: 'INFO', message: 'System-wide sensor calibration completed. All CEMS devices reporting nominal accuracy.', time: '07:00', date: '2026-05-23', read: true },
];

// ─── 8. AQI DATA (CPCB CITIES) ────────────────────────────────────────────────
export const AQI_DATA: AQIReading[] = [
  { city: 'Delhi', state: 'Delhi', aqi: 285, category: 'Very Poor', pm25: 148.3, pm10: 265.7, so2: 18.4, no2: 52.1, co: 2.8, o3: 34.6, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [28.6139, 77.209] },
  { city: 'Mumbai', state: 'Maharashtra', aqi: 142, category: 'Moderate', pm25: 62.4, pm10: 118.2, so2: 12.1, no2: 38.5, co: 1.4, o3: 42.3, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [19.076, 72.8777] },
  { city: 'Kolkata', state: 'West Bengal', aqi: 198, category: 'Poor', pm25: 98.7, pm10: 178.4, so2: 15.8, no2: 46.2, co: 2.1, o3: 38.9, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [22.5726, 88.3639] },
  { city: 'Chennai', state: 'Tamil Nadu', aqi: 95, category: 'Satisfactory', pm25: 38.2, pm10: 82.6, so2: 8.4, no2: 28.1, co: 0.9, o3: 48.5, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [13.0827, 80.2707] },
  { city: 'Bangalore', state: 'Karnataka', aqi: 78, category: 'Satisfactory', pm25: 28.9, pm10: 65.3, so2: 6.2, no2: 22.4, co: 0.7, o3: 52.1, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [12.9716, 77.5946] },
  { city: 'Hyderabad', state: 'Telangana', aqi: 112, category: 'Moderate', pm25: 48.1, pm10: 95.8, so2: 10.3, no2: 32.6, co: 1.1, o3: 44.7, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [17.385, 78.4867] },
  { city: 'Lucknow', state: 'Uttar Pradesh', aqi: 225, category: 'Poor', pm25: 112.5, pm10: 198.3, so2: 16.9, no2: 48.7, co: 2.4, o3: 36.2, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [26.8467, 80.9462] },
  { city: 'Ahmedabad', state: 'Gujarat', aqi: 165, category: 'Moderate', pm25: 74.8, pm10: 142.1, so2: 13.5, no2: 41.3, co: 1.6, o3: 40.8, timestamp: '2026-05-26T14:00:00+05:30', coordinates: [23.0225, 72.5714] },
];

// ─── 9. ESCALATION TIMELINE ───────────────────────────────────────────────────
export const ESCALATION_TIMELINE: EscalationStep[] = [
  { id: 'ESC-001', step: 1, title: 'First Warning Issued', description: 'Initial warning letter sent to facility management citing emission threshold breaches for CO₂ and PM2.5. 30-day remediation window granted.', date: '2026-02-15', status: 'completed', responsible: 'SPCB Regional Office' },
  { id: 'ESC-002', step: 2, title: 'Formal Show-Cause Notice', description: 'Show-cause notice served under Section 31A of Air Act after failure to submit remediation plan. Facility required to respond within 15 days.', date: '2026-03-20', status: 'completed', responsible: 'CPCB Delhi' },
  { id: 'ESC-003', step: 3, title: 'Government Authority Alert', description: 'District Collector and MoEFCC notified. Case escalated to National Green Tribunal monitoring. Media advisory prepared.', date: '2026-04-10', status: 'completed', responsible: 'MoEFCC / NGT' },
  { id: 'ESC-004', step: 4, title: 'Surprise Audit Scheduled', description: 'Third-party environmental audit ordered. CEMS data to be cross-verified with manual stack sampling. Audit team dispatched.', date: '2026-05-25', status: 'active', responsible: 'CPCB Audit Division' },
  { id: 'ESC-005', step: 5, title: 'Enforcement Action', description: 'Potential outcomes: operations suspension, monetary penalty up to ₹15 Cr, or closure order. Final decision pending audit results.', date: '2026-06-15', status: 'pending', responsible: 'NGT / High Court' },
];

// ─── 10. CIVILIAN REPORTS ──────────────────────────────────────────────────────
export const CIVILIAN_REPORTS: CivilianReport[] = [
  { id: 'CIV-001', reporterName: 'Anand Sharma', location: 'Tuticorin, Tamil Nadu', description: 'Thick black smoke visible from the Vedanta smelter stacks since early morning. Strong sulphur smell affecting our colony. Multiple residents report breathing difficulty.', date: '2026-05-24', status: 'UNDER_REVIEW', category: 'Air Pollution' },
  { id: 'CIV-002', reporterName: 'Priya Mehta', location: 'Jamnagar, Gujarat', description: 'Chemical odour from Reliance plant permeating residential areas at night. Two children in our neighbourhood hospitalized with respiratory issues last week.', date: '2026-05-22', status: 'SUBMITTED', category: 'Chemical Emission' },
  { id: 'CIV-003', reporterName: 'Rajesh Kumar', location: 'Singrauli, Madhya Pradesh', description: 'Fly ash from NTPC settling on farmlands. Crop yield reduced by estimated 30% this season. Water in open wells has turned grey.', date: '2026-05-20', status: 'UNDER_REVIEW', category: 'Particulate Pollution' },
  { id: 'CIV-004', reporterName: 'Fatima Begum', location: 'Bellary, Karnataka', description: 'Red dust from JSW Steel plant covering vehicles and rooftops daily. Visibility drops significantly during afternoon shifts. School children affected.', date: '2026-05-18', status: 'RESOLVED', category: 'Dust Pollution' },
  { id: 'CIV-005', reporterName: 'Suresh Nair', location: 'Mundra, Gujarat', description: 'Abnormal fish die-off in creek near Adani Power cooling water discharge. Local fishermen report warm water and oily sheen on surface since last month.', date: '2026-05-15', status: 'SUBMITTED', category: 'Water Pollution' },
];

// ─── 11. SECTOR AVERAGES ───────────────────────────────────────────────────────
export const SECTOR_AVERAGES: SectorAverage[] = [
  { sector: 'Steel', avgCo2: 248.2, avgNox: 46.4, avgSox: 12.8, facilityCount: 2 },
  { sector: 'Chemical', avgCo2: 262.0, avgNox: 50.4, avgSox: 15.8, facilityCount: 1 },
  { sector: 'Power', avgCo2: 268.2, avgNox: 50.6, avgSox: 15.9, facilityCount: 2 },
  { sector: 'Textile', avgCo2: 166.8, avgNox: 30.2, avgSox: 8.0, facilityCount: 1 },
  { sector: 'Aluminium', avgCo2: 230.8, avgNox: 39.5, avgSox: 10.5, facilityCount: 1 },
  { sector: 'Smelting', avgCo2: 291.1, avgNox: 54.9, avgSox: 18.2, facilityCount: 1 },
];

// ─── 12. WASTE DOCUMENTS ───────────────────────────────────────────────────────
export const WASTE_DOCUMENTS: WasteDocument[] = [
  { id: 'WD-001', facilityId: 'FAC-001', fileName: 'TataSteel_HazWaste_Manifest_May2026.pdf', uploadDate: '2026-05-18', status: 'APPROVED', type: 'Hazardous Waste Manifest', size: '1.2 MB' },
  { id: 'WD-002', facilityId: 'FAC-002', fileName: 'Reliance_ETP_Sludge_Disposal_Q1.pdf', uploadDate: '2026-05-10', status: 'REJECTED', type: 'ETP Sludge Disposal', size: '3.4 MB' },
  { id: 'WD-003', facilityId: 'FAC-006', fileName: 'Vedanta_FlyAsh_Utilization_Report.pdf', uploadDate: '2026-05-05', status: 'PENDING', type: 'Fly Ash Utilization', size: '2.7 MB' },
  { id: 'WD-004', facilityId: 'FAC-003', fileName: 'NTPC_CoalAsh_Pond_Assessment.pdf', uploadDate: '2026-04-28', status: 'APPROVED', type: 'Ash Pond Assessment', size: '5.1 MB' },
];

// ─── 13. TRANSLATIONS ──────────────────────────────────────────────────────────
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Login
    'login.title': 'CLIMACORE',
    'login.sub': 'Industrial Emission Monitoring System',
    'login.id': 'Operator ID / Email',
    'login.pass': 'Access Code',
    'login.role': 'Select Role',
    'login.btn': 'AUTHENTICATE',
    'login.err.creds': 'Invalid credentials. Access denied.',
    'login.err.role': 'Role selection is required.',
    'role.industry': 'Industry Operator',
    'role.government': 'Government Regulator',
    'role.citizen': 'Civilian Observer',

    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.emissions': 'Emissions',
    'nav.compliance': 'Compliance',
    'nav.reports': 'Reports',
    'nav.heatmap': 'AQI Heatmap',
    'nav.alerts': 'Alerts',
    'nav.civilian': 'Civilian Reports',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',

    // Dashboard
    'dash.title': 'SYSTEM OVERVIEW',
    'dash.facilities': 'Active Facilities',
    'dash.compliant': 'Compliant',
    'dash.warnings': 'Warnings',
    'dash.critical': 'Critical',
    'dash.avgScore': 'Avg. Compliance Score',
    'dash.emissions': 'Emission Trends',
    'dash.sectors': 'Sector Breakdown',
    'dash.recentAlerts': 'Recent Alerts',
    'dash.topViolators': 'Top Violators',

    // Emissions
    'emit.title': 'EMISSION RECORDS',
    'emit.filter': 'Filter by Facility',
    'emit.all': 'All Facilities',
    'emit.date': 'Date',
    'emit.facility': 'Facility',
    'emit.co2': 'CO₂ (t)',
    'emit.nox': 'NOx (kg)',
    'emit.sox': 'SOx (kg)',
    'emit.pm25': 'PM2.5 (kg)',
    'emit.status': 'Status',
    'emit.trend': 'Monthly Trend Analysis',
    'emit.add': 'Log Emission',
    'emit.fuel': 'Fuel Consumed (t)',
    'emit.elec': 'Electricity (MWh)',
    'emit.prod': 'Production (units)',

    // Compliance
    'comp.title': 'COMPLIANCE MONITOR',
    'comp.thresholds': 'Sector Thresholds',
    'comp.notices': 'Active Notices',
    'comp.escalation': 'Escalation Timeline',
    'comp.score': 'Compliance Score',
    'comp.sector': 'Sector',

    // Reports
    'rpt.title': 'REPORT CENTER',
    'rpt.generate': 'Generate Report',
    'rpt.download': 'Download',
    'rpt.name': 'Report Name',
    'rpt.date': 'Date',
    'rpt.size': 'Size',
    'rpt.status': 'Status',
    'rpt.type': 'Type',

    // AQI Heatmap
    'aqi.title': 'AIR QUALITY INDEX — LIVE',
    'aqi.city': 'City',
    'aqi.value': 'AQI',
    'aqi.category': 'Category',
    'aqi.pm25': 'PM2.5',
    'aqi.pm10': 'PM10',
    'aqi.good': 'Good',
    'aqi.satisfactory': 'Satisfactory',
    'aqi.moderate': 'Moderate',
    'aqi.poor': 'Poor',
    'aqi.veryPoor': 'Very Poor',
    'aqi.severe': 'Severe',

    // Alerts
    'alert.title': 'ALERT CENTER',
    'alert.unread': 'Unread',
    'alert.all': 'All Alerts',
    'alert.markRead': 'Mark as Read',

    // Civilian
    'civ.title': 'CIVILIAN REPORTS',
    'civ.submit': 'Submit Report',
    'civ.name': 'Your Name',
    'civ.location': 'Location',
    'civ.description': 'Description',
    'civ.category': 'Category',
    'civ.status': 'Status',

    // Settings
    'set.title': 'SYSTEM SETTINGS',
    'set.lang': 'Language',
    'set.theme': 'Interface Theme',
    'set.notifications': 'Notifications',
    'set.profile': 'Profile',
    'set.about': 'About ClimaCore',
    'set.version': 'Version',

    // Common
    'common.loading': 'Processing...',
    'common.noData': 'No data available',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.export': 'Export',
  },
  hi: {
    // Login
    'login.title': 'क्लाइमाकोर',
    'login.sub': 'औद्योगिक उत्सर्जन निगरानी प्रणाली',
    'login.id': 'ऑपरेटर आईडी / ईमेल',
    'login.pass': 'एक्सेस कोड',
    'login.role': 'भूमिका चुनें',
    'login.btn': 'प्रमाणित करें',
    'login.err.creds': 'अमान्य प्रमाण-पत्र। पहुँच अस्वीकृत।',
    'login.err.role': 'भूमिका चयन आवश्यक है।',
    'role.industry': 'उद्योग संचालक',
    'role.government': 'सरकारी नियामक',
    'role.citizen': 'नागरिक पर्यवेक्षक',

    // Navigation
    'nav.dashboard': 'डैशबोर्ड',
    'nav.emissions': 'उत्सर्जन',
    'nav.compliance': 'अनुपालन',
    'nav.reports': 'रिपोर्ट',
    'nav.heatmap': 'AQI हीटमैप',
    'nav.alerts': 'अलर्ट',
    'nav.civilian': 'नागरिक रिपोर्ट',
    'nav.settings': 'सेटिंग्स',
    'nav.logout': 'लॉगआउट',

    // Dashboard
    'dash.title': 'सिस्टम अवलोकन',
    'dash.facilities': 'सक्रिय सुविधाएँ',
    'dash.compliant': 'अनुपालक',
    'dash.warnings': 'चेतावनी',
    'dash.critical': 'गंभीर',
    'dash.avgScore': 'औसत अनुपालन स्कोर',
    'dash.emissions': 'उत्सर्जन रुझान',
    'dash.sectors': 'क्षेत्र विश्लेषण',
    'dash.recentAlerts': 'हालिया अलर्ट',
    'dash.topViolators': 'शीर्ष उल्लंघनकर्ता',

    // Emissions
    'emit.title': 'उत्सर्जन रिकॉर्ड',
    'emit.filter': 'सुविधा के अनुसार फ़िल्टर करें',
    'emit.all': 'सभी सुविधाएँ',
    'emit.date': 'दिनांक',
    'emit.facility': 'सुविधा',
    'emit.co2': 'CO₂ (टन)',
    'emit.nox': 'NOx (किग्रा)',
    'emit.sox': 'SOx (किग्रा)',
    'emit.pm25': 'PM2.5 (किग्रा)',
    'emit.status': 'स्थिति',
    'emit.trend': 'मासिक रुझान विश्लेषण',
    'emit.add': 'उत्सर्जन दर्ज करें',
    'emit.fuel': 'ईंधन खपत (टन)',
    'emit.elec': 'बिजली (MWh)',
    'emit.prod': 'उत्पादन (इकाइयाँ)',

    // Compliance
    'comp.title': 'अनुपालन मॉनिटर',
    'comp.thresholds': 'क्षेत्रीय सीमाएँ',
    'comp.notices': 'सक्रिय नोटिस',
    'comp.escalation': 'वृद्धि समयरेखा',
    'comp.score': 'अनुपालन स्कोर',
    'comp.sector': 'क्षेत्र',

    // Reports
    'rpt.title': 'रिपोर्ट केंद्र',
    'rpt.generate': 'रिपोर्ट बनाएँ',
    'rpt.download': 'डाउनलोड',
    'rpt.name': 'रिपोर्ट का नाम',
    'rpt.date': 'दिनांक',
    'rpt.size': 'आकार',
    'rpt.status': 'स्थिति',
    'rpt.type': 'प्रकार',

    // AQI Heatmap
    'aqi.title': 'वायु गुणवत्ता सूचकांक — लाइव',
    'aqi.city': 'शहर',
    'aqi.value': 'AQI',
    'aqi.category': 'श्रेणी',
    'aqi.pm25': 'PM2.5',
    'aqi.pm10': 'PM10',
    'aqi.good': 'अच्छा',
    'aqi.satisfactory': 'संतोषजनक',
    'aqi.moderate': 'मध्यम',
    'aqi.poor': 'ख़राब',
    'aqi.veryPoor': 'बहुत ख़राब',
    'aqi.severe': 'गंभीर',

    // Alerts
    'alert.title': 'अलर्ट केंद्र',
    'alert.unread': 'अपठित',
    'alert.all': 'सभी अलर्ट',
    'alert.markRead': 'पढ़ा हुआ चिह्नित करें',

    // Civilian
    'civ.title': 'नागरिक रिपोर्ट',
    'civ.submit': 'रिपोर्ट जमा करें',
    'civ.name': 'आपका नाम',
    'civ.location': 'स्थान',
    'civ.description': 'विवरण',
    'civ.category': 'श्रेणी',
    'civ.status': 'स्थिति',

    // Settings
    'set.title': 'सिस्टम सेटिंग्स',
    'set.lang': 'भाषा',
    'set.theme': 'इंटरफ़ेस थीम',
    'set.notifications': 'सूचनाएँ',
    'set.profile': 'प्रोफ़ाइल',
    'set.about': 'क्लाइमाकोर के बारे में',
    'set.version': 'संस्करण',

    // Common
    'common.loading': 'प्रसंस्करण...',
    'common.noData': 'कोई डेटा उपलब्ध नहीं',
    'common.save': 'सहेजें',
    'common.cancel': 'रद्द करें',
    'common.confirm': 'पुष्टि करें',
    'common.search': 'खोजें',
    'common.export': 'निर्यात',
  },
};

// ─── TRANSLATION HELPER ────────────────────────────────────────────────────────
export const tr = (key: string, lang: string): string =>
  (TRANSLATIONS as Record<string, Record<string, string>>)[lang]?.[key] || key;
