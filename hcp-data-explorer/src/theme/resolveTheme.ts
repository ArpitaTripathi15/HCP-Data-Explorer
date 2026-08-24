import {
  DEFAULT_THEME,
  TENANT_THEMES,
  type TenantTheme,
} from '../provided/theme-config'

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

const THEME_KEYS = [
  'appName',
  'primary',
  'onPrimary',
  'background',
  'surface',
  'text',
  'radius',
] as const satisfies ReadonlyArray<keyof TenantTheme>

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim())
}

function isRadius(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 24
}

function isValidField<K extends keyof TenantTheme>(
  key: K,
  value: unknown,
): value is TenantTheme[K] {
  switch (key) {
    case 'appName':
      return isNonEmptyString(value)
    case 'radius':
      return isRadius(value)
    default:
      return isHexColor(value)
  }
}

export interface ResolvedTheme {
  theme: TenantTheme
  /** Fields that were missing or invalid and used DEFAULT_THEME. */
  fallbacks: Array<keyof TenantTheme>
}

/**
 * Sanitize a customer theme: each invalid/missing field falls back independently.
 * Unknown tenant ids resolve entirely to DEFAULT_THEME.
 */
export function resolveTheme(tenantId: string | null): ResolvedTheme {
  const partial = tenantId ? TENANT_THEMES[tenantId] : undefined
  if (!partial) {
    return { theme: { ...DEFAULT_THEME }, fallbacks: [] }
  }

  const fallbacks: Array<keyof TenantTheme> = []
  const theme = { ...DEFAULT_THEME }

  for (const key of THEME_KEYS) {
    const raw = partial[key]
    if (isValidField(key, raw)) {
      theme[key] = raw as never
    } else {
      fallbacks.push(key)
    }
  }

  return { theme, fallbacks }
}

export const TENANT_IDS = Object.keys(TENANT_THEMES)

export function isKnownTenant(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TENANT_THEMES, id)
}
