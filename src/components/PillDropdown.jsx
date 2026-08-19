import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Custom-styled dropdown used in place of a native <select> wherever the
// trigger needs a specific pill width and the option list needs the app's
// own highlight/hover treatment (native <select> option lists can't be
// restyled in any browser). Portaled to <body> so the open panel is never
// clipped or out-ranked by a sibling's stacking context — see ShareButton
// for the same fix applied to the same class of bug.
export default function PillDropdown({
  value,
  onChange,
  options,
  groups,
  ariaLabel,
  isDark,
  F,
  GOLD,
  width = "150px",
  menuWidth,
  align = "left",
  renderValue,
  pillStyle = {},
  icon = true,
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const flatOptions = groups ? groups.flatMap((g) => g.options) : (options || []);
  const currentLabel = renderValue
    ? renderValue(value)
    : (flatOptions.find((o) => o.value === value)?.label ?? value);

  useEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const estimatedHeight = 340;
      const openUpward = window.innerHeight - rect.bottom < estimatedHeight && rect.top > estimatedHeight;
      const horizontal = align === "right"
        ? { right: Math.max(8, window.innerWidth - rect.right) }
        : { left: Math.max(8, rect.left) };
      setMenuPos(openUpward
        ? { ...horizontal, bottom: window.innerHeight - rect.top + 6 }
        : { ...horizontal, top: rect.bottom + 6 });
    };
    updatePosition();
    const onDocClick = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, align]);

  const selectValue = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const rowStyle = (active) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "9px 12px",
    borderRadius: "9px",
    border: "none",
    background: active ? `${GOLD}22` : "transparent",
    color: active ? GOLD : (isDark ? "#FFFFFF" : "#000000"),
    fontFamily: F,
    fontSize: "13px",
    fontWeight: active ? 800 : 650,
    cursor: "pointer",
    marginBottom: "1px",
  });

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block", width }}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          boxSizing: "border-box",
          cursor: "pointer",
          ...pillStyle,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentLabel}</span>
        {icon && (
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.8, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {open && menuPos && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            position: "fixed",
            ...menuPos,
            width: menuWidth || "220px",
            maxHeight: "min(360px, 60vh)",
            overflowY: "auto",
            padding: "8px",
            borderRadius: "14px",
            background: isDark ? "#151815" : "#FFFFFF",
            border: `1px solid ${isDark ? "#2B302B" : "#E5E0D4"}`,
            boxShadow: isDark ? "0 18px 35px rgba(0,0,0,0.4)" : "0 18px 35px rgba(31,36,31,0.14)",
            zIndex: 1000,
          }}
        >
          {groups
            ? groups.map((group) => (
                <div key={group.label}>
                  <div style={{ padding: "8px 12px 4px", fontSize: "10px", fontWeight: 800, letterSpacing: "0.8px", textTransform: "uppercase", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }}>
                    {group.label}
                  </div>
                  {group.options.map((option) => (
                    <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => selectValue(option.value)} style={rowStyle(option.value === value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              ))
            : flatOptions.map((option) => (
                <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => selectValue(option.value)} style={rowStyle(option.value === value)}>
                  {option.label}
                </button>
              ))}
        </div>,
        document.body
      )}
    </div>
  );
}
