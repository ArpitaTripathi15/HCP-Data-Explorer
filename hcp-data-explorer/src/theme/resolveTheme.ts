import {
  DEFAULT_THEME,
  TENANT_THEMES,
  type TenantTheme,
} from '../provided/theme-config'

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value.trim())
}

/** Radius must be a finite number in the documented 0–24 px range. */
function isRadius(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 24
}

function pick<K extends keyof TenantTheme>(
  partial: Partial<TenantTheme> | undefined,
  key: K,
  isValid: (value: unknown) => value is TenantTheme[K],
): TenantTheme[K] {
  const raw = partial?.[key]
  return isValid(raw) ? raw : DEFAULT_THEME[key]
}

/**
 * Sanitize a customer theme: each invalid/missing field falls back independently.
 * Unknown tenant ids resolve entirely to DEFAULT_THEME.
 */
export function resolveTheme(tenantId: string | null): TenantTheme {
  const partial = tenantId ? TENANT_THEMES[tenantId] : undefined
  return {
    appName: pick(partial, 'appName', isNonEmptyString),
    primary: pick(partial, 'primary', isHexColor),
    onPrimary: pick(partial, 'onPrimary', isHexColor),
    background: pick(partial, 'background', isHexColor),
    surface: pick(partial, 'surface', isHexColor),
    text: pick(partial, 'text', isHexColor),
    radius: pick(partial, 'radius', isRadius),
  }
}

export const TENANT_IDS = Object.keys(TENANT_THEMES)

export function isKnownTenant(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(TENANT_THEMES, id)
}
