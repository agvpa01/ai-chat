import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getIntegrationStatus } from "./env.server";
import { generateAssistantReply } from "./openai.server";
import { getShopifyStoreSnapshot, lookupOrdersByEmail } from "./shopify.server";
import { buildAssistantMessages, workouts } from "./vpa-assistant";

const messageInput = z.object({
  message: z.string().min(1),
  workoutId: z.string(),
});

export const getAssistantStatus = createServerFn({ method: "GET" }).handler(async () => {
  return getIntegrationStatus();
});

export const sendAssistantMessage = createServerFn({ method: "POST" })
  .inputValidator(messageInput)
  .handler(async ({ data }) => {
    const status = getIntegrationStatus();
    const activeWorkout = workouts.find((workout) => workout.id === data.workoutId) ?? workouts[0];
    const storeSnapshot = await getShopifyStoreSnapshot().catch(() => null);
    const emailMatch = data.message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const orderResults = emailMatch?.[0]
      ? await lookupOrdersByEmail(emailMatch[0]).catch(() => [])
      : [];
    const orderPrompt =
      data.message.toLowerCase().includes("order") || data.message.toLowerCase().includes("track");
    const compactStoreSnapshot = storeSnapshot
      ? {
          shopName: storeSnapshot.shopName,
          description: storeSnapshot.description,
          source: storeSnapshot.source,
          products: storeSnapshot.products.map((product) => ({
            title: product.title,
            handle: product.handle,
            price: product.price,
          })),
        }
      : null;

    const systemPrompt = `
You are the VPA Coach assistant for vpa.com.au.

Your tone:
- Friendly, warm, and practical
- Brief by default
- Helpful without sounding robotic

Your responsibilities:
- Answer questions about the VPA store, products, blogs, about page, policies, and events
- Help users choose workouts and explain exercises in simple language
- Recommend products based on workout goals and the active workout
- If the user asks about orders and there is no verified order lookup data in context, ask for the email used for the order or explain sign-in is required
- If verified order lookup data is present in context, summarize it clearly and do not invent anything beyond that data
- Do not invent policies, order details, or medical advice
- For health and exercise questions, stay educational and general, and encourage users to seek professional guidance for injuries or medical conditions

Current active workout:
- Name: ${activeWorkout.name}
- Goal: ${activeWorkout.goal}
- Level: ${activeWorkout.level}
- Summary: ${activeWorkout.summary}

Shopify connection status:
- Admin store data connected: ${status.shopifyReady ? "yes" : "no"}
- Orders backend connected: ${status.ordersReady ? "yes" : "no"}

Store snapshot:
${compactStoreSnapshot ? JSON.stringify(compactStoreSnapshot, null, 2) : "No live Shopify snapshot available yet."}

Order lookup context:
${
  emailMatch?.[0]
    ? JSON.stringify(
        {
          requestedEmail: emailMatch[0],
          results: orderResults,
        },
        null,
        2,
      )
    : orderPrompt
      ? "The user asked about an order but did not provide an email address."
      : "No order lookup requested."
}

When live store data is unavailable, be transparent and answer based on the current prototype context only.
    `.trim();

    const liveReply = await generateAssistantReply({
      message: data.message,
      systemPrompt,
    }).catch(() => null);

    if (liveReply) {
      return {
        text: liveReply,
        source: "openai" as const,
        status,
      };
    }

    const fallback = buildAssistantMessages(data.message, data.workoutId).messages.find(
      (message) => message.role === "assistant",
    );

    return {
      text:
        fallback?.text ??
        "I can help with workouts, products, store questions, and order support once the integrations are connected.",
      source: "fallback" as const,
      status,
    };
  });
