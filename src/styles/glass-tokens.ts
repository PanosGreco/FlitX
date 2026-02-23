// FlitX Glassmorphic Design Tokens - Semantic CSS Custom Properties
// All glass styling references these tokens for easy toggling and theming

export const glassTokens = {
  surface: {
    glass: 'var(--glass-surface)',
    glassHover: 'var(--glass-surface-hover)',
    glassActive: 'var(--glass-surface-active)',
  },
  blur: {
    card: 'var(--glass-blur-card)',
    sidebar: 'var(--glass-blur-sidebar)',
    tooltip: 'var(--glass-blur-tooltip)',
  },
  border: {
    glass: 'var(--glass-border)',
    glassStrong: 'var(--glass-border-strong)',
  },
  radius: {
    card: 'var(--glass-radius-card)',
    sidebar: 'var(--glass-radius-sidebar)',
    tooltip: '12px',
  },
  shadow: {
    card: 'var(--glass-shadow-card)',
    cardHover: 'var(--glass-shadow-card-hover)',
  },
  transition: {
    default: 'all 300ms ease-out',
    hover: 'transform 200ms ease-out, box-shadow 200ms ease-out',
    indicator: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
  zIndex: {
    sidebar: 40,
    sidebarOverlay: 39,
    header: 30,
    tooltip: 50,
    modal: 60,
    toast: 70,
  },
} as const;

export type GlassTokens = typeof glassTokens;
