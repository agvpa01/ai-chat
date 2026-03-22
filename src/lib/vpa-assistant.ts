import {
  getCustomerAuthMessage,
  getCustomerAuthRequestMode,
  type CustomerAuthMode,
} from "./customer-auth";

export type ExerciseMode = "reps" | "timer";

export type Exercise = {
  id: string;
  name: string;
  mode: ExerciseMode;
  target: number;
  unit: string;
  restSeconds: number;
  focus: string;
};

export type Workout = {
  id: string;
  name: string;
  goal: string;
  level: string;
  durationMinutes: number;
  summary: string;
  exercises: Exercise[];
  recommendedProductIds: string[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  benefit: string;
  priceLabel: string;
  accent: string;
};

export type StoreAnswer = {
  topic: string;
  answer: string;
};

export type OrderPreview = {
  orderNumber: string;
  status: string;
  eta: string;
  lastEvent: string;
  financialStatus?: string | null;
  trackingNumber?: string | null;
  trackingCompany?: string | null;
  trackingUrl?: string | null;
  customerEmail?: string | null;
};

export type RecommendedProduct = {
  title: string;
  description: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: string;
  reviewCount: number | null;
  bundlePricing: Array<{
    label: string;
    totalPrice: string;
    saveAmount: string | null;
  }>;
  variants: Array<{
    name: string;
    values: string[];
  }>;
  variantChoices: Array<{
    id: string;
    title: string;
    price: string;
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  }>;
};

export type RecommendedArticle = {
  title: string;
  summary: string;
  contentHtml: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  publishedAt: string | null;
  readTimeMinutes: number | null;
  blogTitle: string | null;
};

export type RecommendedPage = {
  title: string;
  summary: string;
  contentHtml: string;
  url: string;
  imageUrl: string | null;
  imageAlt: string | null;
  updatedAt: string | null;
  pageType: string | null;
  linkedPages?: RecommendedPage[];
};

export const storeAnswers: StoreAnswer[] = [
  {
    topic: "shipping",
    answer:
      "We can answer shipping, returns, and store-policy questions in chat. Once Shopify is connected, the bot should pull those answers from live store content so they stay accurate.",
  },
  {
    topic: "about",
    answer:
      "The assistant should know VPA as a performance and wellness brand, and answer About, ingredient, blog, and event questions from synced Shopify and CMS content.",
  },
  {
    topic: "events",
    answer:
      "Events can live in the same knowledge base as products and blogs, which means customers can ask what is coming up, where it is, and which products fit that goal.",
  },
];

export const products: Product[] = [
  {
    id: "whey-isolate",
    name: "Whey Protein Isolate",
    category: "Recovery",
    benefit: "Fast post-workout protein support after high-output sessions.",
    priceLabel: "From $69",
    accent: "from-emerald-300/60 to-teal-200/80",
  },
  {
    id: "pre-workout",
    name: "Pre-Workout",
    category: "Energy",
    benefit: "Best before explosive sessions where users want extra drive.",
    priceLabel: "From $49",
    accent: "from-orange-300/70 to-amber-200/80",
  },
  {
    id: "creatine",
    name: "Creatine",
    category: "Strength",
    benefit: "Great pairing for repeat lifting blocks and progressive overload.",
    priceLabel: "From $29",
    accent: "from-sky-300/70 to-cyan-200/80",
  },
  {
    id: "electrolytes",
    name: "Electrolytes",
    category: "Hydration",
    benefit: "Useful for longer sessions, sweaty conditioning, and hot days.",
    priceLabel: "From $24",
    accent: "from-fuchsia-300/60 to-rose-200/80",
  },
];

export const workouts: Workout[] = [
  {
    id: "ignite-hiit",
    name: "Ignite HIIT",
    goal: "Fat-loss and conditioning",
    level: "Beginner to intermediate",
    durationMinutes: 24,
    summary:
      "A friendly but punchy session built around short efforts, adjustable timers, and simple moves.",
    recommendedProductIds: ["pre-workout", "electrolytes", "whey-isolate"],
    exercises: [
      {
        id: "jump-squat",
        name: "Jump Squats",
        mode: "reps",
        target: 12,
        unit: "reps",
        restSeconds: 25,
        focus: "Explosive legs",
      },
      {
        id: "mountain-climber",
        name: "Mountain Climbers",
        mode: "timer",
        target: 35,
        unit: "sec",
        restSeconds: 20,
        focus: "Cardio core",
      },
      {
        id: "push-up",
        name: "Push-Ups",
        mode: "reps",
        target: 10,
        unit: "reps",
        restSeconds: 30,
        focus: "Upper-body push",
      },
      {
        id: "plank-hold",
        name: "Plank Hold",
        mode: "timer",
        target: 40,
        unit: "sec",
        restSeconds: 30,
        focus: "Bracing core",
      },
    ],
  },
  {
    id: "core-control",
    name: "Core Control",
    goal: "Abs strength and trunk stability",
    level: "Beginner to intermediate",
    durationMinutes: 20,
    summary:
      "A focused core block that blends bracing, lower-ab control, and steady midline work without a ton of equipment.",
    recommendedProductIds: ["electrolytes", "whey-isolate"],
    exercises: [
      {
        id: "dead-bug",
        name: "Dead Bug",
        mode: "reps",
        target: 10,
        unit: "reps",
        restSeconds: 20,
        focus: "Deep core control",
      },
      {
        id: "plank-hold",
        name: "Plank Hold",
        mode: "timer",
        target: 40,
        unit: "sec",
        restSeconds: 20,
        focus: "Bracing core",
      },
      {
        id: "mountain-climber",
        name: "Mountain Climbers",
        mode: "timer",
        target: 30,
        unit: "sec",
        restSeconds: 20,
        focus: "Cardio core",
      },
      {
        id: "reverse-crunch",
        name: "Reverse Crunch",
        mode: "reps",
        target: 12,
        unit: "reps",
        restSeconds: 25,
        focus: "Lower abs",
      },
    ],
  },
  {
    id: "strength-builder",
    name: "Strength Builder",
    goal: "Muscle gain and progression",
    level: "Intermediate",
    durationMinutes: 38,
    summary:
      "A structured strength block with adjustable reps so the user can progress week to week.",
    recommendedProductIds: ["creatine", "whey-isolate"],
    exercises: [
      {
        id: "goblet-squat",
        name: "Goblet Squat",
        mode: "reps",
        target: 8,
        unit: "reps",
        restSeconds: 60,
        focus: "Lower-body strength",
      },
      {
        id: "romanian-deadlift",
        name: "Romanian Deadlift",
        mode: "reps",
        target: 10,
        unit: "reps",
        restSeconds: 50,
        focus: "Posterior chain",
      },
      {
        id: "dumbbell-row",
        name: "Dumbbell Row",
        mode: "reps",
        target: 10,
        unit: "reps",
        restSeconds: 45,
        focus: "Upper-back pull",
      },
      {
        id: "farmer-carry",
        name: "Farmer Carry",
        mode: "timer",
        target: 45,
        unit: "sec",
        restSeconds: 40,
        focus: "Grip and trunk",
      },
    ],
  },
  {
    id: "reset-recovery",
    name: "Reset Recovery",
    goal: "Mobility and lower-intensity reset",
    level: "Any level",
    durationMinutes: 18,
    summary:
      "A lower-pressure option with timers, breathing space, and mobility work the chat can guide live.",
    recommendedProductIds: ["electrolytes", "whey-isolate"],
    exercises: [
      {
        id: "worlds-greatest-stretch",
        name: "World's Greatest Stretch",
        mode: "timer",
        target: 30,
        unit: "sec",
        restSeconds: 15,
        focus: "Hips and thoracic spine",
      },
      {
        id: "dead-bug",
        name: "Dead Bug",
        mode: "reps",
        target: 10,
        unit: "reps",
        restSeconds: 20,
        focus: "Deep core control",
      },
      {
        id: "glute-bridge",
        name: "Glute Bridge",
        mode: "reps",
        target: 12,
        unit: "reps",
        restSeconds: 20,
        focus: "Posterior activation",
      },
      {
        id: "box-breathing",
        name: "Box Breathing",
        mode: "timer",
        target: 60,
        unit: "sec",
        restSeconds: 10,
        focus: "Recovery downshift",
      },
    ],
  },
];

export const sampleOrder: OrderPreview = {
  orderNumber: "VPA-1042",
  status: "In transit",
  eta: "Arriving Tuesday",
  lastEvent: "Packed in Melbourne and handed to the courier at 9:20 AM.",
};

export type DemoMessage =
  | {
      id: string;
      role: "assistant" | "user";
      kind: "text";
      text: string;
      products?: RecommendedProduct[];
      productSectionTitle?: string;
      articles?: RecommendedArticle[];
      pages?: RecommendedPage[];
      orderPreview?: OrderPreview;
      orderPreviews?: OrderPreview[];
      requiresAccountConnection?: boolean;
      workoutSlugs?: string[];
      workoutDetailSlug?: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "products";
      text: string;
      productIds: string[];
    }
  | {
      id: string;
      role: "assistant";
      kind: "order";
      text: string;
    }
  | {
      id: string;
      role: "assistant";
      kind: "auth";
      text: string;
      initialMode: CustomerAuthMode;
    };

export const initialMessages: DemoMessage[] = [
  {
    id: "intro",
    role: "assistant",
    kind: "text",
    text: "Hi, I’m the VPA coach chat. I can help with VPA products and store questions, workouts and exercises, supplements, and VPA order support.",
  },
];

const keywordMap = {
  "ignite-hiit": ["hiit", "cardio", "fat", "conditioning", "fat loss"],
  "core-control": ["abs", "ab", "abdominals", "core", "midsection"],
  "strength-builder": ["strength", "muscle", "lift", "lifting"],
  "reset-recovery": ["recovery", "mobility", "stretch", "cooldown", "cool down"],
} satisfies Record<Workout["id"], string[]>;

function matchesWorkoutKeyword(input: string, keyword: string) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escapedKeyword.replace(/\s+/g, "\\s+");

  return new RegExp(`\\b${pattern}\\b`, "i").test(input);
}

