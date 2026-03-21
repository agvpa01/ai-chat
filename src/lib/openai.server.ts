import { getServerEnv } from "./env.server";

export async function generateAssistantReply(input: { message: string; systemPrompt: string }) {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(15000),
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [{ type: "input_text", text: input.systemPrompt }],
        },
        {
          role: "user",
          content: [{ type: "input_text", text: input.message }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  const derivedText = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text")
    .map((content) => content.text ?? "")
    .join("\n")
    .trim();

  return payload.output_text?.trim() || derivedText || null;
}
