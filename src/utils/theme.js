export const COLORS = {
  // Backgrounds
  bg: '#F5F8FA',
  bgCard: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgInput: '#F0F2F5',

  // Brand / Accent
  primary: '#0969DA',
  primaryDark: '#0349B4',
  primaryGlow: 'rgba(9,105,218,0.15)',

  // Status
  success: '#1A7F37',
  successGlow: 'rgba(26,127,55,0.15)',
  warning: '#9A6700',
  warningGlow: 'rgba(154,103,0,0.15)',
  danger: '#CF222E',
  dangerGlow: 'rgba(207,34,46,0.2)',

  // Text
  textPrimary: '#24292F',
  textSecondary: '#57606A',
  textMuted: '#6E7781',

  // Borders
  border: '#D0D7DE',
  borderLight: '#E1E4E8',

  // Chart
  chartLine: '#0969DA',
  chartFill: 'rgba(9,105,218,0.1)',
};

export const FONTS = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 38,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  }),
};
