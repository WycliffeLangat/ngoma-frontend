import json
import os
import sys
from pathlib import Path


FRONTEND_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = FRONTEND_ROOT.parents[1] / "ngoma_charts_backend" / "backend"
OUTPUT = FRONTEND_ROOT / ".tmp" / "june_backend_payload.json"

sys.path.insert(0, str(BACKEND_ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ngoma_backend.settings")

import django

django.setup()

from django.db.models import Prefetch
from django.core.serializers.json import DjangoJSONEncoder

from charts.app_data import _chart_data
from charts.models import MonthlyChart, MonthlyChartEntry


class LocalRequest:
    @staticmethod
    def build_absolute_uri(url):
        return str(url or "")


public_entries = (
    MonthlyChartEntry.objects.select_related(
        "release", "release__artist", "platform"
    )
    .prefetch_related("release__artist_credits__artist")
    .filter(rank__range=(1, 50))
    .order_by("rank")
)
charts = list(
    MonthlyChart.objects.filter(
        year=2026,
        month=6,
        is_published=True,
        status="published",
    )
    .prefetch_related(
        Prefetch("entries", queryset=public_entries, to_attr="public_entries")
    )
    .order_by("year", "month", "chart_type")
)
months, full = _chart_data(LocalRequest(), charts)
OUTPUT.write_text(
    json.dumps(
        {"months": months, "full": full},
        ensure_ascii=False,
        indent=2,
        cls=DjangoJSONEncoder,
    ),
    encoding="utf-8",
)
print(
    json.dumps(
        {
            "months": months,
            "singles_combined": len(full["singles"]["combined"]["June 2026"]),
            "albums_combined": len(full["albums"]["combined"]["June 2026"]),
            "single_platforms": {
                key: len(value["June 2026"])
                for key, value in full["singles"]["platforms"].items()
            },
            "album_platforms": {
                key: len(value["June 2026"])
                for key, value in full["albums"]["platforms"].items()
            },
        },
        indent=2,
    )
)
