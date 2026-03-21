import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

const workoutActivityEntryValidator = v.object({
  id: v.string(),
  workoutSlug: v.string(),
  workoutName: v.string(),
  type: v.union(v.literal("started"), v.literal("completed")),
  completedExercises: v.number(),
  totalExercises: v.number(),
  timestamp: v.number(),
});

export const getByShopifyCustomerId = internalQuery({
  args: {
    shopifyCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customerStates")
      .withIndex("by_shopify_customer_id", (q) => q.eq("shopifyCustomerId", args.shopifyCustomerId))
      .unique();
  },
});

export const upsertByShopifyCustomerId = internalMutation({
  args: {
    shopifyCustomerId: v.string(),
    email: v.string(),
    firstName: v.union(v.string(), v.null()),
    lastName: v.union(v.string(), v.null()),
    displayName: v.string(),
    sessionExpiresAt: v.optional(v.string()),
    currentThreadId: v.string(),
    threads: v.array(v.any()),
    workoutActivity: v.array(workoutActivityEntryValidator),
    lastActivitySeenAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("customerStates")
      .withIndex("by_shopify_customer_id", (q) => q.eq("shopifyCustomerId", args.shopifyCustomerId))
      .unique();

    const payload = {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: args.displayName,
      sessionExpiresAt: args.sessionExpiresAt,
      currentThreadId: args.currentThreadId,
      threads: args.threads,
      workoutActivity: args.workoutActivity,
      lastActivitySeenAt: args.lastActivitySeenAt,
      updatedAt: args.updatedAt,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("customerStates", {
      shopifyCustomerId: args.shopifyCustomerId,
      ...payload,
    });
  },
});
