import { useEffect, useMemo, useState } from "react";

const ERROR_GUIDES = [
  {
    id: "artist-slug-exists",
    title: "slug: artist with this slug already exists.",
    summary: "Another artist record already uses the same URL-safe slug.",
    meaning: "A slug is the unique text used in public URLs and internal lookups. The CMS cannot save two artists with the same slug because both would point to the same artist page.",
    commonCauses: [
      "The artist already exists and you are accidentally creating a duplicate.",
      "Two different artists have the same or very similar names.",
      "A previous artist was renamed but kept the original slug.",
      "The slug was typed manually instead of being left blank for the CMS to generate.",
    ],
    fixSteps: [
      "Search Artists for the same name, display name, or slug.",
      "If it is the same person, keep the existing artist and merge or delete the duplicate draft.",
      "If it is a different person, change the new slug to a unique version, such as adding a country, group name, or short qualifier.",
      "Save again, then check that songs and albums are linked to the correct artist profile.",
    ],
    prevention: [
      "Leave slug blank when creating a new artist unless there is a specific URL requirement.",
      "Use Duplicate review before creating a second profile for a familiar name.",
      "Avoid changing an established slug after the public page is already in use.",
    ],
    keywords: ["slug", "artist", "already exists", "duplicate", "url", "unique"],
  },
  {
    id: "duplicate-value",
    title: "Already uses this value / already exists",
    summary: "Another record already holds the same unique value (name, slug, key, or combination of fields).",
    meaning: "Many CMS fields must be unique — artist names and slugs, platform names and slugs, country names, news slugs, setting keys, certification levels per release, one chart per month, one content block per page section. The error message now names the exact record and ID that already holds the value, so you can go straight to it.",
    commonCauses: [
      "A record with this value already exists and you are creating an unintended duplicate.",
      "You are trying to reuse a value (slug, key, month/year, page section) that belongs to a different record.",
      "The record you meant to edit already exists — you should update it instead of creating a new one.",
    ],
    fixSteps: [
      "Read the error message — it names the conflicting record and its ID.",
      "Open that record (search by the name or ID shown) to confirm whether it's the one you meant.",
      "If it's the same thing, edit that existing record instead of saving a new one.",
      "If it's a genuinely different record, change the value you're saving to something unique, then save again.",
    ],
    prevention: [
      "Search before creating a new record to check whether it already exists.",
      "Leave auto-generated fields like slug blank unless you need a specific value.",
    ],
    keywords: ["already exists", "already uses", "duplicate", "unique", "slug", "key"],
  },
  {
    id: "general-troubleshooting",
    title: "Any other save or validation error",
    summary: "General steps for an error message that doesn't match a specific guide.",
    meaning: "Not every possible error has its own article. This general guide covers the steps that resolve most CMS validation and save errors.",
    commonCauses: [
      "A required field is missing or blank.",
      "A value doesn't match the expected format (date, number, URL, JSON).",
      "A related record (artist, release, chart) was deleted, unpublished, or doesn't match what's expected.",
      "A permissions or session issue is blocking the save.",
    ],
    fixSteps: [
      "Read the exact wording of the error above each field, and the field it is attached to.",
      "Re-check that field's value against the format implied by the message (required, valid URL, valid JSON, number range, etc.).",
      "If the error names another record (by ID or name), open that record to understand the conflict.",
      "Refresh the page and try again in case of a stale session or an out-of-date record.",
      "If the message mentions a server error or connection issue, wait a moment and retry, then check with an admin if it persists.",
    ],
    prevention: [
      "Save in small steps when entering a lot of data, so an error is easier to isolate.",
      "Use Duplicate review and search before creating new artist, release, or chart records.",
    ],
    keywords: ["error", "validation", "save failed", "troubleshoot"],
  },
  {
    id: "required-field",
    title: "This field is required.",
    summary: "A required field was empty when the CMS tried to save the record.",
    meaning: "Required fields are the minimum information the backend needs to create a valid record, such as artist name, release title, chart year, chart month, chart type, page key, or news category.",
    commonCauses: [
      "The field was skipped.",
      "The value was removed while editing.",
      "A select menu still says Select... instead of an actual value.",
    ],
    fixSteps: [
      "Look for the highlighted field in the form.",
      "Enter the missing value or choose an option.",
      "Save again.",
    ],
    prevention: [
      "Fill the Essentials section first.",
      "For chart periods, always confirm year, month, and chart type before saving.",
    ],
    keywords: ["required", "blank", "missing", "field"],
  },
  {
    id: "permission-denied",
    title: "Your role is not allowed to perform this action.",
    summary: "Your account can view the section, but it cannot complete the requested change.",
    meaning: "CMS permissions are role-based. Some users can review records, some can edit data, some can manage news, and only publishing roles can approve, publish, or roll back protected chart uploads.",
    commonCauses: [
      "The account is read-only.",
      "The user is trying to publish without publishing permission.",
      "The user is editing admin-only areas such as Users, Settings, or Backups.",
    ],
    fixSteps: [
      "Check your role in the top bar.",
      "Ask an admin to perform the action or update your role.",
      "If you only need to review data, use read-only workflows and avoid save or publish actions.",
    ],
    prevention: [
      "Give editors the narrowest role that matches their work.",
      "Reserve publish permissions for people who own final chart releases.",
    ],
    keywords: ["permission", "role", "read only", "publish", "403", "allowed"],
  },
  {
    id: "not-authenticated",
    title: "Authentication credentials were not provided.",
    summary: "The CMS request reached the backend without a valid logged-in session.",
    meaning: "Your browser session may have expired, cookies may be blocked, or the backend restarted and cleared the session.",
    commonCauses: [
      "The CMS tab was open for a long time.",
      "The browser blocked cookies.",
      "The backend session expired.",
    ],
    fixSteps: [
      "Sign out, then sign in again.",
      "Refresh the CMS tab.",
      "If it repeats, check that browser cookies are allowed for this site.",
    ],
    prevention: [
      "Save important form edits before stepping away.",
      "Use one active CMS tab for editing when possible.",
    ],
    keywords: ["auth", "login", "credentials", "session", "401"],
  },
  {
    id: "network-unreachable",
    title: "Unable to reach the server. Check your connection and try again.",
    summary: "The CMS could not contact the backend API.",
    meaning: "This is usually a connection issue, a stopped backend server, a deployment outage, or an incorrect API base URL.",
    commonCauses: [
      "Internet connection dropped.",
      "The backend server is not running.",
      "The API domain or local port is unavailable.",
      "A browser extension or firewall blocked the request.",
    ],
    fixSteps: [
      "Refresh the page and try the action again.",
      "Check whether the public site and CMS dashboard can load data.",
      "If working locally, confirm the backend server is running.",
      "If deployed, check the hosting or backend logs.",
    ],
    prevention: [
      "Avoid uploading charts while the connection is unstable.",
      "Keep backend health checks visible during chart operations.",
    ],
    keywords: ["network", "server", "connection", "failed to fetch", "api"],
  },
  {
    id: "timeout",
    title: "The request timed out. Check your connection and try again.",
    summary: "The backend did not respond before the CMS timeout ended.",
    meaning: "Large imports, publishing actions, or slow network conditions can take longer than normal. The CMS stops waiting so the interface does not hang forever.",
    commonCauses: [
      "A large workbook is being processed.",
      "The backend is busy recalculating chart rankings.",
      "The connection is slow or unstable.",
    ],
    fixSteps: [
      "Wait a short moment and refresh the affected page.",
      "Check whether the upload or record actually completed.",
      "Retry only if the record did not change.",
      "For repeated publish timeouts, check backend logs before trying again.",
    ],
    prevention: [
      "Keep uploaded files tidy and limited to the required sheets.",
      "Avoid repeatedly clicking publish or save while a request is running.",
    ],
    keywords: ["timeout", "slow", "upload", "publish", "request"],
  },
  {
    id: "server-error",
    title: "Server error (500) - check backend logs.",
    summary: "The backend hit an unexpected error while processing the request.",
    meaning: "A 500 is not a normal validation error. It usually means the backend code, data shape, database, file storage, or external service needs inspection.",
    commonCauses: [
      "Unexpected data format.",
      "A missing database relation.",
      "A file field received an unsupported value.",
      "A backend bug or unhandled edge case.",
    ],
    fixSteps: [
      "Do not keep retrying the same action many times.",
      "Capture the page, record ID, and action that triggered it.",
      "Check backend logs for the stack trace.",
      "Fix the data or backend issue, then retry once.",
    ],
    prevention: [
      "Use validation warnings before publish.",
      "Keep JSON fields valid and file uploads within allowed size and type.",
    ],
    keywords: ["500", "server", "backend logs", "error"],
  },
  {
    id: "not-found",
    title: "Not found.",
    summary: "The CMS asked for a record that the backend could not find.",
    meaning: "The record may have been deleted, merged, archived, or the URL may contain an outdated ID.",
    commonCauses: [
      "Another editor deleted or merged the record.",
      "A dashboard alert pointed to an old record ID.",
      "The browser is on an old CMS route.",
    ],
    fixSteps: [
      "Refresh the page.",
      "Search for the record by name instead of ID.",
      "Check Audit log if you need to know what happened.",
      "If it was merged, use the kept record.",
    ],
    prevention: [
      "Refresh shared CMS views before acting on old alerts.",
      "Use merge notes and audit logs when cleaning duplicates.",
    ],
    keywords: ["404", "not found", "deleted", "merged", "missing"],
  },
  {
    id: "invalid-json",
    title: "Invalid JSON.",
    summary: "A JSON field contains text the backend cannot parse as JSON.",
    meaning: "JSON fields must use a valid JSON object or array. Quotes, commas, braces, and brackets must be exact.",
    commonCauses: [
      "Single quotes were used instead of double quotes.",
      "A trailing comma was left at the end of an object or array.",
      "Plain text was entered into a JSON field.",
      "The field was meant to be empty but contains partial JSON.",
    ],
    fixSteps: [
      "Use an object like {\"key\":\"value\"} or an array like [\"tag one\",\"tag two\"].",
      "Remove trailing commas.",
      "Leave the field empty if there is no structured data.",
      "Save again.",
    ],
    prevention: [
      "Use Tags fields for simple comma-separated names when available.",
      "Keep JSON fields for structured data only.",
    ],
    keywords: ["json", "aliases", "tags", "gallery", "settings", "methodology"],
  },
  {
    id: "invalid-url",
    title: "Enter a valid URL.",
    summary: "A link field is not formatted as a complete web address.",
    meaning: "Platform and social links should normally start with http:// or https:// and point to the exact artist, release, article, or source page.",
    commonCauses: [
      "The link is missing https://.",
      "The value is a handle instead of a URL.",
      "Extra spaces were pasted before or after the link.",
    ],
    fixSteps: [
      "Open the destination in a browser.",
      "Copy the full URL from the address bar.",
      "Paste it into the CMS field and remove extra spaces.",
      "Save again.",
    ],
    prevention: [
      "Use canonical artist or release links, not search result URLs.",
      "Check dashboard Invalid URLs alerts regularly.",
    ],
    keywords: ["url", "link", "spotify", "youtube", "apple", "invalid"],
  },
  {
    id: "image-upload-failed",
    title: "Record saved, but image upload failed.",
    summary: "The non-file fields were saved, but the image or file upload step failed.",
    meaning: "The CMS saves text fields first and uploads files second. If the file step fails, the record can exist without the new image.",
    commonCauses: [
      "The file is too large.",
      "The file type is not supported.",
      "The upload connection dropped.",
      "Storage rejected the file.",
    ],
    fixSteps: [
      "Open the saved record again.",
      "Use a JPEG or PNG within the listed size limit.",
      "Upload the image again.",
      "If it fails repeatedly, check storage and backend logs.",
    ],
    prevention: [
      "Use square artist images and release covers at the recommended dimensions.",
      "Compress very large images before uploading.",
    ],
    keywords: ["image", "file", "upload", "cover", "artist image"],
  },
  {
    id: "upload-validation-errors",
    title: "Upload validation errors.",
    summary: "A chart upload contains rows the CMS cannot safely publish.",
    meaning: "Validation errors are blocking issues in imported chart data. They must be fixed in the workbook or CMS records before approval or publishing.",
    commonCauses: [
      "Required columns such as rank, title, or artist are missing.",
      "Ranks are duplicated or out of range.",
      "The workbook contains blank rows in the chart area.",
      "A platform, chart type, month, or release reference cannot be matched.",
    ],
    fixSteps: [
      "Open the upload validation summary.",
      "Review the listed row numbers and messages.",
      "Open the workbook editor or source spreadsheet.",
      "Fix the rows, save the workbook, then re-run validation or upload again.",
    ],
    prevention: [
      "Keep import templates consistent.",
      "Validate before publish.",
      "Do not publish uploads with non-zero error counts.",
    ],
    keywords: ["upload", "validation", "errors", "workbook", "import"],
  },
  {
    id: "upload-validation-warnings",
    title: "Upload validation warnings.",
    summary: "The upload may be publishable, but something looks unusual.",
    meaning: "Warnings are not always blockers. They point to data that should be reviewed, such as missing optional metadata, unusual rank movement, or unmatched enrichment.",
    commonCauses: [
      "A release exists but has incomplete metadata.",
      "A row uses a spelling that differs from the CMS record.",
      "A platform chart is shorter than expected.",
    ],
    fixSteps: [
      "Read each warning before approval.",
      "Fix metadata if the warning affects public quality.",
      "Document intentional exceptions in notes when available.",
      "Proceed only when the warnings are understood.",
    ],
    prevention: [
      "Use consistent artist and release names in imports.",
      "Keep artist country and release metadata complete.",
    ],
    keywords: ["warning", "upload", "validation", "review"],
  },
  {
    id: "chart-period-duplicate",
    title: "Chart period already exists.",
    summary: "A chart period for that year, month, and chart type already exists.",
    meaning: "There should only be one Singles chart period and one Albums chart period per month. Duplicate periods would split entries and confuse publishing state.",
    commonCauses: [
      "A chart period was already created from an upload.",
      "The same month was entered twice.",
      "The chart type was selected incorrectly.",
    ],
    fixSteps: [
      "Search Chart periods for the same year and month.",
      "Open the existing period instead of creating a new one.",
      "If you created the wrong chart type, edit or delete the incorrect draft if your role allows it.",
    ],
    prevention: [
      "Check Chart periods before creating a new month manually.",
      "Let final chart imports create or update periods where possible.",
    ],
    keywords: ["chart period", "duplicate", "month", "year", "already exists"],
  },
  {
    id: "publish-disabled",
    title: "Publish button is disabled.",
    summary: "The upload or chart is not in a publishable state.",
    meaning: "Publishing is protected because it changes public chart data. The CMS disables publishing until validation, approval, permissions, and chart state line up.",
    commonCauses: [
      "Validation errors are still present.",
      "The upload has not been approved.",
      "Your role does not have publishing permission.",
      "The chart period is missing required entries.",
    ],
    fixSteps: [
      "Open the validation summary and confirm error count is zero.",
      "Approve the upload if your role allows it.",
      "Ask a publisher to publish if you do not have permission.",
      "Check Chart entries for missing combined rankings.",
    ],
    prevention: [
      "Use the upload workflow in order: import, validate, approve, publish.",
      "Keep roles separate between data editing and final publishing when possible.",
    ],
    keywords: ["publish", "disabled", "approval", "validation", "permission"],
  },
  {
    id: "certification-below-threshold",
    title: "Certification is below threshold.",
    summary: "The selected certification level does not match the release's point total.",
    meaning: "The CMS expects certification levels to follow the active certification rules. In the current CMS logic, Gold starts at 200 points, Platinum at 400, and Diamond at 600.",
    commonCauses: [
      "The level was selected manually before points were updated.",
      "Certification rules changed.",
      "The release points are incomplete or stale.",
    ],
    fixSteps: [
      "Check the release total points.",
      "Choose the highest level the points actually qualify for.",
      "If the rules changed, update Certification rules first.",
      "Save the certification again.",
    ],
    prevention: [
      "Review Data quality alerts for certifications.",
      "Keep Certification rules active and current.",
    ],
    keywords: ["certification", "gold", "platinum", "diamond", "threshold", "points"],
  },
  {
    id: "country-code-questionable",
    title: "Questionable country or country code.",
    summary: "An artist, release, or country code does not line up with expected country data.",
    meaning: "The CMS uses artist country information for release ownership, Kenyan charts, regional analysis, and chart filtering. A release country normally follows the lead artist.",
    commonCauses: [
      "The artist country is missing.",
      "The country code is not a recognized ISO-style code.",
      "A release has a country that differs from the lead artist.",
      "The lead artist was changed after release country was set.",
    ],
    fixSteps: [
      "Open the lead artist record.",
      "Set the correct country and country code.",
      "Save the artist so linked releases can inherit the correct country.",
      "Review any remaining Data quality alerts.",
    ],
    prevention: [
      "Enter artist country before adding releases.",
      "Use country code consistently, such as KE for Kenya.",
    ],
    keywords: ["country", "country code", "kenyan", "artist", "release"],
  },
];

