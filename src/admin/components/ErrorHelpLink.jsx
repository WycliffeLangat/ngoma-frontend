import { buildHelpCenterUrl, matchCmsErrorHelp } from "../helpCenterLinks";

export default function ErrorHelpLink({
  message,
  fieldName = "",
  fallbackArticleId = "",
  fallbackTitle = "Help Center article",
  children,
  className = "",
}) {
  const help = matchCmsErrorHelp(message, fieldName) || (
    fallbackArticleId
      ? {
          id: fallbackArticleId,
          title: fallbackTitle,
          href: buildHelpCenterUrl(fallbackArticleId, { section: "errors", focus: "fixes" }),
        }
      : null
  );

  if (!help) return children;

  return (
    <a
      className={`cms-error-help-link${className ? ` ${className}` : ""}`}
      href={help.href}
      target="_blank"
      rel="noreferrer"
      title={`Open suggested fixes: ${help.title}`}
    >
      <span className="cms-error-help-copy">{children}</span>
      <span className="cms-error-help-chip">Suggested fixes</span>
    </a>
  );
}
