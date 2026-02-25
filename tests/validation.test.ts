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
