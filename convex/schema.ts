import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
    createdAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),
  recommendations: defineTable({
    title: v.string(),
    genre: v.string(),
    link: v.string(),
    blurb: v.string(),
    userId: v.string(),
    userName: v.string(),
    createdAt: v.number(),
    staffPick: v.boolean(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_genre_createdAt", ["genre", "createdAt"]),
  // Minimal append-only trace for sensitive recommendation mutations.
  audit_logs: defineTable({
    action: v.union(
      v.literal("create_recommendation"),
      v.literal("delete_recommendation"),
      v.literal("set_staff_pick"),
      v.literal("unset_staff_pick"),
    ),
    actorUserId: v.string(),
    actorRole: v.union(v.literal("admin"), v.literal("user")),
    targetId: v.optional(v.string()),
    targetTitle: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  mutation_rate_limits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});
