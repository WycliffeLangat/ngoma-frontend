import { cmsApi, clearCmsCache, getResults } from "./api";

const READ_CONCURRENCY = 6;

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

function entryScope(entry) {
  const chart = typeof entry.chart === "object" ? entry.chart?.id : entry.chart;
  const rawPlatform = entry.platform_id ?? entry.platform;
  const platform = typeof rawPlatform === "object" ? rawPlatform?.id : rawPlatform;
  if (!chart) return null;
  return { chart, platform: platform || "combined" };
}

/**
 * Capture the exact chart/platform pairs touched by one or more releases.
 * This must run before the releases are merged or deleted.
 */
export async function getAffectedChartScopes(releaseIds) {
  const ids = [...new Set(
    (Array.isArray(releaseIds) ? releaseIds : [releaseIds]).filter(Boolean)
  )];
  const batches = await mapWithConcurrency(ids, READ_CONCURRENCY, async (releaseId) => {
    try {
      return getResults(await cmsApi.get(
        `/chart-entries/?release=${releaseId}&page_size=500`
      ));
    } catch {
      return [];
    }
  });

  const scopes = new Map();
  batches.flat().forEach((entry) => {
    const scope = entryScope(entry);
    if (scope) scopes.set(`${scope.chart}:${scope.platform}`, scope);
  });
  return [...scopes.values()];
}

export async function harmonizeChartData({ chartIds = [], chartType = "" } = {}) {
  clearCmsCache();
  const result = await cmsApi.post("/chart-entries/harmonize/", {
    chart_ids: [...new Set(chartIds.filter(Boolean))],
    ...(chartType ? { chart_type: chartType } : {}),
  });
  clearCmsCache();
  return result;
}

/**
 * Re-rank affected scopes by points after a merge/delete.
 * Failures are returned rather than thrown because the destructive operation
 * has already succeeded and must never be presented as safe to retry.
 */
export async function rerankAffectedChartScopes(scopes) {
  if (!scopes.length) return { updatedEntries: 0, failedScopes: [] };
  try {
    const result = await harmonizeChartData({
      chartIds: scopes.map((scope) => scope.chart),
    });
    return {
      updatedEntries: Number(result.rank_changes || 0) + Number(result.history_changes || 0),
      failedScopes: [],
      ...result,
    };
  } catch (error) {
    return {
      updatedEntries: 0,
      failedScopes: scopes.map((scope) => ({ scope, error })),
    };
  }
}

/**
 * A deletion only leaves rank gaps; relative order is unchanged. Let the
 * server close each gap in one request instead of PATCHing every later row.
 */
export async function reorderAffectedChartScopes(scopes) {
  if (!scopes.length) return { reorderedScopes: 0, failedScopes: [] };
  const result = await rerankAffectedChartScopes(scopes);
  return {
    reorderedScopes: result.failedScopes.length ? 0 : scopes.length,
    failedScopes: result.failedScopes,
    ...result,
  };
}
