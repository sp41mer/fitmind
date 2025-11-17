import { WeightUnit } from '@/types/settings';

const KG_TO_LBS = 2.20462;
const LBS_TO_KG = 0.453592;

export function convertWeight(
  weight: number,
  from: WeightUnit,
  to: WeightUnit
): number {
  if (from === to) return weight;

  if (from === 'kg' && to === 'lbs') {
    return weight * KG_TO_LBS;
  } else if (from === 'lbs' && to === 'kg') {
    return weight * LBS_TO_KG;
  }

  return weight;
}

export function formatWeight(weight: number, unit: WeightUnit, decimals: number = 1): string {
  return `${weight.toFixed(decimals)} ${unit}`;
}

export function roundWeight(weight: number, unit: WeightUnit): number {
  // Round to nearest 0.5 for kg, nearest 1 for lbs
  if (unit === 'kg') {
    return Math.round(weight * 2) / 2;
  } else {
    return Math.round(weight);
  }
}