const GLOSSARY_TERMS = [
  {
    id: "slug",
    title: "Slug",
    summary: "A URL-safe identifier, usually lowercase words separated by hyphens.",
    meaning: "Example: an artist named Fik Fameica may use the slug fik-fameica. Slugs must be unique within the resource type.",
    related: ["artist", "news", "platform", "page URL"],
    keywords: ["slug", "url", "identifier"],
  },
  {
    id: "artist-profile",
    title: "Artist profile",
    summary: "The canonical CMS record for a performer, group, or credited act.",
    meaning: "Artist profiles hold names, country, genre, image, biography, links, verification state, and release relationships.",
    related: ["display name", "verified", "country"],
    keywords: ["artist", "profile", "performer"],
  },
  {
    id: "display-name",
    title: "Display name",
    summary: "The public-facing spelling of an artist name.",
    meaning: "Use it when the public name needs different casing, punctuation, or spacing from the canonical artist name. If blank, the CMS can fall back to Artist name.",
    related: ["artist name", "slug"],
    keywords: ["display", "name", "artist"],
  },
  {
    id: "aliases-json",
    title: "Aliases JSON",
    summary: "Structured alternate names for an artist.",
    meaning: "Use aliases for previous names, spelling variants, or search helper names. Keep the value valid JSON.",
    related: ["JSON", "artist search", "duplicates"],
    keywords: ["aliases", "json", "artist"],
  },
  {
    id: "verified",
    title: "Verified artist",
    summary: "A flag that marks an artist profile as reviewed and trusted.",
    meaning: "Verification is useful for profiles that have chart activity or public visibility. It tells editors the identity, country, image, and links have been checked.",
    related: ["data quality", "artist profile"],
    keywords: ["verified", "artist", "reviewed"],
  },
  {
    id: "release",
    title: "Release",
    summary: "A song or album record in the music library.",
    meaning: "Releases hold title, chart type, artists, country, cover image, label, distributor, IDs, links, and status.",
    related: ["song", "album", "chart entry"],
    keywords: ["release", "song", "album"],
  },
  {
    id: "canonical-title",
    title: "Canonical title",
    summary: "The normalized title the CMS can use for matching and duplicate detection.",
    meaning: "Use it when the display title includes styling, punctuation, featured text, or alternate spellings that make matching harder.",
    related: ["duplicate review", "release"],
    keywords: ["canonical", "title", "matching"],
  },
  {
    id: "primary-artists",
    title: "Main artists",
    summary: "The ordered lead artist credits for a song or album.",
    meaning: "The first main artist is treated as the lead. Release country and country code usually follow that first artist.",
    related: ["lead artist", "country", "featured artists"],
    keywords: ["main artist", "primary", "lead"],
  },
  {
    id: "featured-artists",
    title: "Featured artists",
    summary: "The ordered featured credits for a release.",
    meaning: "Featured artists display after the main artists and should link to artist profiles when possible.",
    related: ["unlinked featured names", "artist profile"],
    keywords: ["featured", "ft", "featuring"],
  },
  {
    id: "unlinked-featured",
    title: "Unlinked featured names",
    summary: "Text-only featured credits used when an artist profile does not exist yet.",
    meaning: "Use this as a fallback, not the ideal final state. Create or link artist profiles later so charts, artist pages, and duplicate checks stay accurate.",
    related: ["featured artists", "artist profile"],
    keywords: ["unlinked", "featured", "fallback"],
  },
  {
    id: "isrc",
    title: "ISRC",
    summary: "International Standard Recording Code for a specific recording.",
    meaning: "Use ISRC to identify a song recording across platforms and reduce duplicate release records.",
    related: ["song", "metadata", "duplicate review"],
    keywords: ["isrc", "recording", "identifier"],
  },
  {
    id: "upc",
    title: "UPC",
    summary: "Universal Product Code for an album or product release.",
    meaning: "UPC helps identify albums or packaged releases across distributors and platforms.",
    related: ["album", "metadata"],
    keywords: ["upc", "album", "identifier"],
  },
  {
    id: "chart-period",
    title: "Chart period",
    summary: "A specific chart month and chart type, such as Singles for July 2026.",
    meaning: "Chart periods group chart entries, upload state, approval state, and publishing state for a month.",
    related: ["chart entries", "final chart", "publish"],
    keywords: ["chart", "period", "month", "year"],
  },
  {
    id: "chart-entry",
    title: "Chart entry",
    summary: "One ranked release inside a chart period, platform chart, or combined chart.",
    meaning: "Entries contain rank, previous rank, peak, weeks, points, platform, movement, and the linked release.",
    related: ["rank", "points", "platform"],
    keywords: ["entry", "rank", "chart"],
  },
  {
    id: "platform",
    title: "Platform",
    summary: "A chart source such as a streaming, video, radio, or discovery service.",
    meaning: "Platform records control display name, colors, chart sizes, supported chart types, and point settings.",
    related: ["source chart size", "points base"],
    keywords: ["platform", "spotify", "youtube", "boomplay"],
  },
  {
    id: "source-chart-size",
    title: "Source chart size",
    summary: "The number of rows expected from a platform's source chart.",
    meaning: "This helps validation detect short, incomplete, or malformed source uploads.",
    related: ["platform", "upload validation"],
    keywords: ["chart size", "source", "platform"],
  },
  {
    id: "points-base",
    title: "Points base",
    summary: "The starting point value used to convert ranks into chart points.",
    meaning: "Higher ranks receive more points. The exact scoring is controlled by platform settings and active methodology.",
    related: ["methodology", "combined chart"],
    keywords: ["points", "base", "ranking"],
  },
  {
    id: "combined-chart",
    title: "Combined chart",
    summary: "The aggregate chart created from multiple platform inputs.",
    meaning: "The combined chart is the main cross-platform ranking after platform rows are validated, weighted, and merged under the active methodology.",
    related: ["methodology", "platform", "points"],
    keywords: ["combined", "chart", "ranking"],
  },
  {
    id: "kenyan-chart",
    title: "Kenyan chart",
    summary: "A country-filtered view for Kenyan artists or Kenyan releases.",
    meaning: "Kenyan charts rely on accurate artist country and country code. Missing or wrong artist country can exclude a release from the correct view.",
    related: ["country code", "artist country"],
    keywords: ["kenyan", "country", "chart"],
  },
  {
    id: "workflow-status",
    title: "Workflow status",
    summary: "The review state of workflow records such as charts, uploads, and news.",
    meaning: "Common values include draft, pending review, approved, published, rejected, and archived.",
    related: ["draft", "published", "approved"],
    keywords: ["status", "workflow", "published"],
  },
  {
    id: "record-status",
    title: "Record status",
    summary: "The visibility or lifecycle state of artists, songs, and albums.",
    meaning: "Common values are active, draft, and inactive. Use merge or delete for records that should not exist.",
    related: ["artist", "release", "inactive"],
    keywords: ["active", "draft", "inactive", "status"],
  },
  {
    id: "certification",
    title: "Certification",
    summary: "A milestone award based on chart points.",
    meaning: "Certifications can be hidden, unofficial, or official. Official certifications should have dates and match the active thresholds.",
    related: ["Gold", "Platinum", "Diamond"],
    keywords: ["certification", "points", "award"],
  },
  {
    id: "methodology",
    title: "Ranking methodology",
    summary: "The active scoring rules used to calculate chart rankings.",
    meaning: "Methodology records store structured configuration for chart weighting, ranking, and calculation behavior.",
    related: ["points", "combined chart", "platform"],
    keywords: ["methodology", "ranking", "scoring"],
  },
  {
    id: "data-quality-report",
    title: "Data quality report",
    summary: "A CMS issue record that tracks incomplete, inconsistent, or risky data.",
    meaning: "Reports help editors prioritize fixes across artists, releases, countries, uploads, certifications, URLs, media, and chart state.",
    related: ["dashboard alerts", "audit"],
    keywords: ["reports", "data quality", "alerts"],
  },
  {
    id: "audit-log",
    title: "Audit log",
    summary: "The record of CMS actions and edits.",
    meaning: "Use Audit log to understand who changed what and when, especially after deletes, merges, publishing, or unexpected data changes.",
    related: ["users", "roles", "backups"],
    keywords: ["audit", "history", "log"],
  },
  {
    id: "backup",
    title: "Backup",
    summary: "A saved snapshot or export used for recovery.",
    meaning: "Backups protect against accidental data loss and should be checked before risky operations or major publishing work.",
    related: ["audit log", "settings"],
    keywords: ["backup", "restore", "recovery"],
  },
  {
    id: "page-content",
    title: "Page content",
    summary: "CMS-managed text and structured data for public site sections.",
    meaning: "Page content controls public copy, section visibility, ordering, and optional structured data without changing frontend code.",
    related: ["public content", "settings"],
    keywords: ["page content", "copy", "public site"],
  },
  {
    id: "media-library",
    title: "Media library",
    summary: "Reusable files for public content and CMS records.",
    meaning: "Media records should include title, folder, alt text, and usage notes so images remain searchable and accessible.",
    related: ["alt text", "news", "page content"],
    keywords: ["media", "image", "file"],
  },
  {
    id: "seo",
    title: "SEO title and description",
    summary: "Search-friendly metadata for news and public pages.",
    meaning: "Use concise, accurate text that describes the public page. Avoid stuffing keywords or duplicating the same metadata everywhere.",
    related: ["news", "page content"],
    keywords: ["seo", "title", "description"],
  },
];

