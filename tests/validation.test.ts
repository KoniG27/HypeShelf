import test from "node:test";
import assert from "node:assert/strict";
import { validateRecommendationInput } from "../convex/validation";

// Keep tests focused on critical server-side normalization and safety checks.
test("valid recommendation input is normalized", () => {
  const parsed = validateRecommendationInput({
    title: "  The Thing ",
    genre: " Horror ",
    link: "https://example.com/watch",
    blurb: " Great practical effects. ",
  });

  assert.equal(parsed.title, "The Thing");
  assert.equal(parsed.genre, "horror");
  assert.equal(parsed.blurb, "Great practical effects.");
  assert.equal(parsed.link, "https://example.com/watch");
});

test("invalid protocol is rejected", () => {
  assert.throws(
    () =>
      validateRecommendationInput({
        title: "x",
        genre: "horror",
        link: "javascript:alert(1)",
        blurb: "x",
      }),
    /Link protocol must be http or https/,
  );
});

test("long title is rejected", () => {
  assert.throws(
    () =>
      validateRecommendationInput({
        title: "a".repeat(121),
        genre: "horror",
        link: "https://example.com",
        blurb: "x",
      }),
    /Title must be between 1 and 120 characters/,
  );
});

test("control characters are rejected", () => {
  assert.throws(
    () =>
      validateRecommendationInput({
        title: "ok\u0000bad",
        genre: "horror",
        link: "https://example.com",
        blurb: "x",
      }),
    /invalid control characters/,
  );
});

test("local/private hosts are rejected", () => {
  assert.throws(
    () =>
      validateRecommendationInput({
        title: "x",
        genre: "horror",
        link: "http://localhost:3000",
        blurb: "x",
      }),
    /Private or local network links are not allowed/,
  );
});

test("domain allowlist is enforced when configured", () => {
  process.env.RECOMMENDATION_DOMAIN_ALLOWLIST = "example.com";
  assert.throws(
    () =>
      validateRecommendationInput({
        title: "x",
        genre: "horror",
        link: "https://another.com/movie",
        blurb: "x",
      }),
    /allowlist/,
  );
  const ok = validateRecommendationInput({
    title: "x",
    genre: "horror",
    link: "https://sub.example.com/movie",
    blurb: "x",
  });
  assert.equal(ok.link, "https://sub.example.com/movie");
  delete process.env.RECOMMENDATION_DOMAIN_ALLOWLIST;
});
