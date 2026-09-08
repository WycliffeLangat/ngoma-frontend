import { jsx, jsxs } from "react/jsx-runtime";
const EntryThumb = () => null;
function RankingSpotlight({ entries = [], lifetime = false, onOpen }) {
  const leaders = lifetime ? entries.slice(0, 3) : [...entries].sort((a, b) => a.rank - b.rank).slice(0, 5);
  if (!leaders.length) return null;
  const title = (item) => item.title || item.t || item.n || "Untitled";
  const artist = (item) => item.artist || item.a || item.primary_artist || "";
  const points = (item) => Number(item.totalPts ?? item.pts ?? 0).toLocaleString();
  const artwork = (item, size) => /* @__PURE__ */ jsx(EntryThumb, { item, name: artist(item) || title(item), size });
  if (lifetime) return /* @__PURE__ */ jsxs("section", { className: "v2-ranking-surface", "aria-label": "Lifetime podium", children: [
    /* @__PURE__ */ jsxs("div", { className: "v2-section-heading", children: [
      /* @__PURE__ */ jsx("h2", { children: "Leading the charts" }),
      /* @__PURE__ */ jsx("span", { children: "The selected period \xB7 Top three" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "v2-podium", children: leaders.map((item, index) => /* @__PURE__ */ jsxs("button", { className: `v2-podium-card place-${index + 1}`, onClick: () => onOpen(item), children: [
      /* @__PURE__ */ jsxs("span", { className: "v2-rank", children: [
        "#",
        index + 1
      ] }),
      artwork(item, 100),
      /* @__PURE__ */ jsx("strong", { children: title(item) }),
      /* @__PURE__ */ jsx("span", { children: artist(item) }),
      /* @__PURE__ */ jsxs("b", { children: [
        points(item),
        " ",
        /* @__PURE__ */ jsx("small", { children: "pts" })
      ] })
    ] }, `${title(item)}-${index}`)) })
  ] });
  const leader = leaders[0];
  return /* @__PURE__ */ jsxs("section", { className: "v2-ranking-surface", "aria-label": "Current chart leaders", children: [
    /* @__PURE__ */ jsxs("div", { className: "v2-section-heading", children: [
      /* @__PURE__ */ jsx("h2", { children: "At the top" }),
      /* @__PURE__ */ jsx("span", { children: "The leaders in this chart" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "v2-chart-lead", children: [
      /* @__PURE__ */ jsxs("button", { className: "v2-leader", onClick: () => onOpen(leader), children: [
        /* @__PURE__ */ jsx("span", { className: "v2-eyebrow", children: "Current number one" }),
        /* @__PURE__ */ jsxs("div", { className: "v2-leader-copy", children: [
          artwork(leader, 116),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("h2", { children: title(leader) }),
            /* @__PURE__ */ jsx("p", { children: artist(leader) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "v2-leader-stats", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Rank",
            /* @__PURE__ */ jsxs("b", { children: [
              "#",
              leader.rank
            ] })
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Points",
            /* @__PURE__ */ jsx("b", { children: points(leader) })
          ] }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Explore",
            /* @__PURE__ */ jsx("b", { children: "View details \u2197" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "v2-runners", children: leaders.slice(1).map((item, index) => /* @__PURE__ */ jsxs("button", { className: "v2-mini-rank", onClick: () => onOpen(item), children: [
        /* @__PURE__ */ jsx("span", { className: "v2-rank", children: item.rank }),
        artwork(item, 48),
        /* @__PURE__ */ jsxs("span", { className: "v2-mini-copy", children: [
          /* @__PURE__ */ jsx("strong", { children: title(item) }),
          /* @__PURE__ */ jsx("small", { children: artist(item) })
        ] }),
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "\u2197" })
      ] }, `${title(item)}-${index}`)) })
    ] })
  ] });
}
export {
  RankingSpotlight as default
};
