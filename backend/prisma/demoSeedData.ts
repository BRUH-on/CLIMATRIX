import { IndustrySector } from '@prisma/client';
import { PROVISIONAL_CO2_FACTORS } from '../src/constants/emissionFactors';

export type DemoScenario =
  | 'mumbai-violation'
  | 'compliant'
  | 'sudden-drop'
  | 'fuel-mismatch'
  | 'electricity-mismatch';

export interface DemoIndustryFixture {
  registrationNo: string;
  name: string;
  sector: IndustrySector;
  contactEmail: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  warningLimitKg: number;
  violationLimitKg: number;
  scenario: DemoScenario;
}

export const DEMO_INDUSTRIES: DemoIndustryFixture[] = [
  {
    registrationNo: 'STEEL-MUM-001',
    name: 'Mumbai Steel Works',
    sector: IndustrySector.STEEL,
    contactEmail: 'mumbai-steel-demo@example.invalid',
    addressLine1: 'Demo Industrial Estate',
    city: 'Mumbai',
    state: 'Maharashtra',
    postalCode: '400001',
    latitude: 19.076,
    longitude: 72.8777,
    warningLimitKg: 60_000,
    violationLimitKg: 75_000,
    scenario: 'mumbai-violation',
  },
  {
    registrationNo: 'DEMO-AGENT-STEEL-JSR-001',
    name: 'Jamshedpur Steel Works',
    sector: IndustrySector.STEEL,
    contactEmail: 'jamshedpur-steel-demo@example.invalid',
    addressLine1: 'Demo Steel Estate',
    city: 'Jamshedpur',
    state: 'Jharkhand',
    postalCode: '831001',
    latitude: 22.8046,
    longitude: 86.2029,
    warningLimitKg: 60_000,
    violationLimitKg: 75_000,
    scenario: 'compliant',
  },
  {
    registrationNo: 'DEMO-AGENT-STEEL-BLR-001',
    name: 'Bellary Steel Works',
    sector: IndustrySector.STEEL,
    contactEmail: 'bellary-steel-demo@example.invalid',
    addressLine1: 'Demo Metals Estate',
    city: 'Ballari',
    state: 'Karnataka',
    postalCode: '583101',
    latitude: 15.1394,
    longitude: 76.9214,
    warningLimitKg: 60_000,
    violationLimitKg: 75_000,
    scenario: 'sudden-drop',
  },
  {
    registrationNo: 'CEMENT-BLR-005',
    name: 'Bangalore Cement Corp.',
    sector: IndustrySector.CEMENT,
    contactEmail: 'cement-demo@example.invalid',
    addressLine1: 'Demo Cement Estate, Peenya',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560058',
    latitude: 12.9716,
    longitude: 77.5946,
    warningLimitKg: 60_000,
    violationLimitKg: 90_000,
    scenario: 'fuel-mismatch',
  },
  {
    registrationNo: 'POWER-DEL-002',
    name: 'Delhi Power Generation Co.',
    sector: IndustrySector.POWER,
    contactEmail: 'power-demo@example.invalid',
    addressLine1: 'Demo Power Estate',
    city: 'Delhi',
    state: 'Delhi',
    postalCode: '110020',
    latitude: 28.6139,
    longitude: 77.209,
    warningLimitKg: 100_000,
    violationLimitKg: 150_000,
    scenario: 'electricity-mismatch',
  },
];

export interface DemoMonthlyRecord {
  periodStart: Date;
  periodEnd: Date;
  recordedAt: Date;
  coalTonnes: number;
  electricityKwh: number;
  productionVolume: number;
  co2Kg: number;
  noxKg: number;
  soxKg: number;
  pm25Ugm3: number;
}

export function buildDemoMonthlyRecords(scenario: DemoScenario): DemoMonthlyRecord[] {
  const records: DemoMonthlyRecord[] = [];

  for (let offset = 0; offset < 12; offset += 1) {
    const monthIndex = 9 + offset;
    const year = 2025 + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const periodStart = new Date(Date.UTC(year, month, 1));
    const periodEnd = new Date(Date.UTC(year, month + 1, 0));
    const recordedAt = new Date(Date.UTC(year, month + 1, 1, 12));
    const coalTonnes = coalForMonth(scenario, offset);
    const estimatedCoalCO2Kg = Math.round(
      coalTonnes * PROVISIONAL_CO2_FACTORS.COAL.co2KgPerUnit,
    );
    const co2Kg =
      scenario === 'sudden-drop' && offset === 11
        ? estimatedCoalCO2Kg
        : scenario === 'fuel-mismatch' && offset === 11
          ? 36_000
          : estimatedCoalCO2Kg;

    records.push({
      periodStart,
      periodEnd,
      recordedAt,
      coalTonnes,
      electricityKwh:
        scenario === 'electricity-mismatch' && offset === 11 ? 300_000 : 50_000,
      productionVolume: productionForMonth(scenario, offset),
      co2Kg,
      noxKg: 900 + offset * 15,
      soxKg: 250 + offset * 5,
      pm25Ugm3: 18 + offset,
    });
  }

  return records;
}

function coalForMonth(scenario: DemoScenario, offset: number): number {
  if (scenario === 'mumbai-violation') {
    return offset === 11 ? 40 : 20 + offset * 0.4;
  }
  if (scenario === 'compliant') return 20 + offset * 0.2;
  if (scenario === 'sudden-drop' && offset === 11) return 9.5;
  if (scenario === 'fuel-mismatch') return 30 + offset * 0.3;
  return 35 + offset * 0.3;
}

function productionForMonth(scenario: DemoScenario, offset: number): number {
  if (scenario === 'mumbai-violation') return 1800 + offset * 50;
  if (scenario === 'compliant') return 1600 + offset * 35;
  if (scenario === 'sudden-drop') return 1700 + offset * 40;
  if (scenario === 'fuel-mismatch') return 1400 + offset * 30;
  return 1800 + offset * 40;
}