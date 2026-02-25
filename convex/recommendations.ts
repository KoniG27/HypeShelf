import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireIdentity } from "./auth";
import { validateRecommendationInput } from "./validation";
import { enforceRateLimit } from "./rateLimit";

async function writeAuditLog(args: {
  ctx: MutationCtx;
  action:
    | "create_recommendation"
    | "delete_recommendation"
    | "set_staff_pick"
    | "unset_staff_pick";
  actorUserId: string;
  actorRole: "admin" | "user";
  targetId?: string;
  targetTitle?: string;
}) {
  // Record sensitive mutations for lightweight traceability.
  await args.ctx.db.insert("audit_logs", {
    action: args.action,
    actorUserId: args.actorUserId,
    actorRole: args.actorRole,
    targetId: args.targetId,
    targetTitle: args.targetTitle,
    createdAt: Date.now(),
  });
}

export const listLatestPublic = query({
  args: {},
  handler: async (ctx) => {
    // Public home feed: small, recent, read-only.
    return await ctx.db
      .query("recommendations")
      .withIndex("by_createdAt")
      .order("desc")
      .take(5);
  },
});

export const listAll = query({
  args: {
    genre: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const genre = args.genre?.trim().toLowerCase();
    if (genre) {
      // Use compound index for efficient filtered + sorted reads.
      return await ctx.db
        .query("recommendations")
        .withIndex("by_genre_createdAt", (q) => q.eq("genre", genre))
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("recommendations")
      .withIndex("by_createdAt")
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    genre: v.string(),
    link: v.string(),
    blurb: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.clerkUserId))
      .unique();
    if (!me) {
      throw new Error("Profile not initialized");
    }
    await enforceRateLimit({
      ctx,
      action: "createRecommendation",
      actorUserId: identity.clerkUserId,
    });

    const clean = validateRecommendationInput(args);
    const recommendationId = await ctx.db.insert("recommendations", {
      title: clean.title,
      genre: clean.genre,
      link: clean.link,
      blurb: clean.blurb,
      userId: identity.clerkUserId,
      userName: me.name,
      createdAt: Date.now(),
      staffPick: false,
    });
    await writeAuditLog({
      ctx,
      action: "create_recommendation",
      actorUserId: identity.clerkUserId,
      actorRole: me.role,
      targetId: recommendationId,
      targetTitle: clean.title,
    });
    return recommendationId;
  },
});

export const deleteRecommendation = mutation({
  args: {
    recommendationId: v.id("recommendations"),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.clerkUserId))
      .unique();
    if (!me) {
      throw new Error("Profile not initialized");
    }
    await enforceRateLimit({
      ctx,
      action: "deleteRecommendation",
      actorUserId: identity.clerkUserId,
    });

    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation) {
      throw new Error("Recommendation not found");
    }

    // Authorization is enforced server-side: admin or owner only.
    const canDelete =
      me.role === "admin" || recommendation.userId === identity.clerkUserId;
    if (!canDelete) {
      throw new Error("Forbidden");
    }

    await ctx.db.delete(args.recommendationId);
    await writeAuditLog({
      ctx,
      action: "delete_recommendation",
      actorUserId: identity.clerkUserId,
      actorRole: me.role,
      targetId: args.recommendationId,
      targetTitle: recommendation.title,
    });
  },
});

export const setStaffPick = mutation({
  args: {
    recommendationId: v.id("recommendations"),
    value: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.clerkUserId))
      .unique();
    if (!me || me.role !== "admin") {
      throw new Error("Admin role required");
    }
    await enforceRateLimit({
      ctx,
      action: "setStaffPick",
      actorUserId: identity.clerkUserId,
    });

    const target = await ctx.db.get(args.recommendationId);
    if (!target) {
      throw new Error("Recommendation not found");
    }

    if (args.value) {
      // Enforce single staff pick invariant by clearing any existing picks first.
      const currentPicks = await ctx.db
        .query("recommendations")
        .filter((q) => q.eq(q.field("staffPick"), true))
        .collect();
      for (const pick of currentPicks) {
        if (pick._id !== args.recommendationId) {
          await ctx.db.patch(pick._id, { staffPick: false });
          await writeAuditLog({
            ctx,
            action: "unset_staff_pick",
            actorUserId: identity.clerkUserId,
            actorRole: me.role,
            targetId: pick._id,
            targetTitle: pick.title,
          });
        }
      }
    }

    await ctx.db.patch(args.recommendationId, { staffPick: args.value });
    await writeAuditLog({
      ctx,
      action: args.value ? "set_staff_pick" : "unset_staff_pick",
      actorUserId: identity.clerkUserId,
      actorRole: me.role,
      targetId: args.recommendationId,
      targetTitle: target.title,
    });
  },
});
