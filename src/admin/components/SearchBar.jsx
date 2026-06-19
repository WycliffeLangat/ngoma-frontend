export default function SearchBar({ value, onChange, placeholder = "Search CMS..." }) {
  return <input className="cms-search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}
