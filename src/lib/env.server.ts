import { z } from "zod";

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  SHOPIFY_ADMIN_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: z.string().optional(),
  SHOPIFY_STOREFRONT_ACCESS_TOKEN: z.string().optional(),
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
});

export function getServerEnv() {
  return envSchema.parse(process.env);
}

export function getIntegrationStatus() {
  const env = getServerEnv();

  return {
    openaiReady: Boolean(env.OPENAI_API_KEY),
    shopifyReady: Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    ordersReady: Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_ADMIN_ACCESS_TOKEN),
    customerAuthReady: Boolean(env.SHOPIFY_STORE_DOMAIN && env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID),
    model: env.OPENAI_MODEL ?? "gpt-5-mini",
    storeDomain: env.SHOPIFY_STORE_DOMAIN ?? null,
  };
}
