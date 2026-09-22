import test from "node:test";
import assert from "node:assert/strict";
import { latestWeeklyJob, weeklyNeedsRefresh, weeklyStatus } from "./weeklyUploadStatus.js";

test("weekly imports never imply human review", () => {
  assert.equal(weeklyStatus({}), "unprocessed");
  assert.equal(weeklyStatus({ processing_notes: "Queued for background processing." }), "queued");
  assert.equal(weeklyStatus({ processing_notes: "Error: processing failed" }), "error");
  assert.equal(weeklyStatus({ processed: true }), "published");
});

test("job state takes precedence over stale upload flags and notes", () => {
  assert.equal(weeklyStatus({ processed: true, job: { status: "running" } }), "processing");
  assert.equal(weeklyStatus({ processing_notes: "Error: previous attempt", job: { status: "queued" } }), "queued");
  assert.equal(weeklyStatus({ processing_notes: "Queued", job: { status: "failed" } }), "error");
  assert.equal(weeklyNeedsRefresh({ job: { status: "failed" } }), false);
  assert.equal(weeklyNeedsRefresh({}), true);
});

test("matches the newest weekly job, excluding unrelated jobs", () => {
  const jobs = [
    { id: 1, job_type: "process_weekly_upload", payload: { weekly_upload_id: 4 }, created_at: "2026-09-21" },
    { id: 2, job_type: "process_weekly_upload", payload: { weekly_upload_id: "4" }, created_at: "2026-09-22" },
    { id: 3, job_type: "publish_chart_upload", payload: { chart_upload_id: 4 }, created_at: "2026-09-23" },
  ];
  assert.equal(latestWeeklyJob({ id: 4 }, jobs).id, 2);
  assert.equal(latestWeeklyJob({ id: 5 }, jobs), null);
});
