const UPSTREAM_ORIGIN = "https://movepilot.pages.dev";
const CANONICAL_ORIGIN = "https://relocationstation.app";
const INDEXNOW_KEY = "d390aee0a606d453b3585684871efd3e";
const ROBOTS_META = "<meta name='robots' content='index,follow,max-image-preview:large'>";

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

// --- Edge SEO layer -------------------------------------------------------
// The app is a React SPA served as one shell, so every route would otherwise
// share the homepage's title/description and carry no canonical. The worker
// is the only place that sees the URL before HTML ships, so per-route meta
// lives here. Every string below is derived from the URL itself or restates
// the app's own pitch — no invented facts.

const titleCase = (s) =>
  s
    .split(/[\s-]+/)
    .map((w) => (w.length <= 1 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

// "miami-fl_atlanta-ga" -> { from: "Miami, FL", to: "Atlanta, GA" }
function parseMoveSlug(slug) {
  const parts = slug.split("_");
  if (parts.length !== 2) return null;
  const place = (raw) => {
    const segs = raw.split("-");
    if (segs.length < 2) return null;
    const state = segs.pop().toUpperCase();
    if (state.length !== 2) return null;
    return `${titleCase(segs.join(" "))}, ${state}`;
  };
  const from = place(parts[0]);
  const to = place(parts[1]);
  return from && to ? { from, to } : null;
}

const ROUTE_META = {
  "/tools": {
    title: "Moving calculators: volume, weight, distance, carrier check | MovePilot",
    description:
      "Free moving calculators: cubic volume from your own inventory, shipping weight, distance cost, and FMCSA carrier safety verification. No phone, no email, no lead brokers.",
  },
  "/pricing": {
    title: "MovePilot pricing: what the tools cost",
    description:
      "What MovePilot costs, what is free, and why the moving tools sell math instead of your contact information.",
  },
  "/timeline": {
    title: "Moving timeline: week-by-week plan | MovePilot",
    description:
      "A week-by-week moving timeline built around your actual move date and inventory, not a generic checklist.",
  },
  "/trust": {
    title: "Why to trust MovePilot: data sources and verification",
    description:
      "Where MovePilot's moving math and carrier records come from, how they are verified, and what the tool will never do with your data.",
  },
};

function metaFor(url) {
  const moveMatch = url.pathname.match(/^\/move\/([a-z0-9-]+(?:_[a-z0-9-]+)*)\/?$/i);
  if (moveMatch) {
    const places = parseMoveSlug(moveMatch[1]);
    if (places) {
      return {
        title: `${places.from} to ${places.to} moving costs: the real math | MovePilot`,
        description: `What it actually costs to move from ${places.from} to ${places.to}: distance-based linehaul math, volume and weight from your own inventory, and FMCSA carrier verification. No lead brokers.`,
      };
    }
  }
  return ROUTE_META[url.pathname.replace(/\/$/, "")] ?? null;
}

// Inject canonical + per-route title/description into the shell's <head>.
// The shell ships one <title> and one description meta; this replaces them
// in place and adds canonical + og tags. Text-level replaces on the first
// matching tag only — the app itself does not emit canonicals.
function injectHead(html, url) {
  const canonical = `${CANONICAL_ORIGIN}${url.pathname}`;
  const meta = metaFor(url);

  let out = html.replace(/<head([^>]*)>/i, (m) => `${m}\n<link rel="canonical" href="${canonical}">`);

  if (meta) {
    out = out
      .replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`)
      .replace(
        /<meta\s+name=["']description["']\s+content=["'][^"']*["']/i,
        `<meta name="description" content="${meta.description}"`,
      )
      .replace(
        /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']/i,
        `<meta property="og:title" content="${meta.title}"`,
      )
      .replace(
        /<meta\s+property=["']og:url["']\s+content=["'][^"']*["']/i,
        `<meta property="og:url" content="${canonical}"`,
      );
  }

  if (!/<meta[^>]*name=["']robots["']/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, (m) => `${m}\n${ROBOTS_META}`);
  }

  return out;
}

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);

    // One scheme, one host: http redirects to https (301, cacheable), www to
    // apex (308, permanent). GSC had begun recording http:// variants because
    // the worker answered both schemes with 200.
    if (incomingUrl.protocol === "http:") {
      return Response.redirect(canonicalUrl(incomingUrl), 301);
    }
    if (incomingUrl.hostname === "www.relocationstation.app") {
      return Response.redirect(canonicalUrl(incomingUrl), 308);
    }

    if (incomingUrl.pathname === `/${INDEXNOW_KEY}.txt`) {
      return new Response(INDEXNOW_KEY, {
        status: 200,
        headers: { "content-type": "text/plain", "cache-control": "public, max-age=86400" },
      });
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, UPSTREAM_ORIGIN);
    let upstreamResponse = await fetchUpstream(request, upstreamUrl);

    // Preserve client-side routing for direct visits without masking API errors.
    if (isSpaNavigation(request, incomingUrl, upstreamResponse)) {
      const appShellUrl = new URL("/", UPSTREAM_ORIGIN);
      upstreamResponse = await fetchUpstream(request, appShellUrl);
    }

    const headers = new Headers(upstreamResponse.headers);
    const location = rewriteLocation(headers.get("location"), upstreamUrl);

    if (location) headers.set("location", location);

    const ctype = headers.get("content-type") || "";
    if (
      request.method === "GET" &&
      upstreamResponse.status === 200 &&
      ctype.includes("text/html") &&
      !headers.get("content-encoding")
    ) {
      const html = injectHead(await upstreamResponse.text(), incomingUrl);
      headers.delete("content-length");
      return new Response(html, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers,
      });
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  },
};
