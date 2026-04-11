/**
 * Report / chart hex palette — Business Overview & chart-heavy reports use these inline.
 * Tailwind surfaces: `bg-report-card`, `border-report-border` (see tailwind.config.js).
 */
export const REPORT_CHART_PALETTE = {
  /** Page canvas (full-bleed report backgrounds) */
  bg: '#000000',
  /** Inset strips, inputs, table chrome */
  bg2: '#0a0a0a',
  /** Primary card / panel surface (matches Tailwind `report-card`) */
  card: '#0c0c0c',
  border: '#1a1a1a',
  border2: '#2a2a2a',
  text: '#ffffff',
  text2: '#d1d9e6',
  muted: '#8b9ab0',
  faint: '#4a5568',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#22d3ee',
  yellow: '#eab308',
  purple: '#a78bfa',
  orange: '#f97316',
  /** Dark table row hover (semantic tables) */
  rowHover: '#141414',
  /** Toolbar buttons on full-page report UIs */
  chromeBg: '#0c0c0c',
  chromeBorder: '#2a2a2a',
};

/** Short alias used in report pages */
export const C = REPORT_CHART_PALETTE;

export const REPORT_EXPENSE_SCALE = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#450a0a'];

export const REPORT_INCOME_SCALE = ['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d', '#052e16'];

/** Primary chart series tints (orange family, matches invoice accent) */
export const REPORT_ORANGE_SCALE = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];
