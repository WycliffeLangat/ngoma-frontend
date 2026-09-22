export function latestWeeklyJob(upload, jobs = []) {
  return jobs.filter((job) => job.job_type === "process_weekly_upload" &&
    String(job.payload?.weekly_upload_id) === String(upload.id))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] || null;
}

export function weeklyStatus(upload) {
  const job = upload._processingJob || upload.job;
  if (job?.status === "queued") return "queued";
  if (job?.status === "running") return "processing";
  if (job?.status === "failed") return "error";
  if (upload.processed) return "published";
  const notes = String(upload.processing_notes || "");
  if (/^Error:/i.test(notes)) return "error";
  if (/queued|background/i.test(notes)) return "queued";
  if (/processing/i.test(notes)) return "processing";
  return "unprocessed";
}

export function weeklyNeedsRefresh(upload) {
  return ["queued", "processing", "unprocessed"].includes(weeklyStatus(upload));
}