const WORKFLOWS = [
  {
    id: "create-artist",
    title: "Create a clean artist profile",
    summary: "Use this when adding a new performer, group, or credited act.",
    steps: [
      "Search Artists first to avoid duplicates.",
      "Add Artist name and optional Display name.",
      "Leave Slug blank unless a specific public URL is required.",
      "Set country, country code, city or region, genre, and artist type.",
      "Upload a square artist image when available.",
      "Add official platform and social URLs.",
      "Mark Verified only after the identity and metadata are reviewed.",
    ],
    checks: [
      "No duplicate artist appears in Duplicate review.",
      "Country and country code are filled in.",
      "Public image and key links are valid.",
    ],
    keywords: ["artist", "create", "profile", "slug"],
  },
  {
    id: "fix-duplicate-slug",
    title: "Fix a duplicate artist slug",
    summary: "Use this when saving an artist shows the duplicate slug error.",
    steps: [
      "Copy the slug from the error field.",
      "Search Artists for that slug or the same name.",
      "If the existing record is the same artist, use that record and merge duplicate data where needed.",
      "If the existing record is a different artist, edit the new slug to a unique value.",
      "Save, then confirm releases are credited to the intended artist.",
    ],
    checks: [
      "Only one profile exists for the same artist identity.",
      "The public URL points to the intended artist.",
      "No release credits moved to the wrong profile.",
    ],
    keywords: ["slug", "duplicate", "artist", "merge"],
  },
  {
    id: "add-release",
    title: "Add a song or album",
    summary: "Use this when creating a release record before charting or news coverage.",
    steps: [
      "Open Songs or Albums.",
      "Add the title and choose ordered Main artists.",
      "Add ordered Featured artists or temporary unlinked featured names.",
      "Confirm chart type is singles or albums.",
      "Fill release year, release date, ISRC or UPC, label, distributor, and genre.",
      "Upload a square cover image.",
      "Save and verify country inherited from the first main artist.",
    ],
    checks: [
      "Lead artist is first in Main artists.",
      "Country and country code match the lead artist.",
      "Cover image is present for public-facing records.",
    ],
    keywords: ["song", "album", "release", "main artist", "cover"],
  },
  {
    id: "weekly-upload",
    title: "Import raw weekly chart data",
    summary: "Use this for source data that should be staged before final monthly publishing.",
    steps: [
      "Open Imports & uploads.",
      "Choose Raw weekly import.",
      "Select chart type, year, month, week, and workbook file.",
      "Upload and wait for processing.",
      "Open the processing result and fix any errors or warnings.",
      "Use workbook preview when you need to inspect the uploaded sheets.",
    ],
    checks: [
      "The upload processed successfully.",
      "The row count is not zero.",
      "Errors and warnings are understood before using the data downstream.",
    ],
    keywords: ["weekly", "upload", "raw", "workbook"],
  },
  {
    id: "final-chart-upload",
    title: "Import a final chart",
    summary: "Use this for the reviewed chart data that can become public.",
    steps: [
      "Open Imports & uploads.",
      "Choose Final chart import.",
      "Select chart type, year, month, platform, and file.",
      "Upload and review the validation summary.",
      "Fix every error before approval.",
      "Approve only when row counts, ranks, and releases are correct.",
      "Publish only after approval and final editorial review.",
    ],
    checks: [
      "Validation error count is zero.",
      "Combined and platform entries look correct.",
      "The chart period status matches the intended publication state.",
    ],
    keywords: ["final", "chart", "publish", "validation"],
  },
  {
    id: "review-publish-chart",
    title: "Review and publish a chart",
    summary: "Use this before a chart goes live on the public site.",
    steps: [
      "Open Chart entries for the month and chart type.",
      "Review Combined, Kenyan, and platform tabs.",
      "Check rank gaps, duplicate ranks, missing covers, and unexpected artist credits.",
      "Open Imports & uploads and confirm validation is clean.",
      "Approve the final upload.",
      "Publish from the upload workflow if your role allows it.",
      "Use Refresh public preview to prompt open public tabs to refetch data.",
    ],
    checks: [
      "No dashboard critical issues remain for the chart.",
      "The latest chart month updates as expected.",
      "Public preview reflects the published data.",
    ],
    keywords: ["review", "publish", "chart entries", "preview"],
  },
  {
    id: "merge-duplicates",
    title: "Merge duplicate artists or releases",
    summary: "Use this when two records represent the same artist, song, or album.",
    steps: [
      "Open Duplicate review or select duplicate rows in a resource table.",
      "Choose the keeper record with the best metadata, image, and links.",
      "Review which duplicate records will be merged into the keeper.",
      "Run the merge.",
      "Open the keeper and confirm credits, releases, aliases, and images look right.",
    ],
    checks: [
      "The keeper has the correct public name and slug.",
      "Chart entries and release credits point to the keeper.",
      "No unrelated artist or release was merged.",
    ],
    keywords: ["merge", "duplicate", "keeper", "artist", "release"],
  },
  {
    id: "bulk-country-edit",
    title: "Bulk edit artist countries",
    summary: "Use this when multiple artist profiles need the same country fix.",
    steps: [
      "Filter or search Artists.",
      "Select the artists that need the same country update.",
      "Use bulk edit country.",
      "Enter country and country code.",
      "Save and review releases connected to those artists.",
    ],
    checks: [
      "Every selected artist really belongs to the same country.",
      "Country code uses the expected short code.",
      "Linked releases inherited the country correctly.",
    ],
    keywords: ["bulk", "country", "artist", "country code"],
  },
  {
    id: "publish-news",
    title: "Create and publish a news article",
    summary: "Use this for chart news, milestones, interviews, announcements, and editorial content.",
    steps: [
      "Open News.",
      "Add headline, slug, category, author, excerpt, and body.",
      "Link related artist or release when relevant.",
      "Add cover image, gallery JSON, source links, tags, and SEO fields.",
      "Use Featured, Pinned, or Breaking only when editorially justified.",
      "Set Published and status when ready.",
    ],
    checks: [
      "Headline and slug are unique.",
      "Cover image and alt context are appropriate.",
      "Source links are valid and relevant.",
    ],
    keywords: ["news", "article", "publish", "seo"],
  },
  {
    id: "certify-release",
    title: "Add or review a certification",
    summary: "Use this when a release qualifies for Gold, Platinum, or Diamond.",
    steps: [
      "Open Certifications.",
      "Select the release ID.",
      "Choose the level that matches total points.",
      "Set official and hidden flags intentionally.",
      "Add certification date and notes.",
      "Save and review Data quality alerts.",
    ],
    checks: [
      "Gold is at least 200 points.",
      "Platinum is at least 400 points.",
      "Diamond is at least 600 points.",
      "Official certifications have dates.",
    ],
    keywords: ["certification", "gold", "platinum", "diamond", "points"],
  },
  {
    id: "methodology-update",
    title: "Update ranking methodology",
    summary: "Use this when scoring rules, weights, or ranking behavior changes.",
    steps: [
      "Open Ranking methodology.",
      "Create a new version instead of overwriting history when rules materially change.",
      "Enter valid Methodology JSON.",
      "Activate only one methodology version.",
      "Run chart checks after changing active methodology.",
    ],
    checks: [
      "Only one methodology is active.",
      "The JSON is valid.",
      "Recent charts still calculate as expected.",
    ],
    keywords: ["methodology", "ranking", "json", "active"],
  },
  {
    id: "public-content",
    title: "Update public page content",
    summary: "Use this when editing public site copy or structured page sections.",
    steps: [
      "Open Page content.",
      "Choose the page and section.",
      "Edit title, content, section data JSON, visibility, and display order.",
      "Save, then refresh public preview.",
      "Check mobile and desktop display if the section is public.",
    ],
    checks: [
      "Visible sections have content.",
      "Display order is intentional.",
      "Section data JSON is valid.",
    ],
    keywords: ["page content", "public", "copy", "json"],
  },
];

