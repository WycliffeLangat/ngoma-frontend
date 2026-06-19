export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="cms-modal-backdrop">
      <div className="cms-modal cms-confirm">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="cms-actions right">
          <button className="cms-btn light" onClick={onCancel}>Cancel</button>
          <button className="cms-btn danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
