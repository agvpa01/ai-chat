import { action, query } from "./_generated/server";

const workoutTemplates = [
  {
    slug: "ignite-hiit",
    name: "Ignite HIIT",
    goal: "Fat-loss and conditioning",
    level: "Beginner to intermediate",
    durationMinutes: 24,
  },
  {
    slug: "strength-builder",
    name: "Strength Builder",
    goal: "Muscle gain and progression",
    level: "Intermediate",
    durationMinutes: 38,
  },
  {
    slug: "reset-recovery",
    name: "Reset Recovery",
    goal: "Mobility and recovery",
    level: "Any level",
    durationMinutes: 18,
  },
];

const productTemplates = [
  {
    slug: "whey-isolate",
    title: "Whey Protein Isolate",
    category: "Recovery",
    priceLabel: "From $69",
  },
  {
    slug: "pre-workout",
    title: "Pre-Workout",
    category: "Energy",
    priceLabel: "From $49",
  },
  {
    slug: "creatine",
    title: "Creatine",
    category: "Strength",
    priceLabel: "From $29",
  },
  {
    slug: "electrolytes",
    title: "Electrolytes",
    category: "Hydration",
    priceLabel: "From $24",
  },
];

export const overview = query({
  args: {},
  handler: async () => {
    return {
      workouts: workoutTemplates,
      products: productTemplates,
      status: {
        shopify: "pending_connection",
        openai: "pending_connection",
        orders: "requires_authenticated_customer",
      },
    };
  },
});

export const requiredEnvNames = query({
  args: {},
  handler: async () => {
    return [
      "OPENAI_API_KEY",
      "OPENAI_MODEL",
      "SHOPIFY_STORE_DOMAIN",
      "SHOPIFY_STOREFRONT_ACCESS_TOKEN",
      "SHOPIFY_ADMIN_ACCESS_TOKEN",
      "SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID",
    ];
  },
});

export const envStatus = action({
  args: {},
  handler: async () => {
    "use node";

    return {
      openaiReady: Boolean(process.env.OPENAI_API_KEY),
      shopifyReady: Boolean(
        process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
      ),
      ordersReady: Boolean(
        process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      ),
      customerAuthReady: Boolean(
        process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
      ),
      model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    };
  },
});
