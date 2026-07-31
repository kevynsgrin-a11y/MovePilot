const UPSTREAM_ORIGIN = "https://movepilot-theta.vercel.app";
const CANONICAL_ORIGIN = "https://relocationstation.app";

function canonicalUrl(url) {
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
}

function rewriteLocation(location, upstreamUrl) {
  if (!location) return null;

  const target = new URL(location, upstreamUrl);
  if (target.origin !== UPSTREAM_ORIGIN) return location;

  return canonicalUrl(target);
}

function isSpaNavigation(request, url, response) {
  return (
    request.method === "GET" &&
    response.status === 404 &&
    !url.pathname.startsWith("/api/") &&
    request.headers.get("accept")?.includes("text/html")
  );
}

async function fetchUpstream(request, upstreamUrl) {
  const upstreamRequest = new Request(upstreamUrl, request);
  return fetch(upstreamRequest, { redirect: "manual" });
}

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    if (incomingUrl.hostname === "www.relocationstation.app") {
      return Response.redirect(canonicalUrl(incomingUrl), 308);
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, UPSTREAM_ORIGIN);
    let upstreamResponse = await fetchUpstream(request, upstreamUrl);

    // The v0/Vercel export currently serves only its root document. Preserve
    // client-side routing for direct visits without masking real API failures.
    if (isSpaNavigation(request, incomingUrl, upstreamResponse)) {
      const appShellUrl = new URL("/", UPSTREAM_ORIGIN);
      upstreamResponse = await fetchUpstream(request, appShellUrl);
    }

    const headers = new Headers(upstreamResponse.headers);
    const location = rewriteLocation(headers.get("location"), upstreamUrl);

    if (location) headers.set("location", location);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  },
};
