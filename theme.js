// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM
// Aesthetic: "Warm Espresso" — dark roast surfaces, amber highlights,
// cream whites. Feels like a quality independent café, not corporate.
// ─────────────────────────────────────────────────────────────────────────────

export const C = {
  // ── Backgrounds
  bgDark:     '#1C1209',   // espresso — main background
  bgMid:      '#2A1E0F',   // dark roast — cards
  bgLight:    '#3D2D18',   // medium roast — elevated surfaces
  bgPane:     '#F5EFE6',   // cream — right panel / modals

  // ── Surfaces
  surface:    '#F5EFE6',   // cream white
  surfaceAlt: '#EDE4D6',   // slightly darker cream

  // ── Text on dark
  txtPrimary: '#F5EFE6',   // cream
  txtSecond:  '#B8A48C',   // muted warm
  txtDim:     '#7A6550',   // very muted

  // ── Text on light
  inkDark:    '#1C1209',   // espresso on cream
  inkMid:     '#4A3320',   // medium brown
  inkLight:   '#8C7258',   // muted brown

  // ── Accents
  amber:      '#F59E0B',   // gold / amber — primary action
  amberDark:  '#D97706',
  amberLight: '#FCD34D',

  // ── Status — table colors
  green:      '#22C55E',   // empty / available
  greenDark:  '#16A34A',
  red:        '#EF4444',   // occupied
  redDark:    '#DC2626',
  purple:     '#A855F7',   // guest
  purpleDark: '#9333EA',
  blue:       '#3B82F6',   // delivery
  blueDark:   '#2563EB',

  // ── Utility
  success:    '#22C55E',
  danger:     '#EF4444',
  warning:    '#F59E0B',
  border:     'rgba(245,239,230,0.10)',
  borderPane: '#DDD0BE',
  overlay:    'rgba(28,18,9,0.75)',
  white:      '#FFFFFF',
};

export const F = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
  hero: 36,
};

export const R = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  18,
  xl:  24,
  full: 999,
};

export const S = {
  // For dark surfaces
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  // For light surfaces
  float: {
    shadowColor: '#1C1209',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
};
