import os,json
import psycopg2
if not os.environ.get('DATABASE_PUBLIC_URL'):raise SystemExit('No database connection')
with psycopg2.connect(os.environ['DATABASE_PUBLIC_URL']) as conn:
    with conn.cursor() as cursor:
        cursor.execute("SELECT pid, state, wait_event_type, wait_event, EXTRACT(EPOCH FROM (now()-xact_start))::int, left(query,100) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND xact_start IS NOT NULL")
        print(json.dumps(cursor.fetchall(),default=str))
