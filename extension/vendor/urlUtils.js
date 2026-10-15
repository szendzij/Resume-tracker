// shared/utils/urlUtils.ts
function normalizeJobUrl(rawUrl) {
  if (!rawUrl) return "";
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    const trackingPrefixes = ["utm_", "gad_"];
    const exactTrackingParams = /* @__PURE__ */ new Set([
      "gclid",
      "gbraid",
      "eclid",
      "fbclid",
      "refid",
      "trackingid",
      "origin",
      "origintolandingjobpostings",
      "ebp",
      "campaignid",
      "adgroupid",
      "keyword",
      "searchid",
      "source",
      "s"
    ]);
    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      const isTracking = exactTrackingParams.has(lowerKey) || trackingPrefixes.some((prefix) => lowerKey.startsWith(prefix));
      if (!isTracking) {
        cleanParams.append(key, val);
      }
    });
    const queryString = cleanParams.toString();
    const cleanProtocol = parsed.protocol.toLowerCase();
    return `${cleanProtocol}//${host}${pathname}${queryString ? `?${queryString}` : ""}`;
  } catch {
    return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
}
export {
  normalizeJobUrl
};
