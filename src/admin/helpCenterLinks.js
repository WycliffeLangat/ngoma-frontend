const HELP_ERROR_MATCHES = [
  {
    id: "artist-slug-exists",
    title: "Artist slug already exists",
    test: (text, field) => (
      (field === "slug" || text.includes("slug")) &&
      text.includes("artist") &&
      (text.includes("already exists") || text.includes("must be unique"))
    ),
  },
  {
    id: "required-field",
    title: "Required field",
    test: (text) => text.includes("this field is required") || text.includes("required field") || text.includes("may not be blank"),
  },
  {
    id: "permission-denied",
    title: "Permission denied",
    test: (text) => text.includes("not allowed") || text.includes("permission") || text.includes("forbidden") || text.includes("403"),
  },
  {
    id: "not-authenticated",
    title: "Login session issue",
    test: (text) => text.includes("authentication credentials") || text.includes("not authenticated") || text.includes("session") || text.includes("401"),
  },
  {
    id: "network-unreachable",
    title: "Server connection issue",
    test: (text) => text.includes("unable to reach the server") || text.includes("failed to fetch") || text.includes("network"),
  },
  {
    id: "timeout",
    title: "Request timed out",
    test: (text) => text.includes("timed out") || text.includes("timeout"),
  },
  {
    id: "server-error",
    title: "Server error",
    test: (text) => text.includes("server error") || text.includes("500") || text.includes("backend logs"),
  },
  {
    id: "not-found",
    title: "Record not found",
    test: (text) => text.includes("not found") || text.includes("404"),
  },
  {
    id: "invalid-json",
    title: "Invalid JSON",
    test: (text, field) => field?.includes("json") || text.includes("invalid json") || text.includes("json") || text.includes("valid json"),
  },
  {
    id: "invalid-url",
    title: "Invalid URL",
    test: (text, field) => field?.endsWith("_url") || text.includes("valid url") || text.includes("invalid url") || text.includes("enter a valid url"),
  },
  {
    id: "image-upload-failed",
    title: "Image upload failed",
    test: (text) => text.includes("image upload failed") || text.includes("file upload failed") || text.includes("unsupported file"),
  },
  {
    id: "upload-validation-errors",
    title: "Upload validation errors",
    test: (text) => text.includes("validation error") || text.includes("error count") || text.includes("cannot safely publish"),
  },
  {
    id: "upload-validation-warnings",
    title: "Upload validation warnings",
    test: (text) => text.includes("validation warning") || text.includes("warning count"),
  },
  {
    id: "chart-period-duplicate",
    title: "Chart period already exists",
    test: (text) => text.includes("chart period") && text.includes("already exists"),
  },
  {
    id: "publish-disabled",
    title: "Publish is blocked",
    test: (text) => text.includes("publish") && (text.includes("disabled") || text.includes("not publishable") || text.includes("not allowed")),
  },
  {
    id: "certification-below-threshold",
    title: "Certification threshold issue",
    test: (text) => text.includes("certification") && (text.includes("threshold") || text.includes("below")),
  },
  {
    id: "country-code-questionable",
    title: "Country or country code issue",
    test: (text, field) => (
      field === "country" ||
      field === "country_code" ||
      text.includes("country code") ||
      text.includes("release country") ||
      text.includes("does not match lead artist")
    ),
  },
];

export function buildHelpCenterUrl(articleId, options = {}) {
  const section = options.section || "errors";
  const focus = options.focus || "fixes";
  const params = new URLSearchParams({ section, article: articleId, focus });
  return `/cms/help?${params.toString()}#help-${articleId}-${focus}`;
}

export function matchCmsErrorHelp(message, fieldName = "") {
  const text = String(message || "").toLowerCase();
  const field = String(fieldName || "").toLowerCase();
  if (!text && !field) return null;
  const match = HELP_ERROR_MATCHES.find((candidate) => candidate.test(text, field));
  if (!match) return null;
  return {
    ...match,
    section: "errors",
    focus: "fixes",
    href: buildHelpCenterUrl(match.id, { section: "errors", focus: "fixes" }),
  };
}