const METHODOLOGY_NOTES = [
  {
    id: "ranking-methodology-basics",
    title: "How ranking methodology works",
    summary: "The active methodology defines how source chart rows become comparable chart points.",
    meaning: "Platform entries are validated, converted into points, combined by release, then ranked into final views. Methodology records let the team adjust rules while preserving a version history.",
    principles: [
      "Use one active methodology at a time.",
      "Keep methodology JSON valid and documented.",
      "Review historical chart effects after major methodology changes.",
    ],
    keywords: ["methodology", "ranking", "points", "combined"],
  },
  {
    id: "points-and-ranks",
    title: "Points and ranks",
    summary: "Ranks determine points; points determine combined position.",
    meaning: "A higher source rank should contribute more points than a lower rank. Platform settings such as points base and chart size influence how much each row contributes.",
    principles: [
      "Rank 1 should be the strongest row in a source chart.",
      "Duplicate or missing ranks can distort points.",
      "Zero-row uploads should never be treated as valid final data.",
    ],
    keywords: ["points", "rank", "source chart"],
  },
  {
    id: "country-methodology",
    title: "Country ownership methodology",
    summary: "Release country follows the first main artist unless explicitly corrected by backend rules.",
    meaning: "Country ownership powers Kenyan charts, regional analysis, and data quality checks. The safest fix is usually to correct the artist country, then let linked releases inherit it.",
    principles: [
      "Set country on artists before adding releases.",
      "Keep country code uppercase and consistent.",
      "Review country mismatch alerts before publishing country-specific views.",
    ],
    keywords: ["country", "kenyan", "artist", "release"],
  },
  {
    id: "certification-methodology",
    title: "Certification methodology",
    summary: "Certifications are tied to point thresholds and official review.",
    meaning: "The CMS currently checks Gold at 200 points, Platinum at 400, and Diamond at 600. Rules can be managed in Certification rules.",
    principles: [
      "Do not mark a certification official until points and date are reviewed.",
      "Hide certifications that are being prepared but should not appear publicly.",
      "Keep Certification rules aligned with editorial policy.",
    ],
    keywords: ["certification", "gold", "platinum", "diamond"],
  },
  {
    id: "duplicate-methodology",
    title: "Duplicate detection methodology",
    summary: "Duplicate review compares normalized names, aliases, identifiers, and release metadata.",
    meaning: "The CMS tries to group likely duplicates, but editors still decide the keeper. A merge should preserve the best public identity and move related chart data safely.",
    principles: [
      "Prefer the record with the best metadata as keeper.",
      "Use ISRC, UPC, artist credits, and covers to confirm release duplicates.",
      "Do not merge records that only look similar but represent different works or people.",
    ],
    keywords: ["duplicate", "merge", "keeper", "isrc", "upc"],
  },
  {
    id: "status-methodology",
    title: "Status methodology",
    summary: "Statuses protect public quality by separating drafts, review, approval, and publication.",
    meaning: "Record status controls library lifecycle, while workflow status controls review state for charts, uploads, and news. Publishing should happen only after validation and editorial review.",
    principles: [
      "Use draft for unfinished records.",
      "Use approved only after review.",
      "Use published only for records intended to be public.",
    ],
    keywords: ["status", "draft", "approved", "published"],
  },
  {
    id: "data-quality-methodology",
    title: "Data quality methodology",
    summary: "The dashboard combines backend alerts and deeper client-side audits.",
    meaning: "Quality checks scan for missing metadata, duplicate records, invalid URLs, questionable countries, missing media, upload issues, and certification inconsistencies.",
    principles: [
      "Fix critical issues before chart publication.",
      "Treat warnings as review prompts, not automatic blockers.",
      "Use Audit log when a record changed unexpectedly.",
    ],
    keywords: ["data quality", "audit", "alerts", "reports"],
  },
  {
    id: "public-preview-methodology",
    title: "Public preview refresh methodology",
    summary: "The CMS can notify open public preview tabs to fetch fresh data.",
    meaning: "After saving CMS changes, use Refresh public preview when a public tab is already open and needs to pick up newly published data.",
    principles: [
      "Refresh public preview after publish or important content edits.",
      "Use browser refresh if a tab was opened before major changes.",
      "If public data still looks stale, verify the backend export or public payload.",
    ],
    keywords: ["preview", "public", "refresh", "published"],
  },
];

