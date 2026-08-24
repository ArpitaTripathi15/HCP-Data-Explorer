import type { TenantTheme } from '../provided/theme-config'
import type { CSSProperties } from 'react'

/** Mixes used when tenant does not provide muted/border tokens. */
export function themeToCssVars(theme: TenantTheme): CSSProperties {
  return {
    ['--color-primary' as string]: theme.primary,
    ['--color-on-primary' as string]: theme.onPrimary,
    ['--color-background' as string]: theme.background,
    ['--color-surface' as string]: theme.surface,
    ['--color-text' as string]: theme.text,
    ['--color-text-muted' as string]: `color-mix(in srgb, ${theme.text} 55%, ${theme.background})`,
    ['--color-border' as string]: `color-mix(in srgb, ${theme.text} 18%, ${theme.background})`,
    ['--color-row-hover' as string]: `color-mix(in srgb, ${theme.primary} 6%, ${theme.background})`,
    ['--radius' as string]: `${theme.radius}px`,
    // Semantic edit states — independent of tenant primary so they stay distinct
    ['--color-pending' as string]: '#0B8A8A',
    ['--color-rejected' as string]: '#C0392B',
  }
}
