import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  CustomerAuthFieldErrors,
  CustomerAuthMode,
  CustomerAuthResponse,
  CustomerAuthSession,
} from "./customer-auth";
import { getServerEnv } from "./env.server";

const loginInputSchema = z.object({
  mode: z.literal("login"),
  email: z.string().email(),
  password: z.string().min(1, "Password is required."),
});

const registerInputSchema = z.object({
  mode: z.literal("register"),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().optional(),
  email: z.string().email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password must be 100 characters or less."),
});

const customerAuthInputSchema = z.discriminatedUnion("mode", [
  loginInputSchema,
  registerInputSchema,
]);

type ShopifyCustomer = CustomerAuthSession["customer"];

type ShopifyUserError = {
  field: string[] | null;
  message: string;
};

type StorefrontResponse<TData> = {
  data?: TData;
  errors?: Array<{ message: string }>;
};

export const authenticateCustomer = createServerFn({ method: "POST" })
  .inputValidator(customerAuthInputSchema)
  .handler(async ({ data }) => {
    if (data.mode === "register") {
      return registerCustomer(data);
    }

    return loginCustomer(data);
  });

async function registerCustomer(input: z.infer<typeof registerInputSchema>) {
  const registrationData = await storefrontRequest<{
    customerCreate: {
      customer: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        displayName: string;
      } | null;
      customerUserErrors: ShopifyUserError[];
    };
  }>(
    `
      mutation RegisterCustomer($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
            displayName
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `,
    {
      input: {
        firstName: input.firstName,
        lastName: input.lastName?.trim() || undefined,
        email: input.email,
        password: input.password,
      },
    },
  );

  const registrationErrors = registrationData.customerCreate.customerUserErrors;

  if (registrationErrors.length > 0) {
    return buildErrorResponse("register", registrationErrors);
  }

  const loginResult = await createCustomerSession({
    mode: "register",
    email: input.email,
    password: input.password,
  });

  if (!loginResult.ok) {
    return loginResult;
  }

  const displayName =
    registrationData.customerCreate.customer?.displayName ||
    loginResult.session.customer.displayName;

  return {
    ...loginResult,
    message: `Your account is ready${displayName ? `, ${displayName}` : ""}. You’re now signed in.`,
    session: {
      ...loginResult.session,
      customer: {
        ...loginResult.session.customer,
        displayName,
      },
    },
  } satisfies CustomerAuthResponse;
}

async function loginCustomer(input: z.infer<typeof loginInputSchema>) {
  const sessionResult = await createCustomerSession(input);

  if (!sessionResult.ok) {
    return sessionResult;
  }

  const displayName = sessionResult.session.customer.displayName;

  return {
    ...sessionResult,
    message: `Welcome back${displayName ? `, ${displayName}` : ""}. You’re signed in.`,
  } satisfies CustomerAuthResponse;
}

async function createCustomerSession(input: {
  mode: CustomerAuthMode;
  email: string;
  password: string;
}): Promise<CustomerAuthResponse> {
  const tokenData = await storefrontRequest<{
    customerAccessTokenCreate: {
      customerAccessToken: {
        accessToken: string;
        expiresAt: string;
      } | null;
      customerUserErrors: ShopifyUserError[];
    };
  }>(
    `
      mutation CreateCustomerAccessToken($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `,
    {
      input: {
        email: input.email,
        password: input.password,
      },
    },
  );

  const tokenErrors = tokenData.customerAccessTokenCreate.customerUserErrors;

  if (tokenErrors.length > 0 || !tokenData.customerAccessTokenCreate.customerAccessToken) {
    return buildErrorResponse(input.mode, tokenErrors);
  }

  const token = tokenData.customerAccessTokenCreate.customerAccessToken;
  const customer = await getCustomerProfile(token.accessToken);

  return {
    ok: true,
    mode: input.mode,
    message: "Customer authenticated.",
    session: {
      accessToken: token.accessToken,
      expiresAt: token.expiresAt,
      customer,
    },
  } satisfies CustomerAuthResponse;
}

async function getCustomerProfile(accessToken: string): Promise<ShopifyCustomer> {
  const customerData = await storefrontRequest<{
    customer: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string;
    } | null;
  }>(
    `
      query CurrentCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          email
          firstName
          lastName
          displayName
        }
      }
    `,
    {
      customerAccessToken: accessToken,
    },
  );

  if (!customerData.customer) {
    throw new Error("Shopify customer profile was not returned.");
  }

  return normalizeCustomer(customerData.customer);
}

function buildErrorResponse(
  mode: CustomerAuthMode,
  errors: ShopifyUserError[],
): CustomerAuthResponse {
  const fieldErrors = errors.reduce<CustomerAuthFieldErrors>((accumulator, error) => {
    const firstField = error.field?.[0];

    if (
      firstField === "email" ||
      firstField === "password" ||
      firstField === "firstName" ||
      firstField === "lastName"
    ) {
      accumulator[firstField] = error.message;
    } else {
      accumulator.general = error.message;
    }

    return accumulator;
  }, {});

  return {
    ok: false,
    mode,
    message:
      errors[0]?.message ??
      "We couldn’t complete that request with Shopify right now. Please try again.",
    fieldErrors,
  };
}

function normalizeCustomer(customer: ShopifyCustomer): ShopifyCustomer {
  const displayName =
    customer.displayName.trim() ||
    [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim() ||
    customer.email;

  return {
    ...customer,
    displayName,
  };
}

async function storefrontRequest<TData>(
  query: string,
  variables: Record<string, unknown>,
): Promise<TData> {
  const env = getServerEnv();

  if (!env.SHOPIFY_STORE_DOMAIN || !env.SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
    throw new Error("Shopify storefront customer auth is not configured.");
  }

  const response = await fetch(`https://${env.SHOPIFY_STORE_DOMAIN}/api/2025-10/graphql.json`, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": env.SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Shopify storefront request failed with ${response.status}`);
  }

  const payload = (await response.json()) as StorefrontResponse<TData>;

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join(", "));
  }

  if (!payload.data) {
    throw new Error("Shopify storefront response did not include data.");
  }

  return payload.data;
}
