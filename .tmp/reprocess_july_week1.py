import hashlib
import json
import os
import sys
from pathlib import Path

sys.path.insert(
    0,
    r"C:\Users\HP\Desktop\Ngoma Charts Folder\files\ngoma_charts_backend\backend",
)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ngoma_backend.settings")

import django

django.setup()

from django.db import transaction
from django.db.models import Count

from charts.cms_utils import bump_public_revision, harmonize_chart_history
from charts.models import AuditLog, MonthlyChart, PlatformChartEntry, WeeklyUpload
from charts.pipeline import process_weekly_upload


SOURCES = {
    "singles": {
        "path": Path(
            r"C:\Users\HP\Downloads\Kenya_Top_100_Music_Charts_Fixed.xlsx"
        ),
        "sha256": "62f712e39fdec31985ab7f7f6a9b9d41a52791dda1733c7923f1911ede86b2dd",
    },
    "albums": {
        "path": Path(
            r"C:\Users\HP\Downloads\Kenya_Top_200_Albums_FullyFixed (1).xlsx"
        ),
        "sha256": "8aff80a0946e302b4c4520d7523cb13d9ea524ddd2f6d380c7437bad0236182c",
    },
}


for source in SOURCES.values():
    digest = hashlib.sha256(source["path"].read_bytes()).hexdigest()
    if digest != source["sha256"]:
        raise RuntimeError(
            f"Workbook changed after validation: {source['path']} ({digest})"
        )


results = []
with transaction.atomic():
    chart_ids = []
    for chart_type, source in SOURCES.items():
        upload = WeeklyUpload.objects.get(
            year=2026,
            month=7,
            week=1,
            chart_type=chart_type,
        )
        upload.file = source["path"].name
        upload.save(update_fields=["file"])

        with source["path"].open("rb") as workbook:
            result = process_weekly_upload(
                upload,
                file_obj=workbook,
                harmonize=False,
            )

        chart = MonthlyChart.objects.get(
            year=2026,
            month=7,
            chart_type=chart_type,
        )
        chart_ids.append(chart.id)
        platform_counts = list(
            PlatformChartEntry.objects.filter(upload=upload)
            .values("platform__name")
            .order_by("platform__name")
        )
        counts = {}
        for row in platform_counts:
            name = row["platform__name"]
            counts[name] = counts.get(name, 0) + 1

        payload = {
            "upload_id": upload.id,
            "chart_id": chart.id,
            "chart_type": chart_type,
            "filename": source["path"].name,
            "sha256": source["sha256"],
            "entries_processed": result.get("entries_processed", 0),
            "duplicates_dropped": result.get("dupes_dropped", 0),
            "orphaned_releases_pruned": result.get(
                "orphaned_releases_pruned", 0
            ),
            "platform_counts": counts,
        }
        results.append(payload)
        AuditLog.objects.create(
            action="reprocessed_weekly_chart",
            module="uploads",
            object_type="WeeklyUpload",
            object_id=str(upload.id),
            object_repr=str(upload)[:255],
            new_value=payload,
            reason=(
                "Reprocessed user-supplied corrected July 2026 Week 1 "
                f"{chart_type} workbook after title/artist cleanup."
            ),
        )

    harmonization = harmonize_chart_history(chart_ids=chart_ids)
    bump_public_revision()

print(
    json.dumps(
        {
            "uploads": results,
            "harmonization": harmonization,
            "charts": list(
                MonthlyChart.objects.filter(id__in=chart_ids)
                .annotate(entry_count=Count("entries"))
                .values(
                    "id", "chart_type", "status", "is_published", "entry_count"
                )
            ),
        },
        indent=2,
        default=str,
    )
)
