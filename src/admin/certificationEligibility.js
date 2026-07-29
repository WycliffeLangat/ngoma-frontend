export const DEFAULT_CERTIFICATION_RULES = [
  { level: "diamond", threshold: 600 },
  { level: "platinum", threshold: 400 },
  { level: "gold", threshold: 200 },
];

export function numericValue(value) {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function truthyValue(value) {
  if (value === true || value === 1) return true;
  if (typeof value === "string") return /^(true|1|yes)$/i.test(value.trim());
  return false;
}

export function normalizeCertificationRules(rows = []) {
  const list = Array.isArray(rows) ? rows : Array.isArray(rows?.results) ? rows.results : [];
  const activeRules = list
    .map((rule) => ({
      level: String(rule.level || "").trim().toLowerCase(),
      threshold: numericValue(rule.threshold),
      active: rule.active,
    }))
    .filter((rule) => rule.active !== false && rule.level && rule.threshold > 0);
  return [...(activeRules.length ? activeRules : DEFAULT_CERTIFICATION_RULES)]
    .sort((left, right) => right.threshold - left.threshold);
}

export function certificationLevelForPoints(points, rules = DEFAULT_CERTIFICATION_RULES) {
  const total = numericValue(points);
  return normalizeCertificationRules(rules).find((rule) => total >= rule.threshold)?.level || null;
}

export function enforceCertificationEligibility(record = {}, rules = DEFAULT_CERTIFICATION_RULES) {
  const points = numericValue(record.total_points ?? record.totalPts ?? record.points);
  const eligibleLevel = certificationLevelForPoints(points, rules);
  const currentLevel = String(record.level || "").trim().toLowerCase();
  const currentHidden = truthyValue(record.is_hidden);

  if (!eligibleLevel) {
    return {
      record: { ...record, is_hidden: true },
      eligibleLevel: null,
      hidden: true,
      levelChanged: false,
      visibilityChanged: !currentHidden,
      changed: !currentHidden,
    };
  }

  const levelChanged = currentLevel !== eligibleLevel;
  return {
    record: { ...record, level: eligibleLevel, is_hidden: currentHidden },
    eligibleLevel,
    hidden: currentHidden,
    levelChanged,
    visibilityChanged: false,
    changed: levelChanged,
  };
}
