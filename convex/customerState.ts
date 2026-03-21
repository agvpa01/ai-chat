"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

const workoutActivityEntryValidator = v.object({
  id: v.string(),
  workoutSlug: v.string(),
  workoutName: v.string(),
  type: v.union(v.literal("started"), v.literal("completed")),
  completedExercises: v.number(),
  totalExercises: v.number(),
  timestamp: v.number(),
});

type ConnectedCustomer = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

type WorkoutActivityEntry = {
  id: string;
  workoutSlug: string;
  workoutName: string;
  type: "started" | "completed";
  completedExercises: number;
  totalExercises: number;
  timestamp: number;
};

type CustomerAccountDiscovery = {
  graphql_api: string;
};

type StoredCustomerState = {
  currentThreadId: string;
  threads: unknown[];
  workoutActivity: WorkoutActivityEntry[];
  lastActivitySeenAt: number;
  updatedAt: number;
  sessionExpiresAt?: string | null;
};

type LoadConnectedStateResult = {
  customer: ConnectedCustomer;
  currentThreadId: string;
  threads: unknown[];
  workoutActivity: WorkoutActivityEntry[];
  lastActivitySeenAt: number;
  updatedAt: number;
  sessionExpiresAt: string | null;
};

const customerStateStoreApi = internal.customerStateStore as any;

export const loadConnectedState = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<LoadConnectedStateResult> => {
    const customer = await resolveConnectedCustomer(args.accessToken);
    const existing: StoredCustomerState | null = await ctx.runQuery(
      customerStateStoreApi.getByShopifyCustomerId,
      {
        shopifyCustomerId: customer.id,
      },
    );

    return {
      customer,
      currentThreadId: existing?.currentThreadId ?? "",
      threads: existing?.threads ?? [],
      workoutActivity: existing?.workoutActivity ?? [],
      lastActivitySeenAt: existing?.lastActivitySeenAt ?? 0,
      updatedAt: existing?.updatedAt ?? 0,
      sessionExpiresAt: existing?.sessionExpiresAt ?? null,
    };
  },
});

export const saveConnectedState = action({
  args: {
    accessToken: v.string(),
    sessionExpiresAt: v.string(),
    currentThreadId: v.string(),
    threads: v.array(v.any()),
    workoutActivity: v.array(workoutActivityEntryValidator),
    lastActivitySeenAt: v.number(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    ok: true;
    customerId: string;
  }> => {
    const customer = await resolveConnectedCustomer(args.accessToken);

    await ctx.runMutation(customerStateStoreApi.upsertByShopifyCustomerId, {
      shopifyCustomerId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      displayName: customer.displayName,
      sessionExpiresAt: args.sessionExpiresAt,
      currentThreadId: args.currentThreadId,
      threads: args.threads,
      workoutActivity: args.workoutActivity,
      lastActivitySeenAt: args.lastActivitySeenAt,
      updatedAt: Date.now(),
    });

    return {
      ok: true as const,
      customerId: customer.id,
    };
  },
});

async function resolveConnectedCustomer(accessToken: string) {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;

  if (!storeDomain) {
    throw new Error(
      "Shopify customer state sync is not configured. Add SHOPIFY_STORE_DOMAIN first.",
    );
  }

  const accountConfig = await getCustomerAccountDiscovery(storeDomain);

  return await fetchConnectedCustomer(accountConfig.graphql_api, accessToken);
}

async function getCustomerAccountDiscovery(storeDomain: string) {
  const response = await fetch(`https://${storeDomain}/.well-known/customer-account-api`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "VPA Coach Customer State",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify customer account discovery failed with ${response.status}`);
  }

  return (await response.json()) as CustomerAccountDiscovery;
}

async function fetchConnectedCustomer(graphqlEndpoint: string, accessToken: string) {
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
      "User-Agent": "VPA Coach Customer State",
    },
    body: JSON.stringify({
      query: `
        query ConnectedCustomer {
          customer {
            id
            firstName
            lastName
            displayName
            emailAddress {
              emailAddress
            }
          }
        }
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify customer profile request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      customer?: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        displayName: string | null;
        emailAddress: {
          emailAddress: string;
        } | null;
      } | null;
    };
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  const customer = payload.data?.customer;

  if (!customer?.emailAddress?.emailAddress) {
    throw new Error("Connected Shopify customer profile did not include an email address.");
  }

  return {
    id: customer.id,
    email: customer.emailAddress.emailAddress,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName:
      customer.displayName?.trim() ||
      [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
      customer.emailAddress.emailAddress,
  } satisfies ConnectedCustomer;
}
