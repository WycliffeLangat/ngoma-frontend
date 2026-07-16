import { useEffect, useRef, useState } from "react";
import ErrorHelpLink from "./ErrorHelpLink";

function OrderedMultiSelect({ value = [], options = [], onChange }) {
  const selected = Array.isArray(value) ? value.map(Number).filter(Boolean) : [];
  const optionById = new Map(options.map((option) => [Number(option.value), option]));
  const add = (artistId) => {
    const id = Number(artistId);
    if (id && !selected.includes(id)) onChange([...selected, id]);
  };
  const move = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= selected.length) return;
    const next = [...selected];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };
  return (
    <div className="cms-credit-picker">
      <select value="" onChange={(event) => add(event.target.value)}>
        <option value="">Add artist...</option>
        {options.filter((option) => !selected.includes(Number(option.value))).map((option) => (
          <option key={option.value} value={option.value}>{option.label}{option.country_code ? ` (${option.country_code})` : ""}</option>
        ))}
      </select>
      <div className="cms-credit-list">
        {selected.map((artistId, index) => {
          const option = optionById.get(artistId);
          return (
            <div key={artistId} className="cms-credit-item">
              <b>{index + 1}. {option?.label || `Artist #${artistId}`}</b>
              <span>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move artist up">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === selected.length - 1} aria-label="Move artist down">↓</button>
                <button type="button" onClick={() => onChange(selected.filter((id) => id !== artistId))} aria-label="Remove artist">×</button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function normalizeArtistCreditRows(value = []) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.map((item) => {
    const id = Number(item && typeof item === "object" ? (item.artist_id ?? item.value ?? item.id) : item);
    const role = String(item?.role || "primary") === "featured" ? "featured" : "primary";
    return { artist_id: id, role };
  }).filter((row) => {
    if (!row.artist_id || seen.has(row.artist_id)) return false;
    seen.add(row.artist_id);
    return true;
  });
}

function ArtistRoleList({ value = [], options = [], onChange }) {
  const rows = normalizeArtistCreditRows(value);
  const optionById = new Map(options.map((option) => [Number(option.value), option]));
  const setRows = (nextRows) => onChange(normalizeArtistCreditRows(nextRows));
  const add = (artistId) => {
    const id = Number(artistId);
    if (id && !rows.some((row) => row.artist_id === id)) {
      setRows([...rows, { artist_id: id, role: rows.length ? "featured" : "primary" }]);
    }
  };
  const move = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= rows.length) return;
    const next = [...rows];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setRows(next);
  };
  return (
    <div className="cms-credit-picker">
      <select value="" onChange={(event) => add(event.target.value)}>
        <option value="">Add artist...</option>
        {options.filter((option) => !rows.some((row) => row.artist_id === Number(option.value))).map((option) => (
          <option key={option.value} value={option.value}>{option.label}{option.country_code ? ` (${option.country_code})` : ""}</option>
        ))}
      </select>
      <div className="cms-credit-list">
        {rows.map((row, index) => {
          const option = optionById.get(row.artist_id);
          return (
            <div key={row.artist_id} className="cms-credit-item">
              <b>{index + 1}. {option?.label || `Artist #${row.artist_id}`}</b>
              <select
                value={row.role}
                onChange={(event) => setRows(rows.map((item, i) => (
                  i === index ? { ...item, role: event.target.value } : item
                )))}
                aria-label={`Role for ${option?.label || `Artist #${row.artist_id}`}`}
              >
                <option value="primary">Primary</option>
                <option value="featured">Featuring</option>
              </select>
              <span>
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move artist up">↑</button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === rows.length - 1} aria-label="Move artist down">↓</button>
                <button type="button" onClick={() => setRows(rows.filter((item) => item.artist_id !== row.artist_id))} aria-label="Remove artist">×</button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TagsInput({ value = "", onChange }) {
  const tags = String(value || "").split(",").map((t) => t.trim()).filter(Boolean);
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.map((t) => t.toLowerCase()).includes(trimmed.toLowerCase())) {
      onChange([...tags, trimmed].join(", "));
    }
    setInput("");
  };
  const remove = (tag) => onChange(tags.filter((t) => t !== tag).join(", "));
  return (
    <div className="cms-tags-input">
      <div className="cms-tags-list">
        {tags.map((tag) => (
          <span key={tag} className="cms-tag">
            {tag}
            <button type="button" onClick={() => remove(tag)} aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="cms-tags-empty">No entries yet</span>}
      </div>
      <div className="cms-tags-add">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          placeholder="Type a name and press Enter..."
        />
        <button type="button" onClick={add} className="cms-btn small">Add</button>
      </div>
    </div>
  );
}

// Standalone image upload box — rendered as a div to avoid .cms-modal label CSS interference
function ImageUploadBox({ fieldName, label, help, form, set }) {
  const inputRef = useRef(null);
  const raw = form[fieldName];
  const src = raw instanceof File
    ? URL.createObjectURL(raw)
    : (typeof raw === "string" && raw ? raw : null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: "#5e625c" }}>{label}</span>
      <div style={{ position: "relative", display: "inline-block", flexShrink: 0 }}>
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            width: "110px",
            aspectRatio: "1",
            borderRadius: "12px",
            border: "2px dashed #E8E1D2",
            background: src ? "transparent" : "#faf8f2",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            transition: "border-color .15s",
          }}
          title={src ? "Click to replace image" : "Click to upload image"}
        >
          {src
            ? <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px", textAlign: "center" }}>
                <span style={{ fontSize: "28px", lineHeight: 1, color: "#bbb", fontWeight: 300 }}>+</span>
                <span style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700, color: "#999", lineHeight: 1.3 }}>{label}</span>
              </div>
            )
          }
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => set(fieldName, e.target.files[0] || null)}
          />
        </div>
        {src && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); set(fieldName, null); }}
            title="Remove image"
            style={{
              position: "absolute", top: "-7px", right: "-7px",
              width: "20px", height: "20px", borderRadius: "50%",
              background: "#e53e3e", border: "2px solid #fff",
              color: "#fff", fontSize: "11px", fontWeight: 900,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", lineHeight: 1, padding: 0,
            }}
          >×</button>
        )}
      </div>
      {help && <small style={{ fontSize: "11px", color: "#888", lineHeight: 1.4 }}>{help}</small>}
    </div>
  );
}

