import CertificationIcon from "../../components/CertificationIcon.jsx";
import { certificationLabel } from "../../utils/certificationBranding.js";
export default function StatusBadge({ value = "draft" }) {
  const status = String(value || "draft").toLowerCase();
  return <span className={`cms-status cms-status-${status.replace(/_/g, "-")}`}><CertificationIcon level={status} /> {certificationLabel(String(value || "draft")).replace(/_/g, " ")}</span>;
}