const FAQS = [
  {
    id: "slug-faq",
    title: "Should I type slugs manually?",
    summary: "Usually no. Leave the slug blank unless there is a specific URL requirement.",
    answer: "The CMS can generate a slug from the artist name or title. Manual slugs are useful for planned public URLs, but they also increase the chance of collisions or accidental URL changes.",
    keywords: ["slug", "manual", "url"],
  },
  {
    id: "change-slug-public",
    title: "Can I change a slug after publication?",
    summary: "Only when you intentionally want to change the public URL.",
    answer: "Changing a published slug can break old links or bookmarks unless the backend handles redirects. Prefer keeping established slugs stable.",
    keywords: ["slug", "public", "url", "change"],
  },
  {
    id: "same-artist-twice",
    title: "What if the same artist appears twice?",
    summary: "Use Duplicate review or merge tools instead of keeping both profiles.",
    answer: "Pick the better profile as keeper, merge the duplicate, then confirm releases and chart entries point to the keeper.",
    keywords: ["duplicate", "artist", "merge"],
  },
  {
    id: "different-artists-same-name",
    title: "What if two different artists have the same name?",
    summary: "Keep separate artist profiles, but give each a unique slug and clear metadata.",
    answer: "Use country, city, biography, image, and links to distinguish them. Slugs can include a qualifier, such as a country code or known group name.",
    keywords: ["same name", "artist", "slug"],
  },
  {
    id: "lead-artist-country",
    title: "Why did release country change after editing artists?",
    summary: "Release country follows the first main artist.",
    answer: "The backend cascades an artist country update onto releases where that artist is the lead. This keeps country charts and regional views consistent.",
    keywords: ["country", "artist", "release"],
  },
  {
    id: "featured-no-profile",
    title: "What if a featured artist does not have a profile yet?",
    summary: "Use Unlinked featured names temporarily, then create or link the artist later.",
    answer: "Linked artist profiles are better for public pages, search, chart summaries, and duplicate review. The unlinked field is a fallback for incomplete data.",
    keywords: ["featured", "unlinked", "artist"],
  },
  {
    id: "image-size",
    title: "What image sizes should I use?",
    summary: "Use square images for artists and releases.",
    answer: "Artist images should be square and at least 800 by 800 pixels. Release covers should be square and at least 1000 by 1000 pixels. Keep files within the size limit shown in the form.",
    keywords: ["image", "cover", "artist image"],
  },
  {
    id: "json-empty",
    title: "Can I leave JSON fields empty?",
    summary: "Yes, if there is no structured data to store.",
    answer: "Empty is better than invalid JSON. If you do add data, use proper JSON syntax with double quotes and no trailing commas.",
    keywords: ["json", "empty", "invalid"],
  },
  {
    id: "save-succeeded-image-failed",
    title: "Why did text save but image fail?",
    summary: "The CMS saves text first and uploads files second.",
    answer: "Open the record again and retry the image upload with a supported file. The record itself may already be saved.",
    keywords: ["image", "upload", "saved"],
  },
  {
    id: "warnings-block-publish",
    title: "Do warnings block publishing?",
    summary: "Warnings are review prompts; errors are blockers.",
    answer: "Warnings may still matter for public quality, but they are not the same as validation errors. Read them before approval and decide whether they need fixes.",
    keywords: ["warnings", "publish", "validation"],
  },
  {
    id: "zero-row-upload",
    title: "Why is a zero-row upload a problem?",
    summary: "It means the CMS did not find usable chart rows.",
    answer: "A zero-row upload usually indicates a wrong sheet, wrong format, empty file, or parsing problem. It should be fixed before approval or publish.",
    keywords: ["zero rows", "upload", "workbook"],
  },
  {
    id: "publish-permission",
    title: "Why can I edit but not publish?",
    summary: "Publishing is a separate permission.",
    answer: "The CMS separates data editing from public release actions. Ask a publisher or admin to approve and publish if your role does not include that permission.",
    keywords: ["publish", "permission", "role"],
  },
  {
    id: "refresh-preview",
    title: "When should I use Refresh public preview?",
    summary: "Use it after publishing or important public-facing edits.",
    answer: "It tells open public preview tabs to fetch the latest published data. It does not replace validation or publishing.",
    keywords: ["refresh", "preview", "public"],
  },
  {
    id: "audit-log-use",
    title: "When should I check Audit log?",
    summary: "Use it when you need change history.",
    answer: "Audit log is useful after unexpected deletes, merges, status changes, publishing actions, or edits by multiple users.",
    keywords: ["audit", "history", "changes"],
  },
  {
    id: "inactive-vs-delete",
    title: "Should I mark a record inactive or delete it?",
    summary: "Use inactive for real records that should not be active; delete or merge records that should not exist.",
    answer: "For duplicate artists or releases, merge is usually better than delete because it preserves chart relationships. Hard delete should be reserved for clear mistakes and admin roles.",
    keywords: ["inactive", "delete", "merge"],
  },
  {
    id: "certification-hidden",
    title: "What does Hidden from app mean on certifications?",
    summary: "The certification exists in the CMS but should not appear publicly.",
    answer: "Use it for drafts, internal review, or records that need correction before public display.",
    keywords: ["certification", "hidden", "public"],
  },
  {
    id: "one-active-methodology",
    title: "Why should only one methodology be active?",
    summary: "The chart engine needs a single source of scoring rules.",
    answer: "Multiple active methodologies can create ambiguity. Keep old versions for history, but activate only the intended current version.",
    keywords: ["methodology", "active", "ranking"],
  },
  {
    id: "data-quality-priority",
    title: "Which dashboard issues should I fix first?",
    summary: "Fix critical issues and upload blockers first.",
    answer: "Prioritize upload validation errors, chart publication mismatches, missing chart entries, duplicate records affecting chart credits, and country errors affecting public chart views.",
    keywords: ["dashboard", "alerts", "data quality", "priority"],
  },
];

