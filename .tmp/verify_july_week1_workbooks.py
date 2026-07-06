import json
import os
import sys

import openpyxl

sys.path.insert(
    0,
    r"C:\Users\HP\Desktop\Ngoma Charts Folder\files\ngoma_charts_backend\backend",
)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "ngoma_backend.settings")

import django

django.setup()

from charts.models import PlatformChartEntry, WeeklyUpload
from charts.pipeline import split_song_artist


files = {
    "singles": r"C:\Users\HP\Downloads\Kenya_Top_100_Music_Charts_Fixed.xlsx",
    "albums": r"C:\Users\HP\Downloads\Kenya_Top_200_Albums_FullyFixed (1).xlsx",
}
output = []

for chart_type, path in files.items():
    upload = WeeklyUpload.objects.get(
        year=2026,
        month=7,
        week=1,
        chart_type=chart_type,
    )
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    headers = [str(value or "").strip() for value in rows[0]]
    mismatches = []
    persisted_positions = {}
    checked = 0

    for entry in PlatformChartEntry.objects.filter(upload=upload).select_related(
        "platform"
    ):
        persisted_positions.setdefault(entry.platform.name, set()).add(entry.position)
        column = headers.index(entry.platform.name)
        cell = str(rows[entry.position][column] or "").strip()
        title, artist = split_song_artist(cell, chart_type == "albums")
        checked += 1
        if title != entry.raw_title or artist != entry.raw_artist:
            mismatches.append(
                {
                    "platform": entry.platform.name,
                    "position": entry.position,
                    "cell": cell,
                    "database": [entry.raw_title, entry.raw_artist],
                }
            )

    output.append(
        {
            "type": chart_type,
            "upload_id": upload.id,
            "source_rows": len(rows) - 1,
            "database_entries": checked,
            "mismatch_count": len(mismatches),
            "mismatches": mismatches[:10],
            "missing_source_rows": {
                platform: [
                    {
                        "position": position,
                        "cell": str(rows[position][column] or "").strip(),
                    }
                    for position in range(1, min(len(rows), 101))
                    if rows[position][column] not in (None, "")
                    and position not in persisted_positions.get(platform, set())
                ]
                for column, platform in enumerate(headers)
            },
        }
    )
    workbook.close()

print(json.dumps(output, indent=2, ensure_ascii=False))
