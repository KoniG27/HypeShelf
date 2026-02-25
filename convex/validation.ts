const TITLE_MAX = 120;
const GENRE_MAX = 32;
const BLURB_MAX = 240;

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

export function validateRecommendationInput(input: RecommendationInput) {
  // Normalize all string fields before validation to keep filtering/storage consistent.
  const title = input.title.trim();
  const genre = input.genre.trim().toLowerCase();
  const blurb = input.blurb.trim();
  const link = input.link.trim();

  requireLength("Title", title, TITLE_MAX);
  requireLength("Genre", genre, GENRE_MAX);
  requireLength("Blurb", blurb, BLURB_MAX);

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

  return { title, genre, blurb, link: parsed.toString() };
}
