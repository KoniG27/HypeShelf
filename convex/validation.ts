const TITLE_MAX = 120;
const GENRE_MAX = 32;
const BLURB_MAX = 240;
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F]/;
const PRIVATE_IPV4_REGEX =
  /^(10\.)|(127\.)|(169\.254\.)|(192\.168\.)|(172\.(1[6-9]|2\d|3[0-1])\.)/;

export type RecommendationInput = {
  title: string;
  genre: string;
  link: string;
  blurb: string;
};

function requireLength(field: string, value: string, max: number) {
  if (!value || value.length > max) {
    throw new Error(`${field} must be between 1 and ${max} characters`);
  }
}

function assertNoControlChars(field: string, value: string) {
  if (CONTROL_CHAR_REGEX.test(value)) {
    throw new Error(`${field} contains invalid control characters`);
  }
}

function parseDomainAllowlist(raw?: string): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return true;
  return PRIVATE_IPV4_REGEX.test(host);
}

export function validateRecommendationInput(input: RecommendationInput) {
  // Normalize all string fields before validation to keep filtering/storage consistent.
  const title = input.title.normalize("NFKC").trim();
  const genre = input.genre.normalize("NFKC").trim().toLowerCase();
  const blurb = input.blurb.normalize("NFKC").trim();
  const link = input.link.trim();

  requireLength("Title", title, TITLE_MAX);
  requireLength("Genre", genre, GENRE_MAX);
  requireLength("Blurb", blurb, BLURB_MAX);
  assertNoControlChars("Title", title);
  assertNoControlChars("Genre", genre);
  assertNoControlChars("Blurb", blurb);

  let parsed: URL;
  try {
    parsed = new URL(link);
  } catch {
    throw new Error("Link must be a valid URL");
  }
  // Restrict to web-safe protocols and reject javascript/data schemes.
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Link protocol must be http or https");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Private or local network links are not allowed");
  }

  const allowedDomains = parseDomainAllowlist(
    process.env.RECOMMENDATION_DOMAIN_ALLOWLIST,
  );
  if (allowedDomains.size > 0) {
    const host = parsed.hostname.toLowerCase();
    const isAllowed = Array.from(allowedDomains).some(
      (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    if (!isAllowed) {
      throw new Error("Link domain is not in the allowlist");
    }
  }

  return { title, genre, blurb, link: parsed.toString() };
}
