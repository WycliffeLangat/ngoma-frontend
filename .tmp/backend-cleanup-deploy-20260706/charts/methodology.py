"""Canonical Ngoma Charts scoring and platform methodology.

There are deliberately two point systems:

* weekly/raw points (Top 100): ``101 - rank``; these build monthly rankings;
* public points (Top 50): ``51 - rank``; these power every public aggregate.

Platform database settings are descriptive metadata. They must never change
either formula.
"""

WEEKLY_CHART_LIMIT = 100
WEEKLY_POINTS_BASE = 101

PUBLIC_CHART_LIMIT = 50
PUBLIC_POINTS_BASE = 51

# Every African country the public frontend can display a country-scoped Top 50 for
# (src/utils/africaRegions.js AFRICA_COUNTRIES on the frontend — keep the two in sync).
# A country only ever gets real RegionalChartEntry rows once at least one charted
# release's artist has that country_code, which weekly uploads now set automatically
# for newly-created artists/releases (see WeeklyUpload.region, pipeline.py).
AFRICAN_COUNTRY_NAMES = {
    "BI": "Burundi", "KM": "Comoros", "DJ": "Djibouti", "ER": "Eritrea", "ET": "Ethiopia",
    "KE": "Kenya", "MG": "Madagascar", "MW": "Malawi", "MU": "Mauritius", "MZ": "Mozambique",
    "RW": "Rwanda", "SC": "Seychelles", "SO": "Somalia", "SS": "South Sudan", "TZ": "Tanzania",
    "UG": "Uganda", "ZM": "Zambia", "ZW": "Zimbabwe",
    "AO": "Angola", "CM": "Cameroon", "CF": "Central African Republic", "TD": "Chad",
    "CG": "Congo", "CD": "Democratic Republic of the Congo", "GQ": "Equatorial Guinea",
    "GA": "Gabon", "ST": "Sao Tome and Principe",
    "BW": "Botswana", "SZ": "Eswatini", "LS": "Lesotho", "NA": "Namibia", "ZA": "South Africa",
    "DZ": "Algeria", "EG": "Egypt", "LY": "Libya", "MA": "Morocco", "SD": "Sudan",
    "TN": "Tunisia", "EH": "Western Sahara",
    "BJ": "Benin", "BF": "Burkina Faso", "CV": "Cabo Verde", "CI": "Cote d'Ivoire",
    "GM": "Gambia", "GH": "Ghana", "GN": "Guinea", "GW": "Guinea-Bissau", "LR": "Liberia",
    "ML": "Mali", "MR": "Mauritania", "NE": "Niger", "NG": "Nigeria", "SN": "Senegal",
    "SL": "Sierra Leone", "TG": "Togo",
}

# Country-scoped Top 50 charts (e.g. "Kenyan Top 50", "Nigeria Top 50"). Every African
# country is eligible; a code only ever produces real rows once a charted release's
# artist actually has that country_code set.
REGIONAL_CHART_CODES = list(AFRICAN_COUNTRY_NAMES)

# A release/artist in one of these statuses is never public-facing. Single
# source of truth for both the public API's own filtering (app_data.py) and
# chart ranking (cms_utils.py) — ranking must agree with display, or a
# hidden release can occupy a Top 50 slot that never appears publicly,
# silently shrinking the visible chart with nothing promoted to fill it.
HIDDEN_STATUSES = {"archived", "inactive", "rejected", "draft"}


def is_public_status(value):
    return (value or "active").lower() not in HIDDEN_STATUSES

SINGLES_PLATFORMS = (
    "Apple Music",
    "Audiomack",
    "Boomplay",
    "Spotify",
    "YouTube",
    "Shazam",
)

ALBUMS_PLATFORMS = (
    "Apple Music",
    "Audiomack",
)

CERTIFICATION_THRESHOLDS = {
    "gold": 200,
    "platinum": 400,
    "diamond": 600,
}


def weekly_points(rank):
    """Return fixed Top 100 source points, or zero outside the chart."""
    try:
        rank = int(rank)
    except (TypeError, ValueError):
        return 0
    return WEEKLY_POINTS_BASE - rank if 1 <= rank <= WEEKLY_CHART_LIMIT else 0


def public_points(rank):
    """Return fixed Top 50 public points, or zero outside the public chart."""
    try:
        rank = int(rank)
    except (TypeError, ValueError):
        return 0
    return PUBLIC_POINTS_BASE - rank if 1 <= rank <= PUBLIC_CHART_LIMIT else 0


def platforms_for(chart_type):
    return ALBUMS_PLATFORMS if str(chart_type) == "albums" else SINGLES_PLATFORMS


def platform_max_for(chart_type):
    return len(platforms_for(chart_type))