const HELP_SECTIONS = [
  { key: "errors", label: "Errors", description: "Plain-language fixes for save, upload, permission, and validation messages.", items: ERROR_GUIDES },
  { key: "glossary", label: "Glossary", description: "Definitions for CMS fields, terms, and record types.", items: GLOSSARY_TERMS },
  { key: "workflows", label: "Workflows", description: "Step-by-step operating procedures for common CMS jobs.", items: WORKFLOWS },
  { key: "methodology", label: "Methodology", description: "How ranking, quality, country, and certification logic should be understood.", items: METHODOLOGY_NOTES },
  { key: "faqs", label: "FAQs", description: "Short answers to recurring editor questions.", items: FAQS },
];

const SECTION_LABELS = Object.fromEntries(HELP_SECTIONS.map((section) => [section.key, section.label]));
const SECTION_KEYS = new Set(HELP_SECTIONS.map((section) => section.key));

function initialHelpState() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section") || "all";
  const articleFromHash = window.location.hash.replace(/^#help-/, "").split("-fixes")[0].split("-suggestions")[0];
  return {
    query: params.get("q") || "",
    section: SECTION_KEYS.has(section) ? section : "all",
    activeArticle: params.get("article") || articleFromHash || "",
    focus: params.get("focus") || "article",
  };
}

