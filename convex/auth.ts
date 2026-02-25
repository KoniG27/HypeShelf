import { MutationCtx, QueryCtx } from "./_generated/server";

type AuthCtx = MutationCtx | QueryCtx;

export async function requireIdentity(ctx: AuthCtx) {
  // Centralized auth gate used by all protected queries/mutations.
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const name =
    identity.name?.trim() ||
    [identity.givenName, identity.familyName].filter(Boolean).join(" ").trim() ||
    "Anonymous";

  return {
    clerkUserId: identity.subject,
    name,
    email:
      typeof identity.email === "string"
        ? identity.email.toLowerCase().trim()
        : undefined,
  };
}
