import { resolveMediaUrl } from "../api/config.js";
import { findArtistMentionedIn, getArtistImageUrl } from "./artistImages.js";

function mediaUrl(item) {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return "";
  return item.url || item.src || item.image || item.cover_image || "";
}

function mediaCaption(item) {
  if (!item || typeof item !== "object") return "";
  return item.caption || item.title || "";
}

function pushUnique(items, seen, item, fallback = {}) {
  const rawUrl = mediaUrl(item);
  const url = rawUrl ? resolveMediaUrl(rawUrl) : "";
  if (!url || seen.has(url)) return;
  seen.add(url);
  items.push({
    url,
    caption: mediaCaption(item) || fallback.caption || "",
    title: item?.title || fallback.title || "",
    kind: item?.kind || fallback.kind || "",
    entity_type: item?.entity_type || fallback.entity_type || "",
    entity_id: item?.entity_id ?? fallback.entity_id ?? null,
    artistName: fallback.artistName || "",
  });
}

export function getNewsMedia(article = {}, publicArtists = []) {
  const media = [];
  const seen = new Set();
  const sourceMedia = Array.isArray(article.media) ? article.media : [];
  const isArticleCover = (item) => item && typeof item === "object" && item.kind === "article_cover";

  sourceMedia.filter((item) => !isArticleCover(item)).forEach((item) => pushUnique(media, seen, item));
  (Array.isArray(article.gallery) ? article.gallery : []).forEach((item) => pushUnique(media, seen, item, { kind: "gallery" }));

  if (!media.length) {
    const mentioned = findArtistMentionedIn(`${article.title || ""} ${article.excerpt || ""}`, publicArtists);
    const url = mentioned ? getArtistImageUrl(mentioned, { name: mentioned.name, artists: publicArtists }) : "";
    pushUnique(media, seen, { url, title: mentioned?.name }, {
      kind: "artist_image",
      entity_type: "artist",
      entity_id: mentioned?.id,
      artistName: mentioned?.name || "",
    });
  }

  sourceMedia.filter(isArticleCover).forEach((item) => pushUnique(media, seen, item));
  pushUnique(media, seen, { url: article.cover_image, title: article.title }, { kind: "article_cover" });

  return media;
}

export function getPrimaryNewsMedia(article = {}, publicArtists = []) {
  return getNewsMedia(article, publicArtists)[0] || { url: "", artistName: "" };
}
