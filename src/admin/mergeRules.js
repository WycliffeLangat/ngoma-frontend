const MERGE_RULES_KEY = "cms_auto_merge_rules_v1";
const MAX_RULES = 500;

function storageOrNull(storage) {
  if (storage) return storage;
  try {
    if (typeof window !== "undefined") return window.localStorage;
  } catch {}
  return null;
}

function uniq(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function normalizeChartType(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "song" || raw === "single" || raw === "singles") return "singles";
  if (raw === "album" || raw === "albums") return "albums";
  return raw;
}

export function foldText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00e6/gi, "ae")
    .replace(/\u0153/gi, "oe")
    .replace(/\u00f8/gi, "o")
    .replace(/\u00df/gi, "ss")
    .replace(/[\u0111\u00f0]/gi, "d")
    .replace(/\u0142/gi, "l")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function foldTokenOrder(value) {
  const normalized = String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || [];
  return normalized.sort().join("");
}

export function foldReleaseTitle(value) {
  return foldText(
    String(value || "")
      .replace(/\s*[\[(]\s*(?:feat|ft|featuring|remix|remaster(?:ed)?|live|acoustic|radio\s*edit|version)[^\])]*[\])]/gi, "")
      .replace(/\s+(?:feat|ft|featuring)\b.*$/i, "")
  );
}

