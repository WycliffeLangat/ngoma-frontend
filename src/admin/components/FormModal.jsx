import { useEffect, useState } from "react";

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

function renderField(field, form, set) {
  const v = form[field.name];
  if (field.type === "checkbox") return <input type="checkbox" checked={Boolean(v)} onChange={(e) => set(field.name, e.target.checked)} />;
  if (field.type === "textarea") return <textarea value={v || ""} onChange={(e) => set(field.name, e.target.value)} rows={5} />;
  if (field.type === "select") return (
    <select value={v ?? ""} onChange={(e) => set(field.name, e.target.value)}>
      <option value="">Select...</option>
      {(field.options || []).map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  );
  if (field.type === "ordered-multiselect") return <OrderedMultiSelect value={v} options={field.options || []} onChange={(val) => set(field.name, val)} />;
  if (field.type === "json") return (
    <textarea
      value={typeof v === "string" ? v : JSON.stringify(v || {}, null, 2)}
      onChange={(e) => { try { set(field.name, JSON.parse(e.target.value)); } catch { set(field.name, e.target.value); } }}
      rows={6}
    />
  );
  if (field.type === "tags") return <TagsInput value={v} onChange={(val) => set(field.name, val)} />;
  return <input type={field.type || "text"} value={v ?? ""} onChange={(e) => set(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)} />;
}

export default function FormModal({ open, title, fields = [], initial = {}, onSubmit, onClose }) {
  const [form, setForm] = useState(initial || {});
  useEffect(() => setForm(initial || {}), [initial, open]);
  if (!open) return null;
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const wideTypes = ["textarea", "json", "ordered-multiselect", "tags"];

  // Separate the file (image) field so it can be shown at the top as a visual upload box
  const fileField = fields.find((f) => f.type === "file");
  const nonFileFields = fields.filter((f) => f.type !== "file");
  // Pair the image box with the first text field (title / artist name)
  const titleField = fileField ? nonFileFields[0] : null;
  const bodyFields = fileField ? nonFileFields.slice(1) : nonFileFields;

  const fileValue = fileField ? form[fileField.name] : null;
  const imgSrc = fileValue instanceof File
    ? URL.createObjectURL(fileValue)
    : (typeof fileValue === "string" && fileValue ? fileValue : null);

  return (
    <div className="cms-modal-backdrop">
      <form className="cms-modal" onSubmit={(e) => { e.preventDefault(); onSubmit?.(form); }}>
        <div className="cms-modal-head"><h3>{title}</h3><button type="button" onClick={onClose}>×</button></div>

        {/* Image upload box pinned to top-left, title/name input alongside it */}
        {fileField && (
          <div className="cms-form-top">
            <label className="cms-cover-upload" title={imgSrc ? "Click to replace image" : "Click to upload image"}>
              {imgSrc
                ? <img src={imgSrc} alt="" />
                : (
                  <span className="cms-cover-placeholder">
                    <span className="cms-cover-plus">+</span>
                    <small>{fileField.label}</small>
                  </span>
                )
              }
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => set(fileField.name, e.target.files[0] || null)} />
            </label>
            {titleField && (
              <label className="cms-form-top-title">
                <span>{titleField.label}</span>
                <input type={titleField.type || "text"} value={form[titleField.name] ?? ""} onChange={(e) => set(titleField.name, e.target.value)} />
                {titleField.help && <small className="cms-help">{titleField.help}</small>}
              </label>
            )}
          </div>
        )}

        <div className="cms-form-grid">
          {bodyFields.map((field) => (
            <label key={field.name} className={wideTypes.includes(field.type) ? "wide" : ""}>
              <span>{field.label}</span>
              {renderField(field, form, set)}
              {field.help && <small className="cms-help">{field.help}</small>}
            </label>
          ))}
        </div>

        <div className="cms-actions right">
          <button type="button" className="cms-btn light" onClick={onClose}>Cancel</button>
          <button className="cms-btn">Save</button>
        </div>
      </form>
    </div>
  );
}