function flattenValues(value) {
  if (Array.isArray(value)) return value.flatMap(flattenValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(flattenValues);
  return value == null ? [] : [String(value)];
}

function searchableText(item) {
  return flattenValues(item).join(" ").toLowerCase();
}

function articleIcon(section) {
  if (section === "errors") return "!";
  if (section === "glossary") return "Aa";
  if (section === "workflows") return "1";
  if (section === "methodology") return "%";
  if (section === "faqs") return "?";
  return "i";
}

function HelpList({ title, items, articleId, anchor }) {
  if (!items?.length) return null;
  return (
    <div className="cms-help-block" id={articleId && anchor ? `help-${articleId}-${anchor}` : undefined}>
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => <li key={index}>{item}</li>)}
      </ul>
    </div>
  );
}

function HelpArticle({ item, activeArticle, focus }) {
  const active = item.id === activeArticle;
  const fixesTitle = item.section === "errors" ? "Suggested fixes" : "Steps";
  const preventionTitle = item.section === "errors" ? "Suggestions" : "Prevention";
  return (
    <article
      id={`help-${item.id}`}
      className={`cms-help-article section-${item.section}${active ? " active" : ""}`}
    >
      <div className="cms-help-article-head">
        <span className="cms-help-kind" aria-hidden="true">{articleIcon(item.section)}</span>
        <div>
          <small>{SECTION_LABELS[item.section]}</small>
          <h3>{item.title}</h3>
        </div>
      </div>
      {item.section === "errors" && (
        <div className="cms-help-jump-list" aria-label={`Jump within ${item.title}`}>
          <a href={`#help-${item.id}`}>Meaning</a>
          {(item.fixSteps || item.steps)?.length > 0 && <a className={active && focus === "fixes" ? "active" : ""} href={`#help-${item.id}-fixes`}>Suggested fixes</a>}
          {item.prevention?.length > 0 && <a className={active && focus === "suggestions" ? "active" : ""} href={`#help-${item.id}-suggestions`}>Suggestions</a>}
        </div>
      )}
      {item.summary && <p className="cms-help-summary">{item.summary}</p>}
      {item.meaning && (
        <div className="cms-help-callout">
          <strong>Meaning</strong>
          <p>{item.meaning}</p>
        </div>
      )}
      {item.answer && (
        <div className="cms-help-callout">
          <strong>Answer</strong>
          <p>{item.answer}</p>
        </div>
      )}
      <HelpList title="Common causes" items={item.commonCauses} articleId={item.id} anchor="causes" />
      <HelpList title={fixesTitle} items={item.fixSteps || item.steps} articleId={item.id} anchor="fixes" />
      <HelpList title="Checks" items={item.checks} articleId={item.id} anchor="checks" />
      <HelpList title={preventionTitle} items={item.prevention} articleId={item.id} anchor="suggestions" />
      <HelpList title="Principles" items={item.principles} articleId={item.id} anchor="principles" />
      {item.related?.length > 0 && (
        <div className="cms-help-related">
          {item.related.map((label) => <span key={label}>{label}</span>)}
        </div>
      )}
    </article>
  );
}

