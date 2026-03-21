import { getServerEnv } from "./env.server";

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  description: string;
  price: string;
  imageUrl: string | null;
};

export type ShopifyStoreSnapshot = {
  shopName: string;
  description: string;
  products: ShopifyProduct[];
  source: "admin";
};

export async function getShopifyStoreSnapshot(): Promise<ShopifyStoreSnapshot | null> {
  const env = getServerEnv();

  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    return null;
  }

  const adminResponse = await fetch(
    `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-10/graphql.json`,
    {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: `
          query AdminStoreSnapshot {
            shop {
              name
              description
            }
            products(first: 6, reverse: true) {
              nodes {
                id
                title
                handle
                description
                featuredImage {
                  url
                }
                priceRangeV2 {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        `,
      }),
    },
  );

  if (!adminResponse.ok) {
    throw new Error(`Shopify admin request failed with ${adminResponse.status}`);
  }

  const adminPayload = (await adminResponse.json()) as {
    data?: {
      shop: {
        name: string;
        description: string;
      };
      products: {
        nodes: Array<{
          id: string;
          title: string;
          handle: string;
          description: string;
          featuredImage: { url: string } | null;
          priceRangeV2: {
            minVariantPrice: {
              amount: string;
              currencyCode: string;
            };
          };
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (adminPayload.errors?.length) {
    throw new Error(adminPayload.errors.map((error) => error.message).join(", "));
  }

  if (!adminPayload.data) {
    return null;
  }

  return {
    shopName: adminPayload.data.shop.name,
    description: adminPayload.data.shop.description,
    source: "admin",
    products: adminPayload.data.products.nodes.map((product) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      imageUrl: product.featuredImage?.url ?? null,
      price: `${product.priceRangeV2.minVariantPrice.currencyCode} ${product.priceRangeV2.minVariantPrice.amount}`,
    })),
  };
}

export async function lookupOrdersByEmail(email: string) {
  const env = getServerEnv();

  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
    return [];
  }

  const response = await fetch(
    `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-10/graphql.json`,
    {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: `
          query OrdersByEmail($query: String!) {
            orders(first: 5, query: $query, reverse: true) {
              nodes {
                id
                name
                displayFinancialStatus
                displayFulfillmentStatus
                createdAt
              }
            }
          }
        `,
        variables: {
          query: `email:${email}`,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Shopify admin request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      orders: {
        nodes: Array<{
          id: string;
          name: string;
          displayFinancialStatus: string;
          displayFulfillmentStatus: string | null;
          createdAt: string;
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  return payload.data?.orders.nodes ?? [];
}
