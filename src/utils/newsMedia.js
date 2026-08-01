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

function artistName(artist = {}) {
  return artist?.public_name || artist?.display_name || artist?.name || artist?.artist_name || "";
}

function imageFromArtist(artist = {}) {
  return artist?.image || artist?.image_url || artist?.photo || artist?.cover_image || "";
}

function findRelatedArtist(article = {}, publicArtists = []) {
  const related = article.related_artist;
  if (related && typeof related === "object") return related;
  const relatedId = Number(related ?? article.related_artist_id);
  if (Number.isFinite(relatedId) && relatedId > 0) {
    const byId = publicArtists.find((artist) => Number(artist.id) === relatedId);
    if (byId) return byId;
  }
  const name = article.related_artist_name || article.artist_name || article.primary_artist || "";
  return name ? findArtistMentionedIn(name, publicArtists) : null;
}

function releaseCoverFromArticle(article = {}) {
  const release = article.related_release;
  if (release && typeof release === "object") {
    return release.cover_image || release.image || release.artwork || release.cover_image_url || "";
  }
  return article.related_release_cover || article.release_cover || "";
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
  const isReleaseCover = (item) => item && typeof item === "object" && item.kind === "release_cover";

  pushUnique(media, seen, { url: releaseCoverFromArticle(article), title: article.related_release_title || article.title }, { kind: "release_cover" });
  sourceMedia.filter((item) => isReleaseCover(item) || isArticleCover(item)).forEach((item) => pushUnique(media, seen, item));
  pushUnique(media, seen, { url: article.cover_image, title: article.title }, { kind: "article_cover" });

  const relatedArtist = findRelatedArtist(article, publicArtists);
  const relatedArtistImage = relatedArtist ? getArtistImageUrl(relatedArtist, { name: artistName(relatedArtist), artists: publicArtists, isArtist: true }) : "";
  pushUnique(media, seen, { url: relatedArtistImage || imageFromArtist(relatedArtist), title: artistName(relatedArtist) }, {
    kind: "artist_image",
    entity_type: "artist",
    entity_id: relatedArtist?.id,
    artistName: artistName(relatedArtist),
  });

  (Array.isArray(article.gallery) ? article.gallery : []).forEach((item) => pushUnique(media, seen, item, { kind: "gallery" }));
  sourceMedia.filter((item) => !isArticleCover(item) && !isReleaseCover(item)).forEach((item) => pushUnique(media, seen, item));

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

  return media;
}

export function getPrimaryNewsMedia(article = {}, publicArtists = []) {
  return getNewsMedia(article, publicArtists)[0] || { url: "", artistName: "" };
}