export function chooseWorkout(input: string): Workout {
  const lowered = input.toLowerCase();

  for (const [workoutId, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((keyword) => matchesWorkoutKeyword(lowered, keyword))) {
      return workouts.find((workout) => workout.id === workoutId) ?? workouts[0];
    }
  }

  if (lowered.includes("beginner")) {
    return workouts[0];
  }

  return workouts[0];
}

export function buildWorkoutCardIds(input: string) {
  const chosenWorkout = chooseWorkout(input).id;

  return [
    chosenWorkout,
    ...workouts.filter((workout) => workout.id !== chosenWorkout).map((workout) => workout.id),
  ];
}

export function findProducts(productIds: string[]) {
  return productIds
    .map((productId) => products.find((product) => product.id === productId))
    .filter((product): product is Product => Boolean(product));
}

function isBlogRequest(input: string) {
  return ["blog", "blogs", "article", "articles", "post", "posts", "read"].some((term) =>
    input.includes(term),
  );
}

function isPageRequest(input: string) {
  return (
    ["faq", "faqs", "about", "support", "contact", "policy", "policies", "page", "pages"].some(
      (term) => input.includes(term),
    ) ||
    input.includes("home page") ||
    input.includes("homepage") ||
    input.includes("event")
  );
}

export function buildAssistantMessages(
  input: string,
  currentWorkoutId: string,
): {
  messages: DemoMessage[];
  nextWorkoutId?: string;
} {
  const lowered = input.toLowerCase();
  const authMode = getCustomerAuthRequestMode(lowered);
  const isWorkoutIntent =
    lowered.includes("workout") ||
    lowered.includes("exercise") ||
    lowered.includes("beginner") ||
    lowered.includes("plan");
  const isProductIntent =
    lowered.includes("protein") ||
    lowered.includes("supplement") ||
    lowered.includes("product") ||
    (lowered.includes("recommend") && !isWorkoutIntent);

  if (authMode) {
    return {
      messages: [
        {
          id: `auth-${Date.now()}`,
          role: "assistant",
          kind: "auth",
          text: getCustomerAuthMessage(authMode),
          initialMode: authMode,
        },
      ],
    };
  }

  if (lowered.includes("order") || lowered.includes("track")) {
    return {
      messages: [
        {
          id: `order-${Date.now()}`,
          role: "assistant",
          kind: "order",
          text: "Once the customer signs in, this card should show their real Shopify order status, fulfilment events, and tracking link without making them leave the chat.",
        },
      ],
    };
  }

  if (isBlogRequest(lowered)) {
    return {
      messages: [
        {
          id: `store-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: "I can surface VPA blog recommendations and article summaries here. Once the live content feed is connected, blog requests should return article cards instead of product picks.",
        },
      ],
    };
  }

  if (isPageRequest(lowered)) {
    return {
      messages: [
        {
          id: `page-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: "I can surface VPA page recommendations here. Once the live Shopify page feed responds, requests for FAQs, About, support, events, and homepage content should return page cards instead of product picks.",
        },
      ],
    };
  }

  if (isProductIntent) {
    const activeWorkout =
      workouts.find((workout) => workout.id === currentWorkoutId) ?? workouts[0];
    return {
      messages: [
        {
          id: `products-${Date.now()}`,
          role: "assistant",
          kind: "products",
          text: `Based on ${activeWorkout.name}, these are the products I’d surface first.`,
          productIds: activeWorkout.recommendedProductIds,
        },
      ],
    };
  }

  if (isWorkoutIntent) {
    const workout = chooseWorkout(lowered);

    return {
      nextWorkoutId: workout.id,
      messages: [
        {
          id: `workout-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: "Here are a few workout picks.",
          workoutSlugs: buildWorkoutCardIds(lowered),
        },
      ],
    };
  }

  if (
    lowered.includes("shipping") ||
    lowered.includes("return") ||
    lowered.includes("about") ||
    lowered.includes("event")
  ) {
    return {
      messages: [
        {
          id: `store-${Date.now()}`,
          role: "assistant",
          kind: "text",
          text: "This is where synced Shopify and content data will shine. The assistant can answer policies, About, blogs, events, and product questions from a shared knowledge base instead of hardcoded copy.",
        },
      ],
    };
  }

  return {
    messages: [
      {
        id: `fallback-${Date.now()}`,
        role: "assistant",
        kind: "text",
        text: "I’m focused on VPA, workouts and exercises, supplements, and VPA order support. If you want, ask me about a VPA product, a workout goal, recovery, or tracking a VPA order.",
      },
    ],
  };
}

export function formatSeconds(seconds: number) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const mins = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (remainder === 0) {
    return `${mins}m`;
  }

  return `${mins}m ${remainder}s`;
}