export default function HelpCenterPage() {
  const initial = useMemo(initialHelpState, []);
  const [query, setQuery] = useState(initial.query);
  const [section, setSection] = useState(initial.section);
  const [activeArticle, setActiveArticle] = useState(initial.activeArticle);
  const [focus, setFocus] = useState(initial.focus);
  const allItems = useMemo(() => (
    HELP_SECTIONS.flatMap((group) => group.items.map((item) => ({
      ...item,
      section: group.key,
      searchText: searchableText({ ...item, sectionLabel: group.label }),
    })))
  ), []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesSection = section === "all" || item.section === section;
      const matchesQuery = !normalized || item.searchText.includes(normalized);
      return matchesSection && matchesQuery;
    });
  }, [allItems, query, section]);

  const spotlight = allItems.find((item) => item.id === "artist-slug-exists");
  const visibleItems = filteredItems.filter((item) => item.id !== "artist-slug-exists");
  const normalizedQuery = query.trim().toLowerCase();
  const showSpotlight = Boolean(spotlight) &&
    (section === "all" || section === "errors") &&
    (!normalizedQuery || spotlight.searchText.includes(normalizedQuery));

  useEffect(() => {
    if (!activeArticle) return;
    const targetId = focus && focus !== "article"
      ? `help-${activeArticle}-${focus}`
      : `help-${activeArticle}`;
    const target = document.getElementById(targetId) || document.getElementById(`help-${activeArticle}`);
    if (!target) return;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }, [activeArticle, focus, filteredItems.length, showSpotlight]);

  return (
    <section className="cms-help-center">
      <div className="cms-page-head cms-help-head">
        <div>
          <span className="cms-eyebrow">Support</span>
          <h1>CMS Help Center</h1>
          <p>Search errors, terms, workflows, methodologies, and FAQs for day-to-day chart operations.</p>
        </div>
      </div>

      <div className="cms-help-stats" aria-label="Help center coverage">
        {HELP_SECTIONS.map((group) => (
          <button
            type="button"
            key={group.key}
            className={`cms-help-stat ${section === group.key ? "active" : ""}`}
            onClick={() => setSection(group.key)}
          >
            <span>{group.label}</span>
            <strong>{group.items.length}</strong>
            <small>{group.description}</small>
          </button>
        ))}
      </div>

      <div className="cms-help-layout">
        <aside className="cms-help-panel">
          <label className="cms-help-search">
            <span>Search help</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try slug, publish, JSON, country..."
            />
          </label>
          <div className="cms-help-filter-list" aria-label="Help categories">
            <button type="button" className={section === "all" ? "active" : ""} onClick={() => setSection("all")}>
              All topics
            </button>
            {HELP_SECTIONS.map((group) => (
              <button
                type="button"
                key={group.key}
                className={section === group.key ? "active" : ""}
                onClick={() => setSection(group.key)}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="cms-help-ops-note">
            <strong>Fast triage order</strong>
            <ol>
              <li>Read the exact field name in the error.</li>
              <li>Search this Help Center for that field or phrase.</li>
              <li>Fix validation errors before warnings.</li>
              <li>Use Audit log when the record changed unexpectedly.</li>
            </ol>
          </div>
        </aside>

        <div className="cms-help-results">
          <div className="cms-help-results-head">
            <div>
              <span className="cms-eyebrow">Knowledge base</span>
              <h2>{filteredItems.length} matching topic{filteredItems.length === 1 ? "" : "s"}</h2>
            </div>
            {(query || section !== "all") && (
              <button type="button" className="cms-text-btn" onClick={() => { setQuery(""); setSection("all"); setActiveArticle(""); setFocus("article"); }}>
                Clear filters
              </button>
            )}
          </div>

          {showSpotlight && spotlight && <HelpArticle item={spotlight} activeArticle={activeArticle} focus={focus} />}

          {visibleItems.length === 0 && !showSpotlight && (
            <div className="cms-empty">
              No help topics matched that search. Try a field name, exact error phrase, or workflow name.
            </div>
          )}

          <div className="cms-help-article-grid">
            {visibleItems.map((item) => (
              <HelpArticle
                key={`${item.section}-${item.id}`}
                item={item}
                activeArticle={activeArticle}
                focus={focus}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
