import { useCallback, useEffect, useMemo, useState } from "react";
import { resolveTheme, isKnownTenant, TENANT_IDS } from "../theme/resolveTheme";
import { applyThemeVarsToRoot } from "../theme/themeCssVars";
import type { TenantTheme } from "../provided/theme-config";

const QUERY_KEY = "tenant";

function readTenantFromUrl(): string | null {
  try {
    const id = new URLSearchParams(window.location.search).get(QUERY_KEY);
    if (!id || !isKnownTenant(id)) return null;
    return id;
  } catch {
    return null;
  }
}

function writeTenantToUrl(tenantId: string | null) {
  try {
    const url = new URL(window.location.href);
    if (tenantId) url.searchParams.set(QUERY_KEY, tenantId);
    else url.searchParams.delete(QUERY_KEY);
    window.history.replaceState({}, "", url);
  } catch (error) {
    console.error("Error writing tenant to URL:", error);
  }
}

export interface UseTenantThemeResult {
  tenantId: string | null;
  tenantIds: string[];
  theme: TenantTheme;
  fallbacks: Array<keyof TenantTheme>;
  setTenantId: (id: string | null) => void;
}

/** Runtime tenant switch — no rebuild. Invalid query values fall back to default. */
export function useTenantTheme(): UseTenantThemeResult {
  const [tenantId, setTenantIdState] = useState<string | null>(() =>
    readTenantFromUrl(),
  );

  const { theme, fallbacks } = useMemo(
    () => resolveTheme(tenantId),
    [tenantId],
  );

  useEffect(() => {
    applyThemeVarsToRoot(theme, tenantId);
  }, [theme, tenantId]);

  const setTenantId = useCallback((id: string | null) => {
    const next = id && isKnownTenant(id) ? id : null;
    setTenantIdState(next);
    writeTenantToUrl(next);
  }, []);

  return { tenantId, tenantIds: TENANT_IDS, theme, fallbacks, setTenantId };
}
