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

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute(
        """
        SELECT pid, state, wait_event_type, wait_event, query_start,
               LEFT(query, 300)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid()
        ORDER BY query_start
        """
    )
    rows = cursor.fetchall()

print(json.dumps(rows, default=str, indent=2))
