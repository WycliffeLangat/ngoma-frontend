import { useEffect, useState } from "react";
import { computeArtistImpact } from "../artistImpact";

const MAX_ARTISTS_CHECKED = 5;
const MAX_RISKS_SHOWN = 8;

// Shown inside artist delete/merge confirmation dialogs so an editor can see,
// before confirming, what the action actually touches — and if leftover
// unlinked credit text means the name is likely to resurface as "missing"
// afterward, so they can fix that first instead of finding out later.
export default function ArtistImpactSummary({ artists = [], action = "delete", onNavigate }) {
  const targets = artists.filter((artist) => artist?.id).slice(0, MAX_ARTISTS_CHECKED);
  const key = targets.map((artist) => artist.id).join(",");
  const [state, setState] = useState({ loading: true, linkedCount: 0, risks: [], error: "" });

  useEffect(() => {
    if (!targets.length) {
      setState({ loading: false, linkedCount: 0, risks: [], error: "" });
      return;
    }
    let active = true;
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.all(targets.map((artist) => computeArtistImpact(artist)))
      .then((results) => {
        if (!active) return;
        const linkedCount = results.reduce((sum, r) => sum + r.linkedReleases.length, 0);
        const riskMap = new Map();
        results.forEach((r) => r.textRiskReleases.forEach((release) => riskMap.set(release.id, release)));
        setState({
          loading: false,
          linkedCount,
          risks: [...riskMap.values()],
          error: results.find((r) => r.error)?.error || "",
        });
      });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!targets.length) return null;

  const multiple = targets.length > 1;
  const actionVerb = action === "merge" ? "merged away" : "deleted";
  const creditFate = action === "merge"
    ? "moves to the kept record"
    : "is permanently lost";

  return (
    <div style={{ background: "#fffaf0", border: "1px solid #f0dca0", borderRadius: 8, padding: "10px 12px", margin: "10px 0", fontSize: 12 }}>
      <div style={{ fontWeight: 800, color: "#8a6d1f", marginBottom: 4, textTransform: "uppercase", fontSize: 10.5, letterSpacing: ".04em" }}>
        What will happen
      </div>
      {state.loading ? (
        <div style={{ color: "#997" }}>Checking linked and credited releases…</div>
      ) : (
        <>
          <div style={{ color: "#665" }}>
            {state.linkedCount > 0
              ? `Currently linked to ${state.linkedCount} release${state.linkedCount === 1 ? "" : "s"} — that credit ${creditFate} once ${multiple ? "these are" : "this is"} ${actionVerb}.`
              : `Not currently linked to any release.`}
          </div>
          {state.risks.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ color: "#c0392b", fontWeight: 700 }}>
                ⚠ {state.risks.length} release{state.risks.length === 1 ? "" : "s"} still mention this name in unlinked credit text.
                Fix these first, or the name will likely resurface as "missing" after this action:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4, maxHeight: 140, overflowY: "auto" }}>
                {state.risks.slice(0, MAX_RISKS_SHOWN).map((release) => (
                  <button
                    key={release.id}
                    type="button"
                    onClick={() => onNavigate?.(release.chart_type === "albums" ? "albums" : "songs", release.title, release.id)}
                    style={{
                      textAlign: "left", background: "#fff", border: "1px solid #f3d6d6", borderRadius: 6,
                      padding: "4px 8px", cursor: onNavigate ? "pointer" : "default", font: "inherit",
                    }}
                  >
                    {release.title} <span style={{ color: "#999" }}>({release.chart_type === "albums" ? "album" : "song"})</span>
                  </button>
                ))}
                {state.risks.length > MAX_RISKS_SHOWN && (
                  <div style={{ color: "#aaa", fontSize: 11 }}>+ {state.risks.length - MAX_RISKS_SHOWN} more</div>
                )}
              </div>
            </div>
          )}
          {artists.length > targets.length && (
            <div style={{ color: "#aaa", marginTop: 4, fontSize: 11 }}>
              Only checked the first {MAX_ARTISTS_CHECKED} of {artists.length} selected artists.
            </div>
          )}
          {state.error && <div style={{ color: "#c0392b", marginTop: 4 }}>Some checks failed: {state.error}</div>}
        </>
      )}
    </div>
  );
}
