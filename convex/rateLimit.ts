import { MutationCtx } from "./_generated/server";

type BucketConfig = {
  max: number;
  windowMs: number;
};

const LIMITS: Record<string, BucketConfig> = {
  createRecommendation: { max: 10, windowMs: 60_000 },
  deleteRecommendation: { max: 12, windowMs: 60_000 },
  setStaffPick: { max: 20, windowMs: 60_000 },
};

export async function enforceRateLimit(args: {
  ctx: MutationCtx;
  action: keyof typeof LIMITS;
  actorUserId: string;
}) {
  const now = Date.now();
  const config = LIMITS[args.action];
  const key = `${args.action}:${args.actorUserId}`;

  const existing = await args.ctx.db
    .query("mutation_rate_limits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();

  if (!existing || now - existing.windowStart >= config.windowMs) {
    if (existing) {
      await args.ctx.db.patch(existing._id, {
        windowStart: now,
        count: 1,
      });
    } else {
      await args.ctx.db.insert("mutation_rate_limits", {
        key,
        windowStart: now,
        count: 1,
      });
    }
    return;
  }

  if (existing.count >= config.max) {
    throw new Error("Too many requests. Please try again shortly.");
  }

  await args.ctx.db.patch(existing._id, {
    count: existing.count + 1,
  });
}