export default function FormModal({ open, title, entityId, fields = [], initial = {}, onSubmit, onClose }) {
  const [form, setForm] = useState(initial || {});
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    setForm(initial || {});
    setSubmitError("");
    setFieldErrors({});
    setSubmitting(false);
  }, [initial, open]);
  if (!open) return null;
  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const wideTypes = ["textarea", "json", "ordered-multiselect", "artist-role-list", "tags"];
  const requiredNames = new Set(["name", "title", "year", "month", "chart_type", "category", "key"]);
  const sectionFor = (field) => {
    if (field.section) return field.section;
    if (["status", "is_published", "scheduled_for", "published_at", "is_visible", "active", "verified", "featured", "pinned", "breaking", "is_official", "is_hidden"].includes(field.name)) return "Visibility & status";
    if (field.name.endsWith("_url") || ["source_links", "gallery", "tags", "seo_title", "seo_description"].includes(field.name)) return "Links, media & discovery";
    if (["country", "country_code", "city_region", "genre", "label", "distributor", "release_year", "release_date", "isrc", "upc", "number_of_tracks", "artist_type", "biography", "songwriters", "producers", "radio_info", "aliases", "credited_artists"].includes(field.name)) return "Details";
    return "Essentials";
  };
  const sectionOrder = ["Essentials", "Details", "Links, media & discovery", "Visibility & status"];
  const sections = fields.reduce((groups, field) => {
    const section = sectionFor(field);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section).push(field);
    return groups;
  }, new Map());
  const orderedSections = [...sections.entries()].sort(
    ([a], [b]) => (sectionOrder.indexOf(a) < 0 ? 99 : sectionOrder.indexOf(a)) - (sectionOrder.indexOf(b) < 0 ? 99 : sectionOrder.indexOf(b))
  );
  const submit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await onSubmit?.(form);
    } catch (error) {
      const data = error?.data;
      const nextFieldErrors = {};
      if (data && typeof data === "object") {
        Object.entries(data).forEach(([key, value]) => {
          if (key === "detail" || key === "error" || value == null) return;
          const fieldKey = (
            ["primary_artist_ids", "featured_artist_ids"].includes(key) &&
            fields.some((field) => field.name === "artist_credits")
          ) ? "artist_credits" : key;
          const messages = Array.isArray(value) ? value : [value];
          nextFieldErrors[fieldKey] = messages
            .map((message) => typeof message === "object" ? JSON.stringify(message) : String(message))
            .join(" ");
        });
      }
      setFieldErrors(nextFieldErrors);
      setSubmitError(
        data?.detail ||
        data?.error ||
        (Object.keys(nextFieldErrors).length
          ? "Please correct the highlighted fields and save again."
          : error?.message || "The record could not be saved.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cms-modal-backdrop">
      <form className="cms-modal" onSubmit={submit}>
        <div className="cms-modal-head">
          <h3>
            {title}
            {entityId != null && (
              <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 500, color: "#999", letterSpacing: ".04em", verticalAlign: "middle" }}>
                ID&nbsp;{entityId}
              </span>
            )}
          </h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        {submitError && (
          <div className="cms-alert error cms-modal-error" role="alert">
            <ErrorHelpLink message={submitError}>
              <strong>Unable to save.</strong> {submitError}
            </ErrorHelpLink>
          </div>
        )}
        <div className="cms-form-sections">
          {orderedSections.map(([section, sectionFields]) => (
            <section className="cms-form-section" key={section}>
              <h4>{section}</h4>
              <div className="cms-form-grid">
          {sectionFields.map((field) => {
            // File fields render as a standalone div (not a label) so global label CSS doesn't interfere
            if (field.type === "file") {
              return (
                <div key={field.name}>
                  <ImageUploadBox fieldName={field.name} label={field.label} help={field.help} form={form} set={set} />
                </div>
              );
            }
            const wide = wideTypes.includes(field.type);
            const v = form[field.name];
            const fieldError = fieldErrors[field.name];
            const required = field.required ?? requiredNames.has(field.name);
            return (
              <label key={field.name} className={`${wide ? "wide " : ""}${fieldError ? "cms-field-invalid" : ""}`.trim()}>
                <span>{field.label}{required && <b className="cms-required" aria-label="required"> *</b>}</span>
                {field.type === "checkbox" ? (
                  <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(field.name, e.target.checked)} />
                ) : field.type === "textarea" ? (
                  <textarea required={required} value={v || ""} onChange={(e) => set(field.name, e.target.value)} rows={5} />
                ) : field.type === "select" ? (
                  <select required={required} value={v ?? ""} onChange={(e) => set(field.name, e.target.value)}>
                    <option value="">Select...</option>
                    {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                ) : field.type === "ordered-multiselect" ? (
                  <OrderedMultiSelect value={v} options={field.options || []} onChange={(val) => set(field.name, val)} />
                ) : field.type === "artist-role-list" ? (
                  <ArtistRoleList value={v} options={field.options || []} onChange={(val) => set(field.name, val)} />
                ) : field.type === "json" ? (
                  <textarea
                    value={typeof v === "string" ? v : JSON.stringify(v || {}, null, 2)}
                    onChange={(e) => { try { set(field.name, JSON.parse(e.target.value)); } catch { set(field.name, e.target.value); } }}
                    rows={6}
                  />
                ) : field.type === "tags" ? (
                  <TagsInput value={v} onChange={(val) => set(field.name, val)} />
                ) : (
                  <input
                    type={field.type || "text"}
                    required={required}
                    disabled={field.readOnly}
                    value={v ?? ""}
                    onChange={(e) => set(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
                  />
                )}
                {field.help && <small className="cms-help">{field.help}</small>}
                {fieldError && (
                  <small className="cms-field-error" role="alert">
                    <ErrorHelpLink message={fieldError} fieldName={field.name}>
                      {fieldError}
                      {field.example ? ` Expected example: ${field.example}` : ""}
                    </ErrorHelpLink>
                  </small>
                )}
              </label>
            );
          })}
              </div>
            </section>
          ))}
        </div>
        <div className="cms-actions right">
          <button type="button" className="cms-btn light" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="cms-btn" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
