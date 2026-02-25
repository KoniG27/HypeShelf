import { mutation, query } from "./_generated/server";
import { requireIdentity } from "./auth";

type Role = "admin" | "user";

function normalize(value?: string): string | undefined {
  const clean = value?.trim().toLowerCase();
  return clean || undefined;
}

function bootstrapRole(params: {
  clerkUserId: string;
  email?: string;
}): Role {
  // Environment-based bootstrap keeps role assignment server-side and explicit.
  const adminId = normalize(process.env.ADMIN_CLERK_USER_ID);
  const adminEmail = normalize(process.env.ADMIN_EMAIL);

  if (adminId && params.clerkUserId.toLowerCase() === adminId) {
    return "admin";
  }
  if (adminEmail && params.email && params.email === adminEmail) {
    return "admin";
  }
  return "user";
}

export const getOrCreateMe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const resolvedRole = bootstrapRole(identity);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.clerkUserId),
      )
      .unique();

    if (existing) {
      // Keep profile data in sync and allow role promotion/demotion via env config.
      if (existing.name !== identity.name || existing.role !== resolvedRole) {
        await ctx.db.patch(existing._id, {
          name: identity.name,
          role: resolvedRole,
        });
      }
      return await ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("users", {
      clerkUserId: identity.clerkUserId,
      name: identity.name,
      role: resolvedRole,
      createdAt: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    // Query is safe for client polling and returns null when signed out.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
  },
});
