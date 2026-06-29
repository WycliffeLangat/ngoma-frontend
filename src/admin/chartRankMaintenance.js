import { cmsApi, clearCmsCache, getResults } from "./api";

const READ_CONCURRENCY = 6;
const WRITE_CONCURRENCY = 6;

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

async function updateRank(entry, rank) {
  await cmsApi.patch(`/chart-entries/${entry.id}/`, { rank });
}

async function rerankScope(scope) {
  const entries = getResults(await cmsApi.get(
    `/chart-entries/?chart=${scope.chart}&platform=${scope.platform}` +
    `&ordering=-total_points,rank&page_size=500`
  ));
  const changed = entries
    .map((entry, index) => ({ ...entry, nextRank: index + 1 }))
    .filter((entry) => entry.rank !== entry.nextRank);

  if (!changed.length) return 0;

  // Rank is unique per chart/platform. Move changed rows to unique temporary
  // values first so swaps cannot collide, then install their final ranks.
  const temporaryResults = await mapWithConcurrency(
    changed,
    WRITE_CONCURRENCY,
    async (entry) => {
      try {
        await updateRank(entry, -(1_000_000 + Number(entry.id)));
        return { entry, applied: true };
      } catch (error) {
        return { entry, applied: false, error };
      }
    }
  );
  const temporaryFailure = temporaryResults.find((result) => !result.applied);
  if (temporaryFailure) {
    await mapWithConcurrency(
      temporaryResults.filter((result) => result.applied),
      WRITE_CONCURRENCY,
      async ({ entry }) => {
        try { await updateRank(entry, entry.rank); } catch {}
      }
    );
    throw temporaryFailure.error;
  }

  await mapWithConcurrency(changed, WRITE_CONCURRENCY, async (entry) => {
    await updateRank(entry, entry.nextRank);
  });
  return changed.length;
}

/**
 * Re-rank affected scopes by points after a merge/delete.
 * Failures are returned rather than thrown because the destructive operation
 * has already succeeded and must never be presented as safe to retry.
 */
export async function rerankAffectedChartScopes(scopes) {
  if (!scopes.length) return { updatedEntries: 0, failedScopes: [] };

  // Merge/delete mutations invalidate releases, not chart-entry GETs.
  // Explicitly clear these before reading the post-mutation ranking.
  clearCmsCache("/chart-entries/");

  const results = await mapWithConcurrency(scopes, READ_CONCURRENCY, async (scope) => {
    try {
      return { scope, updated: await rerankScope(scope) };
    } catch (error) {
      return { scope, updated: 0, error };
    }
  });

  return {
    updatedEntries: results.reduce((sum, result) => sum + result.updated, 0),
    failedScopes: results.filter((result) => result.error),
  };
}

/**
 * A deletion only leaves rank gaps; relative order is unchanged. Let the
 * server close each gap in one request instead of PATCHing every later row.
 */
export async function reorderAffectedChartScopes(scopes) {
  if (!scopes.length) return { reorderedScopes: 0, failedScopes: [] };

  clearCmsCache("/chart-entries/");
  const results = await mapWithConcurrency(scopes, READ_CONCURRENCY, async (scope) => {
    try {
      await cmsApi.post("/chart-entries/reorder/", scope);
      return { scope };
    } catch (error) {
      return { scope, error };
    }
  });

  return {
    reorderedScopes: results.filter((result) => !result.error).length,
    failedScopes: results.filter((result) => result.error),
  };
}
