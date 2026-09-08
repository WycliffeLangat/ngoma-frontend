# Ngoma Charts redesign V2 notes

This version keeps the original typeface. The CSS deliberately avoids importing or naming a new font and uses `--font-current: inherit`; only size, weight, spacing, line-height and letter-spacing are changed.

## Main changes

- Stronger page hierarchy: each page now has one main hero, one primary content module, then supporting sections.
- Better chart structure: chart page starts with the current leader and context cards before the full table.
- Less visual noise: fewer hard borders, more whitespace, larger row rhythm, calmer backgrounds.
- More premium all-time/certification feel: podiums, award tiers, and grouped certification cards.
- Cleaner analytics: editorial feature art plus climbers, drops, new entries, country graph, records.
- Clearer head-to-head: two-player comparison first, trajectory second, matrix last.
- About page rebuilt as a readable methodology story rather than many equal-weight boxes.

## Implementation guidance

- Keep your existing global `font-family` declaration.
- Copy sizing, weight, spacing and layout rules from this prototype into your existing components.
- Replace gradient album-art placeholders with your real cover images.
- Keep the active nav pill style, larger titles, compact toolbar, and improved table spacing across all pages for consistency.
