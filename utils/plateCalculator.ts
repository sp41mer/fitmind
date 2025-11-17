import { WeightUnit } from '@/types/settings';

// Standard barbell weights
const BARBELL_WEIGHT_KG = 20;
const BARBELL_WEIGHT_LBS = 45;

// Available plate weights (one side only)
const PLATES_KG = [20, 15, 10, 5, 2.5, 1.25];
const PLATES_LBS = [45, 35, 25, 10, 5, 2.5];

export interface PlateCalculation {
  isValid: boolean;
  plates: Array<{ weight: number; count: number }>;
  totalPerSide: number;
  errorMessage?: string;
}

/**
 * Calculate which plates are needed for a target weight
 * Returns plates needed for ONE SIDE of the barbell
 */
export function calculatePlates(
  targetWeight: number,
  unit: WeightUnit
): PlateCalculation {
  const barWeight = unit === 'kg' ? BARBELL_WEIGHT_KG : BARBELL_WEIGHT_LBS;
  const availablePlates = unit === 'kg' ? PLATES_KG : PLATES_LBS;

  // Validate input
  if (targetWeight < barWeight) {
    return {
      isValid: false,
      plates: [],
      totalPerSide: 0,
      errorMessage: `Weight must be at least ${barWeight}${unit} (barbell weight)`,
    };
  }

  // Calculate weight needed per side
  const weightPerSide = (targetWeight - barWeight) / 2;

  if (weightPerSide < 0) {
    return {
      isValid: false,
      plates: [],
      totalPerSide: 0,
      errorMessage: 'Invalid weight',
    };
  }

  // Greedy algorithm to find plates
  let remaining = weightPerSide;
  const plates: Array<{ weight: number; count: number }> = [];

  for (const plateWeight of availablePlates) {
    if (remaining >= plateWeight) {
      const count = Math.floor(remaining / plateWeight);
      plates.push({ weight: plateWeight, count });
      remaining -= count * plateWeight;
    }
  }

  // Check if we got close enough (within 0.1 tolerance for floating point)
  if (remaining > 0.1) {
    return {
      isValid: false,
      plates,
      totalPerSide: weightPerSide - remaining,
      errorMessage: `Cannot load exactly ${targetWeight}${unit}. Closest: ${
        barWeight + (weightPerSide - remaining) * 2
      }${unit}`,
    };
  }

  return {
    isValid: true,
    plates,
    totalPerSide: weightPerSide,
  };
}

/**
 * Format plate calculation as a readable string
 * Example: "Each side: 1×20kg, 2×5kg, 1×2.5kg"
 */
export function formatPlateCalculation(
  calculation: PlateCalculation,
  unit: WeightUnit
): string {
  if (!calculation.isValid) {
    return calculation.errorMessage || 'Cannot calculate plates';
  }

  if (calculation.plates.length === 0) {
    return 'No plates needed (bar only)';
  }

  const platesStr = calculation.plates
    .map((p) => `${p.count}×${p.weight}${unit}`)
    .join(', ');

  return `Each side: ${platesStr}`;
}

/**
 * Get a compact display string for quick reference
 * Example: "2×20 + 1×5 + 1×2.5"
 */
export function formatPlateCompact(
  calculation: PlateCalculation,
  unit: WeightUnit
): string {
  if (!calculation.isValid || calculation.plates.length === 0) {
    return '';
  }

  return calculation.plates.map((p) => `${p.count}×${p.weight}`).join(' + ');
}
