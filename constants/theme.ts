export const Colors = {
  background: '#F5F5F7', // Light Gray background
  backgroundDark: '#1C1C1E', // Dark background for cards/sections
  cardBackground: '#FFFFFF', // White cards
  cardBackgroundDark: '#2C2C2E', // Dark cards for contrast
  text: '#1D1D1F', // Near Black text
  textLight: '#FFFFFF', // White text for dark backgrounds
  textSecondary: '#86868B', // Gray for secondary text
  textTertiary: '#C7C7CC', // Lighter gray for hints
  accent: '#6366F1', // Purple-Blue (Indigo)
  accentLight: '#EEF2FF', // Light purple-blue for subtle highlights
  success: '#34C759', // Green for completed items
  successLight: '#D1F5D3', // Light green background for completed sets
  error: '#FF3B30', // Red for errors/delete
  warning: '#FF9500', // Orange for warnings
  border: '#D1D1D6', // Light border
  borderDark: '#3A3A3C', // Dark border
  shadow: 'rgba(0, 0, 0, 0.08)', // Subtle shadow
};

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 34,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Shadow = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
};
