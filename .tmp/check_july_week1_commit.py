import json
import os
import sys

sys.path.insert(
    0,
    r"C:\Users\HP\Desktop\Ngoma Charts Folder\files\ngoma_charts_backend\backend",
)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ngoma_backend.settings")

import django

django.setup()

from django.db.models import Count

from charts.models import AuditLog, MonthlyChart, PlatformChartEntry, WeeklyUpload


uploads = []
for upload in WeeklyUpload.objects.filter(
    year=2026,
    month=7,
    week=1,
    chart_type__in=["singles", "albums"],
).order_by("chart_type"):
    uploads.append(
        {
            "id": upload.id,
            "chart_type": upload.chart_type,
            "filename": upload.file.name,
            "processed": upload.processed,
            "entries_processed": upload.entries_processed,
            "duplicates_dropped": upload.duplicates_dropped,
            "platform_counts": dict(
                PlatformChartEntry.objects.filter(upload=upload)
                .values_list("platform__name")
                .annotate(total=Count("id"))
                .order_by("platform__name")
            ),
        }
    )

print(
    json.dumps(
        {
            "uploads": uploads,
            "charts": list(
                MonthlyChart.objects.filter(
                    year=2026,
                    month=7,
                    chart_type__in=["singles", "albums"],
                )
                .annotate(entry_count=Count("entries"))
                .values(
                    "id",
                    "chart_type",
                    "status",
                    "is_published",
                    "entry_count",
                )
                .order_by("chart_type")
            ),
            "audits": list(
                AuditLog.objects.filter(
                    action="reprocessed_weekly_chart",
                    object_id__in=["28", "29"],
                )
                .values("created_at", "object_id", "new_value")
                .order_by("-created_at")[:2]
            ),
        },
        indent=2,
        default=str,
    )
)