function aliasValues(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function artistNameKeys(row) {
  const values = [
    row?.name,
    row?.display_name,
    row?.public_name,
    row?.artist,
    row?.artist_display,
    ...aliasValues(row?.aliases),
  ];
  return uniq(values.flatMap((value) => [foldText(value), foldTokenOrder(value)]));
}

function releaseTitleKeys(row) {
  const values = [row?.title, row?.canonical_title, row?.t, row?.name];
  return uniq(values.flatMap((value) => [foldReleaseTitle(value), foldText(value)]));
}

function splitArtistCredit(value = "") {
  return String(value || "")
    .split(/\s*(?:\||\bft\.?|\bfeat\.?|\bfeaturing\b|\bx\b|&|,)\s*/i)
    .map((name) => name.trim())
    .filter(Boolean);
}

function artistCreditSetKey(primaryValue, featuredValue = "") {
  const names = [...splitArtistCredit(primaryValue), ...splitArtistCredit(featuredValue)]
    .map((name) => foldText(name))
    .filter(Boolean);
  return [...new Set(names)].sort().join("+");
}

function artistCreditKeys(primaryValue, featuredValue = "") {
  const joined = [primaryValue, featuredValue].filter(Boolean).join(" ");
  return uniq([
    artistCreditSetKey(primaryValue, featuredValue),
    foldText(joined),
    foldTokenOrder(joined),
  ]);
}

function releaseArtistKeys(row) {
  const featured = row?.featured_artist_credit || row?.featured_artists || row?.fa || "";
  const sourceGroups = [
    [row?.artist_display, row?.artist_credit, row?.a, row?.artist],
    [row?.artist_name],
    [row?.primary_artist_credit, row?.primary_artist, row?.pa],
  ];
  const values = sourceGroups.find((group) =>
    group.some((value) => String(value || "").trim())
  ) || [];
  return uniq(values.flatMap((value) => artistCreditKeys(value, featured)));
}

function inferKind(row, fallbackKind = "") {
  if (fallbackKind === "artist" || fallbackKind === "release") return fallbackKind;
  if (row?._type === "artist" || row?._type === "release") return row._type;
  if (row?.name && !row?.title) return "artist";
  return "release";
}

function inferChartType(row, fallbackChartType = "") {
  return normalizeChartType(
    fallbackChartType ||
    row?._chartType ||
    row?.chart_type ||
    row?.release_type ||
    row?.type
  );
}

export function mergeRuleKeysForRow(row, { kind = "", chartType = "" } = {}) {
  const resolvedKind = inferKind(row, kind);
  if (resolvedKind === "artist") {
    return artistNameKeys(row).map((key) => `artist:${key}`);
  }

  const resolvedChartType = inferChartType(row, chartType);
  const titles = releaseTitleKeys(row);
  const artists = releaseArtistKeys(row);
  if (!resolvedChartType || !titles.length || !artists.length) return [];
  const keys = [];
  titles.forEach((title) => {
    artists.forEach((artist) => {
      keys.push(`release:${resolvedChartType}:${title}:${artist}`);
    });
  });
  return uniq(keys);
}

function hashText(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function rowLabel(row, kind) {
  if (kind === "artist") return row?.display_name || row?.name || `Artist #${row?.id || "?"}`;
  const artist = row?.artist_display || row?.artist_name || row?.artist || "";
  return [row?.title || row?.t || `Release #${row?.id || "?"}`, artist].filter(Boolean).join(" by ");
}

function buildRule({ kind, chartType, keeper, duplicate, now }) {
  const duplicateKeys = mergeRuleKeysForRow(duplicate, { kind, chartType }).sort();
  const keeperKeys = mergeRuleKeysForRow(keeper, { kind, chartType }).sort();
  if (!duplicateKeys.length || !keeperKeys.length) return null;
  const id = [
    kind,
    chartType || "all",
    hashText(duplicateKeys.join("|")),
    hashText(keeperKeys.join("|")),
  ].join(":");
  return {
    id,
    kind,
    chartType: chartType || "",
    duplicateKeys,
    keeperKeys,
    duplicateId: normalizeId(duplicate?.id),
    keeperId: normalizeId(keeper?.id),
    duplicateLabel: rowLabel(duplicate, kind),
    keeperLabel: rowLabel(keeper, kind),
    createdAt: now,
    updatedAt: now,
    manualCount: 1,
    useCount: 0,
  };
}

export function loadMergeRules(storage) {
  const target = storageOrNull(storage);
  if (!target) return [];
  try {
    const parsed = JSON.parse(target.getItem(MERGE_RULES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((rule) => rule?.id && rule?.kind) : [];
  } catch {
    return [];
  }
}

function saveMergeRules(rules, storage) {
  const target = storageOrNull(storage);
  if (!target) return;
  try {
    target.setItem(MERGE_RULES_KEY, JSON.stringify(rules.slice(0, MAX_RULES)));
  } catch {}
}

export function rememberMergeRules({ kind, chartType = "", keeper, duplicates = [] }, storage) {
  const resolvedKind = inferKind(keeper, kind);
  const resolvedChartType = resolvedKind === "release" ? inferChartType(keeper, chartType) : "";
  const now = new Date().toISOString();
  const current = new Map(loadMergeRules(storage).map((rule) => [rule.id, rule]));
  duplicates.forEach((duplicate) => {
    const next = buildRule({
      kind: resolvedKind,
      chartType: resolvedChartType,
      keeper,
      duplicate,
      now,
    });
    if (!next) return;
    const existing = current.get(next.id);
    current.set(next.id, {
      ...(existing || {}),
      ...next,
      createdAt: existing?.createdAt || next.createdAt,
      manualCount: Number(existing?.manualCount || 0) + 1,
      useCount: Number(existing?.useCount || 0),
    });
  });
  const rules = [...current.values()].sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
  );
  saveMergeRules(rules, storage);
  return rules;
}

function hasAny(rowKeys, ruleKeys) {
  return ruleKeys.some((key) => rowKeys.has(key));
}

function ruleAppliesToKind(rule, kind, chartType) {
  if (rule.kind !== kind) return false;
  if (kind !== "release") return true;
  return normalizeChartType(rule.chartType) === normalizeChartType(chartType);
}

function resolveKeeper(rule, keyedRows) {
  const byId = keyedRows.find((item) =>
    rule.keeperId &&
    normalizeId(item.row?.id) === normalizeId(rule.keeperId) &&
    hasAny(item.keys, rule.keeperKeys || [])
  );
  if (byId) return byId;

  const matches = keyedRows.filter((item) => hasAny(item.keys, rule.keeperKeys || []));
  return matches.length === 1 ? matches[0] : null;
}

export function findStoredMergeRulePlan(group, rules = []) {
  if (!Array.isArray(group) || group.length < 2 || !Array.isArray(rules) || !rules.length) return null;
  const kind = inferKind(group[0]);
  const chartType = kind === "release" ? inferChartType(group[0]) : "";
  const keyedRows = group.map((row) => ({
    row,
    keys: new Set(mergeRuleKeysForRow(row, { kind, chartType })),
  })).filter((item) => item.keys.size);
  if (keyedRows.length < 2) return null;

  const matches = [];
  rules.forEach((rule) => {
    if (!ruleAppliesToKind(rule, kind, chartType)) return;
    const keeper = resolveKeeper(rule, keyedRows);
    if (!keeper) return;
    const duplicates = keyedRows
      .filter((item) => normalizeId(item.row?.id) !== normalizeId(keeper.row?.id))
      .filter((item) => hasAny(item.keys, rule.duplicateKeys || []))
      .map((item) => item.row);
    if (duplicates.length) matches.push({ rule, keeper: keeper.row, duplicates });
  });
  if (!matches.length) return null;

  const keeperIds = new Set(matches.map((match) => normalizeId(match.keeper?.id)));
  if (keeperIds.size !== 1) return null;

  const duplicateMap = new Map();
  matches.forEach((match) => {
    match.duplicates.forEach((duplicate) => {
      duplicateMap.set(`${kind}:${duplicate.id}`, duplicate);
    });
  });
  const duplicates = [...duplicateMap.values()];
  if (!duplicates.length) return null;

  return {
    keeper: matches[0].keeper,
    duplicates,
    ruleIds: uniq(matches.map((match) => match.rule.id)),
  };
}

export function markMergeRulesApplied(ruleIds = [], storage) {
  const ids = new Set(ruleIds.filter(Boolean));
  if (!ids.size) return loadMergeRules(storage);
  const now = new Date().toISOString();
  const rules = loadMergeRules(storage).map((rule) => {
    if (!ids.has(rule.id)) return rule;
    return {
      ...rule,
      updatedAt: now,
      lastUsedAt: now,
      useCount: Number(rule.useCount || 0) + 1,
    };
  }).sort((left, right) =>
    String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""))
  );
  saveMergeRules(rules, storage);
  return rules;
}

export { MERGE_RULES_KEY };
