"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";

type OpenIdConfiguration = {
  authorization_endpoint: string;
  token_endpoint: string;
};

type CustomerAccountDiscovery = {
  graphql_api: string;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  id_token?: string;
};

export const beginConnection = action({
  args: {
    redirectUri: v.string(),
    state: v.string(),
    nonce: v.string(),
    codeChallenge: v.string(),
  },
  handler: async (_ctx, args) => {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID;

    if (!storeDomain || !clientId) {
      throw new Error(
        "Shopify customer account connection is not configured. Add SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID first.",
      );
    }

    const authConfig = await getOpenIdConfiguration(storeDomain);
    const authorizationUrl = new URL(authConfig.authorization_endpoint);

    authorizationUrl.searchParams.set("scope", "openid email customer-account-api:full");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("redirect_uri", args.redirectUri);
    authorizationUrl.searchParams.set("state", args.state);
    authorizationUrl.searchParams.set("nonce", args.nonce);
    authorizationUrl.searchParams.set("code_challenge", args.codeChallenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    return {
      authorizationUrl: authorizationUrl.toString(),
    };
  },
});

export const completeConnection = action({
  args: {
    redirectUri: v.string(),
    code: v.string(),
    codeVerifier: v.string(),
  },
  handler: async (_ctx, args) => {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID;

    if (!storeDomain || !clientId) {
      throw new Error(
        "Shopify customer account connection is not configured. Add SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID first.",
      );
    }

    const authConfig = await getOpenIdConfiguration(storeDomain);
    const requestOrigin = new URL(args.redirectUri).origin;
    const tokenResponse = await fetch(authConfig.token_endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: requestOrigin,
        "User-Agent": "VPA Coach Customer Connect",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: args.redirectUri,
        code: args.code,
        code_verifier: args.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Shopify token exchange failed with ${tokenResponse.status}`);
    }

    const tokenPayload = (await tokenResponse.json()) as Partial<TokenResponse> & {
      error?: string;
      error_description?: string;
    };

    if (tokenPayload.error || !tokenPayload.access_token || !tokenPayload.expires_in) {
      throw new Error(
        tokenPayload.error_description ||
          tokenPayload.error ||
          "Shopify customer connection did not return an access token.",
      );
    }

    const accountConfig = await getCustomerAccountDiscovery(storeDomain);
    const customerProfile = await fetchConnectedCustomer(
      accountConfig.graphql_api,
      tokenPayload.access_token,
      requestOrigin,
    );

    return {
      ok: true as const,
      session: {
        accessToken: tokenPayload.access_token,
        expiresAt: new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString(),
        idToken: tokenPayload.id_token,
        customer: customerProfile,
      },
      message: `Connected ${customerProfile.email} to this app.`,
    };
  },
});

async function getOpenIdConfiguration(storeDomain: string) {
  const response = await fetch(`https://${storeDomain}/.well-known/openid-configuration`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "VPA Coach Customer Connect",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify OpenID discovery failed with ${response.status}`);
  }

  return (await response.json()) as OpenIdConfiguration;
}

async function getCustomerAccountDiscovery(storeDomain: string) {
  const response = await fetch(`https://${storeDomain}/.well-known/customer-account-api`, {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": "VPA Coach Customer Connect",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify customer account discovery failed with ${response.status}`);
  }

  return (await response.json()) as CustomerAccountDiscovery;
}

async function fetchConnectedCustomer(
  graphqlEndpoint: string,
  accessToken: string,
  requestOrigin: string,
) {
  const response = await fetch(graphqlEndpoint, {
    method: "POST",
    signal: AbortSignal.timeout(10000),
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
      Origin: requestOrigin,
      "User-Agent": "VPA Coach Customer Connect",
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
  };
}
