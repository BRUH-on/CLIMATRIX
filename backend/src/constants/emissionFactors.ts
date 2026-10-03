export interface ProvisionalEmissionFactor {
  quantityUnit: string;
  co2KgPerUnit: number;
  label: string;
}

// Demo/reference value copied from the existing frontend factor table.
// TODO: verify the source, fuel specification, and applicability before operational use.
export const PROVISIONAL_CO2_FACTORS = {
  COAL: {
    quantityUnit: 'tonne',
    co2KgPerUnit: 2420,
    label: 'Provisional frontend demo/reference factor; source unverified',
  },
} satisfies Record<string, ProvisionalEmissionFactor>;

export const VALIDATION_TOLERANCES = {
  fuelEmissionDifferencePercent: 20,
  intensityChangePercent: 50,
  electricityIntensityMultiplier: 2.5,
  electricityIntensityMinimumRatio: 0.4,
  minimumHistoryRecords: 3,
} as const;