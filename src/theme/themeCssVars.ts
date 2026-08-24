import type { TenantTheme } from "../provided/theme-config";
import type { CSSProperties } from "react";

export type ThemeCssVars = CSSProperties & Record<`--${string}`, string>;

/**
 * Header chrome by tenant. The provided configs share/fallback the same `primary`
 * (#0B5FA5), so header color is mapped here so Default / Aurelia / Meridian
 * are visually distinct. Grid still uses resolved `background` / `surface`.
 */
const HEADER_BY_TENANT: Record<string, { header: string; onHeader: string }> = {
  aurelia: { header: "#157A6E", onHeader: "#FFFFFF" },
  meridian: { header: "#3f8cfdb3", onHeader: "#16202E" },
};

/**
 * Map a resolved TenantTheme onto CSS custom properties.
 * Components never read `theme.primary` in CSS — they use `var(--color-primary)`.
 * Switching tenants = rewriting these variables on the document root.
 */
export function themeToCssVars(
  theme: TenantTheme,
  tenantId: string | null = null,
): ThemeCssVars {
  const header = tenantId ? HEADER_BY_TENANT[tenantId] : undefined;
  return {
    "--color-primary": theme.primary,
    "--color-on-primary": theme.onPrimary,
    "--color-header": header?.header ?? theme.primary,
    "--color-on-header": header?.onHeader ?? theme.onPrimary,
    "--color-background": theme.background,
    "--color-surface": theme.surface,
    "--color-text": theme.text,
    "--color-text-muted": `color-mix(in srgb, ${theme.text} 55%, ${theme.background})`,
    "--color-border": `color-mix(in srgb, ${theme.text} 18%, ${theme.background})`,
    "--color-row-hover": `color-mix(in srgb, ${theme.primary} 6%, ${theme.background})`,
    "--radius": `${theme.radius}px`,
    "--color-pending": "#0B8A8A",
    "--color-rejected": "#C0392B",
  };
}

export function applyThemeVarsToRoot(
  theme: TenantTheme,
  tenantId: string | null,
): void {
  const root = document.documentElement;
  const vars = themeToCssVars(theme, tenantId);
  for (const [name, value] of Object.entries(vars)) {
    if (typeof value === "string") root.style.setProperty(name, value);
  }
}
