import { Link, createFileRoute } from "@tanstack/react-router";
import { BicepsFlexed } from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api } from "../../convex/_generated/api";
import { CustomerAuthExperience } from "../components/CustomerAuthExperience";
import {
  WorkoutCardGrid,
  WorkoutDetailCard,
  type WorkoutActivityLog,
  type WorkoutCatalogWorkout,
} from "../components/WorkoutCardGrid";
import { convexHttpClient } from "../lib/convex-http";
import {
  mergeSavedThreads,
  mergeWorkoutActivityEntries,
  pickPreferredThreadId,
  sanitizeSavedThreads,
  sanitizeWorkoutActivityEntries,
  type SavedChatThread,
  type WorkoutActivityEntry,
} from "../lib/customer-state";
import {
  clearStoredCustomerSession,
  getCustomerAuthRequestMode,
  refreshCustomerSessionIfNeeded,
  readStoredCustomerSession,
  type CustomerAuthSession,
} from "../lib/customer-auth";
import {
  buildAssistantMessages,
  buildWorkoutCardIds,
  initialMessages,
  sampleOrder,
  workouts,
  type RecommendedArticle,
  type RecommendedPage,
  type DemoMessage,
  type RecommendedProduct,
} from "../lib/vpa-assistant";

export const Route = createFileRoute("/")({
  component: App,
});

type FlavourImageEntry = {
  name: string;
  url: string;
};

let flavourImageCache: Record<string, string> | null = null;
let storefrontVariantCache: Record<
  string,
  Record<
    string,
    {
      price: string;
      imageUrl: string | null;
      selectedOptions: Array<{
        name: string;
        value: string;
      }>;
    }
  >
> = {};

type ChatCartItem = {
  id: string;
  variantSelections: Array<{
    variantId: string;
    flavourLabel: string | null;
    quantity: number;
  }>;
  productTitle: string;
  productUrl: string;
  imageUrl: string | null;
  flavourSummary: string | null;
  bundleLabel: string;
  unitQuantity: number;
  bundlePrice: number;
  selections: number;
};

type WorkoutEventEntry = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  publishedAt: number;
  ctaLabel: string;
};

const CHAT_HISTORY_STORAGE_KEY = "vpa-chat-history-v1";
const CHAT_CART_STORAGE_KEY = "vpa-chat-cart-v1";
const WORKOUT_ACTIVITY_STORAGE_KEY = "vpa-workout-activity-v1";
const WORKOUT_ACTIVITY_SEEN_AT_STORAGE_KEY = "vpa-workout-activity-seen-at-v1";

const workoutEvents: WorkoutEventEntry[] = [
  {
    id: "event-16-day-challenge",
    title: "16 Day Workout Challenge",
    subtitle: "Challenge Launch",
    description: "Daily guided sessions, progress check-ins, and a clean streak to follow in chat.",
    publishedAt: new Date("2026-03-20T09:00:00+08:00").getTime(),
    ctaLabel: "16 day workout challenge",
  },
  {
    id: "event-core-reset-week",
    title: "Core Reset Week",
    subtitle: "Starts Monday",
    description: "A short abs-and-mobility block built for home sessions and quick recovery days.",
    publishedAt: new Date("2026-03-18T08:30:00+08:00").getTime(),
    ctaLabel: "Show core workouts",
  },
];

function App() {
  const [messages, setMessages] = useState<DemoMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [activeWorkoutId, setActiveWorkoutId] = useState(workouts[0].id);
  const [workoutCatalog, setWorkoutCatalog] = useState<WorkoutCatalogWorkout[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentThreadId, setCurrentThreadId] = useState(() => createThreadId());
  const [savedThreads, setSavedThreads] = useState<SavedChatThread[]>([]);
  const [openThreadMenuId, setOpenThreadMenuId] = useState<string | null>(null);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [cartItems, setCartItems] = useState<ChatCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartBumping, setIsCartBumping] = useState(false);
  const [workoutActivity, setWorkoutActivity] = useState<WorkoutActivityEntry[]>([]);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [lastActivitySeenAt, setLastActivitySeenAt] = useState(0);
  const [customerSession, setCustomerSession] = useState<CustomerAuthSession | null>(null);
  const [hasHydratedConnectedState, setHasHydratedConnectedState] = useState(false);
  const skipNextThreadSaveRef = useRef(false);
  const skipNextConnectedStateSaveRef = useRef(false);
  const savedThreadsRef = useRef<SavedChatThread[]>([]);
  const workoutActivityRef = useRef<WorkoutActivityEntry[]>([]);
  const lastActivitySeenAtRef = useRef(0);
  const currentThreadIdRef = useRef(currentThreadId);

  async function ensureFreshCustomerSession(session: CustomerAuthSession | null) {
    const refreshedSession = await refreshCustomerSessionIfNeeded(session);

    if (!refreshedSession) {
      if (session) {
        startTransition(() => {
          setCustomerSession(null);
        });
      }

      return null;
    }

    if (
      !session ||
      refreshedSession.accessToken !== session.accessToken ||
      refreshedSession.expiresAt !== session.expiresAt ||
      refreshedSession.refreshToken !== session.refreshToken
    ) {
      startTransition(() => {
        setCustomerSession(refreshedSession);
      });
    }

    return refreshedSession;
  }

  useEffect(() => {
    savedThreadsRef.current = savedThreads;
  }, [savedThreads]);

  useEffect(() => {
    workoutActivityRef.current = workoutActivity;
  }, [workoutActivity]);

  useEffect(() => {
    lastActivitySeenAtRef.current = lastActivitySeenAt;
  }, [lastActivitySeenAt]);

  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateLocalState() {
      const storedThreads = readSavedThreads();
      const storedCartItems = readSavedCartItems();
      const storedWorkoutActivity = readWorkoutActivity();
      const storedCustomerSession = readStoredCustomerSession();
      const storedActivitySeenAt = readWorkoutActivitySeenAt();
      const refreshedCustomerSession = await refreshCustomerSessionIfNeeded(storedCustomerSession);

      if (cancelled) {
        return;
      }

      if (storedThreads.length) {
        const latestThread = storedThreads[0];
        setSavedThreads(storedThreads);
        setCurrentThreadId(latestThread.id);
        setMessages(latestThread.messages);
        setActiveWorkoutId(latestThread.activeWorkoutId);
      }

      if (storedCartItems.length) {
        setCartItems(storedCartItems);
      }

      if (storedWorkoutActivity.length) {
        setWorkoutActivity(storedWorkoutActivity);
      }

      if (refreshedCustomerSession) {
        setCustomerSession(refreshedCustomerSession);
      }

      if (storedActivitySeenAt > 0) {
        setLastActivitySeenAt(storedActivitySeenAt);
      }

      setHasLoadedHistory(true);
    }

    void hydrateLocalState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!hasLoadedHistory) {
      return;
    }

    const connectedSession = customerSession;

    if (!connectedSession) {
      setHasHydratedConnectedState(true);
      return;
    }

    setHasHydratedConnectedState(false);

    async function hydrateConnectedState() {
      try {
        const usableSession = await ensureFreshCustomerSession(connectedSession);

        if (!usableSession || cancelled) {
          return;
        }

        const remoteState = await convexHttpClient.action(api.customerState.loadConnectedState, {
          accessToken: usableSession.accessToken,
        });

        if (cancelled) {
          return;
        }

        const mergedThreads = mergeSavedThreads(
          savedThreadsRef.current,
          sanitizeSavedThreads(remoteState.threads),
        );
        const mergedWorkoutActivity = mergeWorkoutActivityEntries(
          workoutActivityRef.current,
          sanitizeWorkoutActivityEntries(remoteState.workoutActivity),
        );
        const mergedLastActivitySeenAt = Math.max(
          lastActivitySeenAtRef.current,
          typeof remoteState.lastActivitySeenAt === "number" ? remoteState.lastActivitySeenAt : 0,
        );
        const preferredThreadId = pickPreferredThreadId(mergedThreads, [
          currentThreadIdRef.current,
          remoteState.currentThreadId,
        ]);
        const selectedThread = mergedThreads.find((thread) => thread.id === preferredThreadId);

        skipNextConnectedStateSaveRef.current = true;

        startTransition(() => {
          setSavedThreads(mergedThreads);
          setWorkoutActivity(mergedWorkoutActivity);
          setLastActivitySeenAt(mergedLastActivitySeenAt);

          if (selectedThread) {
            skipNextThreadSaveRef.current = true;
            setCurrentThreadId(selectedThread.id);
            setMessages(selectedThread.messages);
            setActiveWorkoutId(selectedThread.activeWorkoutId);
          }
        });
      } catch {
        return;
      } finally {
        if (!cancelled) {
          setHasHydratedConnectedState(true);
        }
      }
    }

    void hydrateConnectedState();

    return () => {
      cancelled = true;
    };
  }, [customerSession, hasLoadedHistory]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkoutCatalog() {
      try {
        await convexHttpClient.mutation(api.workouts.syncSeedCatalog, {});
        const catalog = await convexHttpClient.query(api.workouts.list, {});

        if (cancelled) {
          return;
        }

        setWorkoutCatalog(catalog);
        setActiveWorkoutId((current) =>
          catalog.some((workout) => workout.slug === current)
            ? current
            : (catalog[0]?.slug ?? workouts[0].id),
        );
      } catch {
        return;
      }
    }

    void loadWorkoutCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  async function submitPrompt(input: string) {
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    const authMode = getCustomerAuthRequestMode(trimmed);

    const userMessage: DemoMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      kind: "text",
      text: trimmed,
    };

    const reply = buildAssistantMessages(trimmed, activeWorkoutId);
    const shouldAttachWorkoutCards = isWorkoutListRequest(trimmed);
    const workoutCardSlugs = shouldAttachWorkoutCards ? buildWorkoutCardIds(trimmed) : undefined;

    if (authMode) {
      startTransition(() => {
        setMessages((current) => [
          ...current,
          userMessage,
          ...attachWorkoutCardsToMessages(reply.messages, workoutCardSlugs),
        ]);
        setDraft("");
      });
      return;
    }

    if (shouldAttachWorkoutCards) {
      startTransition(() => {
        setMessages((current) => [
          ...current,
          userMessage,
          ...attachWorkoutCardsToMessages(reply.messages, workoutCardSlugs),
        ]);
        if (reply.nextWorkoutId) {
          setActiveWorkoutId(reply.nextWorkoutId);
        }
        setDraft("");
      });
      return;
    }

    if (!customerSession && looksLikeOrderSupportRequest(trimmed)) {
      const orderAuthMessage: DemoMessage = {
        id: `auth-order-${Date.now()}`,
        role: "assistant",
        kind: "auth",
        text: "Connect your Shopify account to track orders or view order history in chat. For privacy, we only show orders for the signed-in Shopify customer.",
        initialMode: "login",
      };

      startTransition(() => {
        setMessages((current) => [...current, userMessage, orderAuthMessage]);
        setDraft("");
      });
      return;
    }

    const usableCustomerSession = await ensureFreshCustomerSession(customerSession);

    if (!usableCustomerSession && looksLikeOrderSupportRequest(trimmed)) {
      const orderAuthMessage: DemoMessage = {
        id: `auth-order-${Date.now()}`,
        role: "assistant",
        kind: "auth",
        text: "Connect your Shopify account to track orders or view order history in chat. For privacy, we only show orders for the signed-in Shopify customer.",
        initialMode: "login",
      };

      startTransition(() => {
        setMessages((current) => [...current, userMessage, orderAuthMessage]);
        setDraft("");
      });
      return;
    }

    startTransition(() => {
      setMessages((current) => [...current, userMessage]);
      if (reply.nextWorkoutId) {
        setActiveWorkoutId(reply.nextWorkoutId);
      }
      setDraft("");
    });

    setIsSubmitting(true);

    try {
      const response = await convexHttpClient.action(api.chat.reply, {
        message: trimmed,
        workoutId: reply.nextWorkoutId ?? activeWorkoutId,
        customerEmail: usableCustomerSession?.customer.email,
        customerAccessToken: usableCustomerSession?.accessToken,
      });
      const assistantLiveMessage: DemoMessage = {
        id: `assistant-live-${Date.now()}`,
        role: "assistant",
        kind: "text",
        text: response.text,
        products: response.recommendedProducts,
        productSectionTitle: response.recommendedProductsCollectionTitle ?? undefined,
        articles: response.recommendedArticles,
        pages: response.recommendedPages,
        orderPreview: response.orderPreview ?? undefined,
        orderPreviews: response.orderPreviews ?? undefined,
        requiresAccountConnection: response.requiresAccountConnection ?? undefined,
        workoutSlugs: workoutCardSlugs,
      };

      startTransition(() => {
        setMessages((current) => [...current, assistantLiveMessage]);
      });
    } catch {
      startTransition(() => {
        setMessages((current) => [
          ...current,
          ...attachWorkoutCardsToMessages(reply.messages, workoutCardSlugs),
        ]);
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function addCartItem(item: Omit<ChatCartItem, "selections">) {
    setIsCartBumping(false);
    requestAnimationFrame(() => setIsCartBumping(true));

    setCartItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);

      if (!existing) {
        return [...current, { ...item, selections: 1 }];
      }

      return current.map((entry) =>
        entry.id === existing.id ? { ...entry, selections: entry.selections + 1 } : entry,
      );
    });
  }

  function clearCustomerSession() {
    setCustomerSession(null);
    clearStoredCustomerSession();
  }

  useEffect(() => {
    if (!isCartBumping) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsCartBumping(false);
    }, 420);

    return () => window.clearTimeout(timeoutId);
  }, [isCartBumping]);

  useEffect(() => {
    if (!hasLoadedHistory) {
      return;
    }

    if (skipNextThreadSaveRef.current) {
      skipNextThreadSaveRef.current = false;
      return;
    }

    const userMessages = messages.filter((message) => message.role === "user");

    if (!userMessages.length) {
      return;
    }

    setSavedThreads((current) => {
      const existingThread = current.find((thread) => thread.id === currentThreadId);
      const nextThread: SavedChatThread = {
        id: currentThreadId,
        title: existingThread?.title ?? buildThreadTitle(userMessages[0]?.text ?? "New chat"),
        messages,
        activeWorkoutId,
        updatedAt: Date.now(),
      };
      const nextThreads = [nextThread, ...current.filter((thread) => thread.id !== currentThreadId)]
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .slice(0, 20);

      writeSavedThreads(nextThreads);
      return nextThreads;
    });
  }, [activeWorkoutId, currentThreadId, hasLoadedHistory, messages]);

  useEffect(() => {
    if (!hasLoadedHistory) {
      return;
    }

    writeSavedCartItems(cartItems);
  }, [cartItems, hasLoadedHistory]);

  useEffect(() => {
    if (!hasLoadedHistory) {
      return;
    }

    writeWorkoutActivity(workoutActivity);
  }, [hasLoadedHistory, workoutActivity]);

  useEffect(() => {
    if (!hasLoadedHistory) {
      return;
    }

    writeWorkoutActivitySeenAt(lastActivitySeenAt);
  }, [hasLoadedHistory, lastActivitySeenAt]);

  useEffect(() => {
    const connectedSession = customerSession;

    if (!hasLoadedHistory || !hasHydratedConnectedState || !connectedSession) {
      return;
    }

    if (skipNextConnectedStateSaveRef.current) {
      skipNextConnectedStateSaveRef.current = false;
      return;
    }

    void ensureFreshCustomerSession(connectedSession)
      .then((usableSession) => {
        if (!usableSession) {
          return;
        }

        return convexHttpClient.action(api.customerState.saveConnectedState, {
          accessToken: usableSession.accessToken,
          sessionExpiresAt: usableSession.expiresAt,
          currentThreadId,
          threads: savedThreads,
          workoutActivity,
          lastActivitySeenAt,
        });
      })
      .catch(() => {});
  }, [
    currentThreadId,
    customerSession,
    hasHydratedConnectedState,
    hasLoadedHistory,
    lastActivitySeenAt,
    savedThreads,
    workoutActivity,
  ]);

  useEffect(() => {
    const session = customerSession;

    if (!session?.refreshToken) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void ensureFreshCustomerSession(session);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [customerSession]);

  useEffect(() => {
    if (!isCartOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCartOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCartOpen]);

  useEffect(() => {
    if (!isActivityOpen) {
      return;
    }

    setLastActivitySeenAt(Date.now());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsActivityOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActivityOpen]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchOpen]);

  function createNewChat() {
    setCurrentThreadId(createThreadId());
    setMessages(initialMessages);
    setDraft("");
    setActiveWorkoutId(workoutCatalog[0]?.slug ?? workouts[0].id);
    setIsCartOpen(false);
    setIsActivityOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
    setOpenThreadMenuId(null);
  }

  function openSavedThread(thread: SavedChatThread) {
    skipNextThreadSaveRef.current = true;
    setCurrentThreadId(thread.id);
    setMessages(thread.messages);
    setActiveWorkoutId(thread.activeWorkoutId);
    setDraft("");
    setIsCartOpen(false);
    setIsActivityOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
    setOpenThreadMenuId(null);
  }

  function recordWorkoutActivity(activity: WorkoutActivityLog) {
    setWorkoutActivity((current) =>
      [
        {
          ...activity,
          id: `${activity.workoutSlug}-${activity.type}-${activity.timestamp}`,
        },
        ...current,
      ]
        .sort((left, right) => right.timestamp - left.timestamp)
        .slice(0, 18),
    );
  }

  function renameSavedThread(threadId: string) {
    const thread = savedThreads.find((entry) => entry.id === threadId);

    if (!thread || typeof window === "undefined") {
      return;
    }

    const nextTitle = window.prompt("Rename chat", thread.title)?.trim();

    if (!nextTitle) {
      setOpenThreadMenuId(null);
      return;
    }

    const nextThreads = savedThreads.map((entry) =>
      entry.id === threadId ? { ...entry, title: nextTitle } : entry,
    );

    setSavedThreads(nextThreads);
    writeSavedThreads(nextThreads);
    setOpenThreadMenuId(null);
  }

  function deleteSavedThread(threadId: string) {
    const nextThreads = savedThreads.filter((thread) => thread.id !== threadId);

    setSavedThreads(nextThreads);
    writeSavedThreads(nextThreads);
    setOpenThreadMenuId(null);

    if (currentThreadId !== threadId) {
      return;
    }

    const nextThread = nextThreads[0];

    if (nextThread) {
      openSavedThread(nextThread);
      return;
    }

    createNewChat();
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const filteredThreads = savedThreads.filter((thread) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    const searchableText = [thread.title, ...thread.messages.map((message) => message.text ?? "")]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearchQuery);
  });
  const groupedSearchThreads = groupThreadsByDate(filteredThreads);

  function updateCartSelection(id: string, delta: number) {
    setCartItems((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, selections: Math.max(0, item.selections + delta) } : item,
        )
        .filter((item) => item.selections > 0),
    );
  }

  function removeCartItem(id: string) {
    setCartItems((current) => current.filter((item) => item.id !== id));
  }

  function openProductDetail(product: RecommendedProduct) {
    startTransition(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-product-${Date.now()}-${product.url}`,
          role: "assistant",
          kind: "text",
          text: `Here are the details for ${product.title}. You can pick a bundle and flavour below.`,
          products: [product],
        },
      ]);
    });
  }

  function openArticleDetail(
    article: RecommendedArticle,
    relatedArticles: RecommendedArticle[] = [],
  ) {
    const orderedArticles = [
      article,
      ...relatedArticles.filter((entry) => entry.url !== article.url),
    ];

    startTransition(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-article-${Date.now()}-${article.url}`,
          role: "assistant",
          kind: "text",
          text: `Here’s another VPA article that covers this topic.`,
          articles: orderedArticles,
        },
      ]);
    });
  }

  function openPageDetail(page: RecommendedPage, relatedPages: RecommendedPage[] = []) {
    const orderedPages = [page, ...relatedPages.filter((entry) => entry.url !== page.url)];

    startTransition(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-page-${Date.now()}-${page.url}`,
          role: "assistant",
          kind: "text",
          text: `Here’s another VPA page that matches your question.`,
          pages: orderedPages,
        },
      ]);
    });
  }

  function openWorkoutDetail(workout: WorkoutCatalogWorkout) {
    setActiveWorkoutId(workout.slug);

    startTransition(() => {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-workout-${Date.now()}-${workout.slug}`,
          role: "assistant",
          kind: "text",
          text: `Here’s ${workout.name}.`,
          workoutDetailSlug: workout.slug,
        },
      ]);
    });
  }

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.bundlePrice * item.selections, 0);
  const checkoutUrl = buildCheckoutUrl(cartItems);
  const cartCount = cartItems.reduce((sum, item) => sum + item.selections, 0);
  const activityBadgeCount =
    workoutActivity.filter((entry) => entry.timestamp > lastActivitySeenAt).length +
    workoutEvents.filter((event) => event.publishedAt > lastActivitySeenAt).length;
  const starterChatLabels = [
    "Give me recommended product list",
    "Show me best selling products",
    "WPI vs WPC",
    "Build me a beginner workout",
    "Track my VPA order",
  ];
  const hasUserMessages = messages.some((message) => message.role === "user");
  const sidebarAccountName = customerSession?.customer.displayName || "VPA AU";
  const sidebarAccountSubtitle = customerSession?.customer.email || null;
  const sidebarAccountInitials = getInitials(
    customerSession?.customer.displayName ||
      [customerSession?.customer.firstName, customerSession?.customer.lastName]
        .filter(Boolean)
        .join(" ") ||
      "VPA AU",
  );

  return (
    <main className="min-h-screen bg-[#F6F7F2] text-[#1D1D1D]">
      <div className="flex min-h-screen">
        <aside
          className={`hidden h-screen shrink-0 self-start overflow-hidden border-r border-[#1D1D1D]/10 bg-white transition-[width] duration-200 lg:sticky lg:top-0 lg:flex ${
            isSidebarOpen ? "w-[276px]" : "w-[72px]"
          }`}
        >
          {isSidebarOpen ? (
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b border-[#1D1D1D]/10 p-5">
                <img
                  src="https://www.vpa.com.au/cdn/shop/files/vpa-full-logo_410x.png?v=1614315593"
                  alt="VPA Australia"
                  className="h-8 w-auto object-contain"
                />
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  aria-label="Collapse sidebar"
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] text-[#1D1D1D] hover:bg-[#F6F7F2]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 18 9 12l6-6" />
                  </svg>
                </button>
              </div>

              <div className="border-b border-[#1D1D1D]/10 p-5">
                <button
                  type="button"
                  onClick={createNewChat}
                  className="mb-4 flex w-full items-center justify-center rounded-[1rem] bg-[#1D1D1D] px-4 py-3 text-sm font-semibold text-white"
                >
                  New chat
                </button>

                <button
                  type="button"
                  onClick={() => setIsSearchOpen(true)}
                  className="flex w-full items-center gap-3 rounded-[1rem] border border-[#1D1D1D]/10 bg-[#F6F7F2] px-4 py-3 text-left text-sm text-[#1D1D1D]/56"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <span>Search chats</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1D1D1D]/44">
                  Your chats
                </div>
                {savedThreads.length ? (
                  <div className="space-y-1.5">
                    {savedThreads.map((thread) => (
                      <div key={thread.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => openSavedThread(thread)}
                          className={`block w-full rounded-[0.9rem] px-3 py-3 pr-11 text-left text-sm font-medium hover:bg-[#F6F7F2] ${
                            thread.id === currentThreadId
                              ? "bg-[#F6F7F2] text-[#1D1D1D]"
                              : "text-[#1D1D1D]"
                          }`}
                        >
                          <div className="truncate">{thread.title}</div>
                        </button>

                        <button
                          type="button"
                          aria-label={`Thread options for ${thread.title}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenThreadMenuId((current) =>
                              current === thread.id ? null : thread.id,
                            );
                          }}
                          className={`absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#1D1D1D]/58 transition hover:bg-white hover:text-[#1D1D1D] ${
                            openThreadMenuId === thread.id
                              ? "bg-white text-[#1D1D1D] shadow-sm"
                              : "opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="currentColor"
                          >
                            <circle cx="5" cy="12" r="1.8" />
                            <circle cx="12" cy="12" r="1.8" />
                            <circle cx="19" cy="12" r="1.8" />
                          </svg>
                        </button>

                        {openThreadMenuId === thread.id ? (
                          <div className="absolute top-[calc(100%+0.35rem)] right-2 z-20 w-36 rounded-[0.9rem] border border-[#1D1D1D]/10 bg-white p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                renameSavedThread(thread.id);
                              }}
                              className="block w-full rounded-[0.7rem] px-3 py-2 text-left text-sm font-medium text-[#1D1D1D] hover:bg-[#F6F7F2]"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteSavedThread(thread.id);
                              }}
                              className="block w-full rounded-[0.7rem] px-3 py-2 text-left text-sm font-medium text-[#B42318] hover:bg-[#FFF3F2]"
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[0.9rem] border border-[#1D1D1D]/10 bg-[#F6F7F2] px-3 py-3 text-sm text-[#1D1D1D]/55">
                    No chat history yet.
                  </div>
                )}
              </div>

              <div className="border-t border-[#1D1D1D]/10 p-4">
                <Link
                  to="/account"
                  className="flex items-center gap-3 rounded-[1.15rem] border border-[#1D1D1D]/8 bg-[#F2F3F0] px-3 py-2.5 text-[#1D1D1D] no-underline transition hover:border-[#1D1D1D]/14 hover:bg-[#ECEEE8]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22B8A9] text-base font-semibold text-white">
                    {sidebarAccountInitials}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[0.98rem] font-semibold leading-5">
                      {sidebarAccountName}
                    </div>
                    {sidebarAccountSubtitle ? (
                      <div className="truncate text-[0.9rem] leading-5 text-[#1D1D1D]/64">
                        {sidebarAccountSubtitle}
                      </div>
                    ) : null}
                  </div>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center px-3 py-4">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Expand sidebar"
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] hover:bg-[#F6F7F2]"
              >
                <img
                  src="https://www.vpa.com.au/cdn/shop/files/vpa-full-logo_410x.png?v=1614315593"
                  alt="VPA Australia"
                  className="h-7 w-auto object-contain"
                />
              </button>

              <div className="mt-6 flex w-full flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={createNewChat}
                  aria-label="New chat"
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] text-[#1D1D1D] hover:bg-[#F6F7F2]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSidebarOpen(true);
                    setIsSearchOpen(true);
                  }}
                  aria-label="Search chats"
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] text-[#1D1D1D] hover:bg-[#F6F7F2]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  aria-label="Open chat history"
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] text-[#1D1D1D] hover:bg-[#F6F7F2]"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="4" y="4" width="16" height="16" rx="3" />
                    <path d="M8 9h8" />
                    <path d="M8 13h8" />
                    <path d="M8 17h5" />
                  </svg>
                </button>
              </div>

              <Link
                to="/account"
                title={`${sidebarAccountName} - ${sidebarAccountSubtitle}`}
                className="mt-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#22B8A9] text-sm font-semibold text-white no-underline transition hover:scale-105"
              >
                {sidebarAccountInitials}
              </Link>
            </div>
          )}
        </aside>

        <section className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-[#1D1D1D]/10 bg-[#F6F7F2]/95 px-4 backdrop-blur-sm sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[#3B7539] text-lg font-black tracking-[-0.04em] text-white lg:hidden">
                V
              </div>
              <div>
                <div className="text-lg font-semibold text-[#1D1D1D]">VPA Coach</div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-[#1D1D1D]/46">
                  Products, blogs, workouts, orders
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={createNewChat}
              className="rounded-full border border-[#1D1D1D]/12 px-4 py-2 text-sm font-semibold text-[#1D1D1D] lg:hidden"
            >
              New chat
            </button>
          </header>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col">
              {!hasUserMessages ? (
                <div className="border-b border-[#1D1D1D]/8 px-5 py-10 text-center sm:px-8">
                  <div className="mx-auto max-w-2xl">
                    <h1 className="m-0 text-4xl font-semibold tracking-[-0.04em] text-[#1D1D1D] sm:text-5xl">
                      What do you want help with?
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#1D1D1D]/64 sm:text-lg">
                      Ask about VPA products, blog topics, workouts, supplement guidance, or order
                      tracking.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                      {starterChatLabels.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setDraft(label)}
                          className="rounded-full border border-[#1D1D1D]/10 bg-white px-4 py-2 text-sm font-medium text-[#1D1D1D]"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="flex-1 overflow-y-auto px-5 py-8 pb-44 sm:px-8">
                <div className="mx-auto w-full max-w-5xl space-y-8">
                  <div className="mx-auto w-full max-w-3xl space-y-8">
                    {messages.map((message) => (
                      <article
                        key={message.id}
                        className={`${
                          message.role === "assistant"
                            ? ""
                            : "ml-auto max-w-2xl rounded-[1.6rem] border border-[#3B7539]/16 bg-[#EAF3E8] px-5 py-4"
                        }`}
                      >
                        <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#1D1D1D]/50">
                          {message.role === "assistant" ? "VPA coach" : "You"}
                        </div>
                        {message.role === "assistant" ? (
                          <div className="chat-markdown text-[1.02rem] leading-8 text-[#1D1D1D]">
                            <ReactMarkdown
                              components={{
                                a: ({ node: _node, ...props }) => (
                                  <a {...props} target="_blank" rel="noreferrer" />
                                ),
                              }}
                            >
                              {message.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="m-0 whitespace-pre-wrap text-[1.02rem] leading-8 text-[#1D1D1D]">
                            {message.text}
                          </p>
                        )}

                        {"products" in message &&
                        message.products?.length &&
                        !("articles" in message && message.articles?.length) ? (
                          isProductDetailResponse(message.text) ? (
                            <div className="mt-5 space-y-6">
                              <ProductCard
                                product={message.products[0]}
                                onAddToCart={addCartItem}
                              />
                              {message.products.length > 1 ? (
                                <ProductGrid
                                  title="Related Picks"
                                  products={message.products.slice(1)}
                                  onSelectProduct={openProductDetail}
                                />
                              ) : null}
                            </div>
                          ) : message.products.length > 1 ? (
                            <ProductGrid
                              title={message.productSectionTitle ?? "Best Sellers"}
                              products={message.products}
                              onSelectProduct={openProductDetail}
                            />
                          ) : (
                            <div className="mt-5 space-y-4">
                              {message.products.map((product: RecommendedProduct) => (
                                <ProductCard
                                  key={product.url}
                                  product={product}
                                  onAddToCart={addCartItem}
                                />
                              ))}
                            </div>
                          )
                        ) : null}

                        {"articles" in message && message.articles?.length ? (
                          <div className="mt-5 space-y-6">
                            <ArticleCard article={message.articles[0]} />
                            {message.articles.length > 1 ? (
                              <ArticleGrid
                                articles={message.articles.slice(1)}
                                currentArticle={message.articles[0]}
                                onSelectArticle={openArticleDetail}
                              />
                            ) : null}
                          </div>
                        ) : null}

                        {"pages" in message && message.pages?.length
                          ? (() => {
                              const primaryPage = message.pages[0];

                              if (!primaryPage) {
                                return null;
                              }

                              return (
                                <div className="mt-5 space-y-6">
                                  <PageCard
                                    page={primaryPage}
                                    onSelectLinkedPage={(page, linkedPages) =>
                                      openPageDetail(page, [
                                        primaryPage,
                                        ...linkedPages.filter((entry) => entry.url !== page.url),
                                      ])
                                    }
                                  />
                                  {primaryPage.linkedPages?.length ? null : message.pages.length >
                                    1 ? (
                                    <PageGrid
                                      pages={message.pages.slice(1)}
                                      currentPage={primaryPage}
                                      onSelectPage={openPageDetail}
                                    />
                                  ) : null}
                                </div>
                              );
                            })()
                          : null}

                        {"workoutSlugs" in message && message.workoutSlugs?.length ? (
                          <WorkoutCardGrid
                            workouts={selectWorkoutCards(message.workoutSlugs, workoutCatalog)}
                            onSelectWorkout={openWorkoutDetail}
                          />
                        ) : null}

                        {"workoutDetailSlug" in message && message.workoutDetailSlug
                          ? (() => {
                              const workoutDetail = findWorkoutDetail(
                                message.workoutDetailSlug,
                                workoutCatalog,
                              );

                              return workoutDetail ? (
                                <WorkoutDetailCard
                                  workout={workoutDetail}
                                  onTrackWorkoutActivity={recordWorkoutActivity}
                                />
                              ) : null;
                            })()
                          : null}

                        {message.kind === "auth" ? (
                          <CustomerAuthExperience
                            initialMode={message.initialMode}
                            session={customerSession}
                            onLogout={clearCustomerSession}
                            variant="response"
                          />
                        ) : null}

                        {"requiresAccountConnection" in message &&
                        message.requiresAccountConnection ? (
                          <CustomerAuthExperience
                            initialMode="login"
                            session={customerSession}
                            onLogout={clearCustomerSession}
                            variant="response"
                          />
                        ) : null}

                        {message.kind === "order" ? (
                          <OrderStatusCard order={sampleOrder} customerSession={customerSession} />
                        ) : null}

                        {"orderPreview" in message && message.orderPreview ? (
                          <OrderStatusCard
                            order={message.orderPreview}
                            customerSession={customerSession}
                          />
                        ) : null}

                        {"orderPreviews" in message && message.orderPreviews?.length ? (
                          <OrderStatusGrid
                            orders={message.orderPreviews}
                            customerSession={customerSession}
                          />
                        ) : null}
                      </article>
                    ))}
                    {isSubmitting ? <AssistantTypingIndicator /> : null}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 border-t border-[#1D1D1D]/10 bg-[#F6F7F2] px-4 py-3 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                  <label htmlFor="chat-input" className="sr-only">
                    Chat input
                  </label>
                  <div className="rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white p-3">
                    <textarea
                      id="chat-input"
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder="Ask about VPA products, blog topics, workouts, or your order..."
                      className="min-h-16 w-full resize-none border-0 bg-transparent px-2 py-1 text-base leading-7 text-[#1D1D1D] outline-none placeholder:text-[#1D1D1D]/42"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1D1D1D]/40">
                        VPA Store Assistant
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCartOpen(false);
                            setIsActivityOpen((current) => !current);
                          }}
                          aria-label="Open workout activity"
                          aria-expanded={isActivityOpen}
                          aria-controls="chat-activity-sheet"
                          className="relative flex h-11 w-11 items-center justify-center text-[#1D1D1D]"
                        >
                          <BicepsFlexed aria-hidden="true" className="h-5 w-5" />
                          {activityBadgeCount > 0 ? (
                            <span className="absolute -top-1 right-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#3B7539] px-1.5 text-center text-[0.65rem] font-extrabold leading-none text-white">
                              {activityBadgeCount}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsActivityOpen(false);
                            setIsCartOpen((current) => !current);
                          }}
                          aria-label="Open cart"
                          aria-expanded={isCartOpen}
                          aria-controls="chat-cart-sheet"
                          className={`relative flex h-11 w-11 items-center justify-center text-[#1D1D1D] transition-transform duration-300 ${
                            isCartBumping ? "-translate-y-4 scale-125" : "translate-y-0 scale-100"
                          }`}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <circle cx="9" cy="20" r="1" />
                            <circle cx="18" cy="20" r="1" />
                            <path d="M2 3h3l2.68 10.39a1 1 0 0 0 .97.75h8.72a1 1 0 0 0 .97-.76L21 6H6" />
                          </svg>
                          <span
                            className={`absolute -top-1 right-0 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#1D1D1D] px-1.5 text-center text-[0.65rem] font-extrabold leading-none text-white transition-transform duration-300 ${
                              isCartBumping ? "scale-125" : "scale-100"
                            }`}
                          >
                            {cartCount}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void submitPrompt(draft);
                          }}
                          disabled={isSubmitting}
                          aria-label={isSubmitting ? "Sending message" : "Send message"}
                          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3B7539] text-white disabled:opacity-70"
                        >
                          <span className="sr-only">{isSubmitting ? "Sending..." : "Send"}</span>
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.25"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19V5" />
                            <path d="m6 11 6-6 6 6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {isCartOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/18 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsCartOpen(false)}
        >
          <aside
            id="chat-cart-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-cart-title"
            className="absolute inset-y-0 right-0 flex h-full w-full max-w-[34rem] flex-col border-l border-[#1D1D1D]/10 bg-[#FCFCF8] p-5 shadow-[-24px_0_60px_rgba(29,29,29,0.16)] animate-in slide-in-from-right duration-300 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1D1D1D]/8 pb-4">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#1D1D1D]/44">
                  Chat Cart
                </div>
                <div id="chat-cart-title" className="mt-1 text-[1.35rem] font-semibold text-black">
                  {cartCount} item{cartCount !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Close cart"
                className="h-10 w-10 rounded-full border border-[#1D1D1D]/10 bg-white text-sm font-semibold text-black transition-colors hover:bg-[#F6F7F2]"
              >
                ×
              </button>
            </div>

            {cartItems.length ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-4 gap-y-3 border-b border-[#1D1D1D]/10 py-5 first:pt-1 sm:grid-cols-[6.75rem_minmax(0,1fr)_6.5rem]"
                    >
                      <div className="h-[5.5rem] w-[5.5rem] overflow-hidden rounded-[0.35rem] bg-[#F6F7F2] sm:h-[6.75rem] sm:w-[6.75rem]">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productTitle}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-[#EEF1E8]" />
                        )}
                      </div>
                      <div className="min-w-0 sm:pr-2">
                        <div className="text-[0.88rem] font-extrabold leading-tight text-[#222] sm:text-[0.98rem]">
                          {item.productTitle}
                        </div>
                        <div className="mt-1 text-[0.76rem] leading-tight text-[#545454] sm:text-[0.84rem]">
                          {item.flavourSummary ?? item.bundleLabel}
                        </div>
                        <div className="mt-3 inline-grid h-9 grid-cols-3 overflow-hidden border border-[#D7D8D1] bg-white text-[#222] sm:h-10 sm:min-w-[10.5rem]">
                          <button
                            type="button"
                            onClick={() => updateCartSelection(item.id, -1)}
                            aria-label={`Decrease quantity for ${item.productTitle}`}
                            className="flex h-full w-full items-center justify-center border-r border-[#D7D8D1] text-[1.05rem] font-semibold transition-colors hover:bg-[#F7F7F1]"
                          >
                            -
                          </button>
                          <div className="flex h-full min-w-9 items-center justify-center border-r border-[#D7D8D1] text-[0.9rem] font-semibold">
                            {item.selections}
                          </div>
                          <button
                            type="button"
                            onClick={() => updateCartSelection(item.id, 1)}
                            aria-label={`Increase quantity for ${item.productTitle}`}
                            className="flex h-full w-full items-center justify-center text-[1.05rem] font-semibold transition-colors hover:bg-[#F7F7F1]"
                          >
                            +
                          </button>
                        </div>
                        {item.flavourSummary ? (
                          <div className="mt-2 text-[0.62rem] uppercase tracking-[0.08em] text-[#8A8A8A]">
                            {item.bundleLabel}
                          </div>
                        ) : null}
                      </div>
                      <div className="col-span-2 flex items-start justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end sm:self-stretch">
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          aria-label={`Remove ${item.productTitle} from cart`}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-[#A1A1A1] transition-colors hover:bg-white hover:text-[#666]"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.9"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 7h16" />
                            <path d="M9 7V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75V7" />
                            <path d="M7.5 7l.7 10.14A2 2 0 0 0 10.2 19h3.6a2 2 0 0 0 1.99-1.86L16.5 7" />
                          </svg>
                        </button>
                        <div className="text-right text-[0.9rem] font-medium text-[#555] sm:mt-auto sm:text-[0.98rem]">
                          {formatMoney(item.bundlePrice * item.selections)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-[#1D1D1D]/8 pt-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-black">Subtotal</span>
                    <span className="text-xl font-semibold text-[#3B7539]">
                      {formatMoney(cartSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-sm font-semibold text-black"
                    >
                      Clear cart
                    </button>
                    {checkoutUrl ? (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-[0.95rem] bg-[#161616] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white no-underline"
                      >
                        Checkout
                      </a>
                    ) : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-6 rounded-[1rem] border border-[#1D1D1D]/8 bg-white px-4 py-5 text-center text-sm text-black">
                Your cart is empty.
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {isActivityOpen ? (
        <div
          className="fixed inset-0 z-20 bg-black/18 backdrop-blur-[2px] animate-in fade-in duration-200"
          onClick={() => setIsActivityOpen(false)}
        >
          <aside
            id="chat-activity-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-activity-title"
            className="absolute inset-y-0 right-0 flex h-full w-full max-w-[34rem] flex-col border-l border-[#1D1D1D]/10 bg-[#FCFCF8] p-5 shadow-[-24px_0_60px_rgba(29,29,29,0.16)] animate-in slide-in-from-right duration-300 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#1D1D1D]/8 pb-4">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[#1D1D1D]/44">
                  Workout Activity
                </div>
                <div
                  id="chat-activity-title"
                  className="mt-1 text-[1.35rem] font-semibold text-black"
                >
                  History and events
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsActivityOpen(false)}
                aria-label="Close workout activity"
                className="h-10 w-10 rounded-full border border-[#1D1D1D]/10 bg-white text-sm font-semibold text-black transition-colors hover:bg-[#F6F7F2]"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#1D1D1D]/48">
                    Recent workout history
                  </div>
                  <div className="text-xs text-[#1D1D1D]/42">
                    {workoutActivity.length} update{workoutActivity.length !== 1 ? "s" : ""}
                  </div>
                </div>
                {workoutActivity.length ? (
                  <div className="space-y-3">
                    {workoutActivity.map((entry) => (
                      <article
                        key={entry.id}
                        className="rounded-[1.2rem] border border-[#1D1D1D]/10 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-[#1D1D1D]">
                              {entry.workoutName}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-[#1D1D1D]/62">
                              {entry.type === "completed"
                                ? `Completed ${entry.completedExercises}/${entry.totalExercises} exercises`
                                : `Started a ${entry.totalExercises}-exercise session`}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] ${
                              entry.type === "completed"
                                ? "bg-[#E9F6EA] text-[#2F6A4A]"
                                : "bg-[#EEF4EE] text-[#173A40]"
                            }`}
                          >
                            {entry.type}
                          </span>
                        </div>
                        <div className="mt-3 text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[#1D1D1D]/42">
                          {formatActivityDate(entry.timestamp)}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1rem] border border-[#1D1D1D]/8 bg-white px-4 py-5 text-sm text-[#1D1D1D]/62">
                    Start a workout from the chat and it will show up here.
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#1D1D1D]/48">
                  Events and challenges
                </div>
                <div className="space-y-3">
                  {workoutEvents.map((event) => (
                    <article
                      key={event.id}
                      className="rounded-[1.2rem] border border-[#1D1D1D]/10 bg-[linear-gradient(180deg,#F7FBF8_0%,#FFFFFF_100%)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#2F6A4A]">
                            {event.subtitle}
                          </div>
                          <div className="mt-1 text-[1.05rem] font-semibold text-[#1D1D1D]">
                            {event.title}
                          </div>
                        </div>
                        {event.publishedAt > lastActivitySeenAt ? (
                          <span className="rounded-full bg-[#173A40] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white">
                            New
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 mb-0 text-sm leading-6 text-[#1D1D1D]/66">
                        {event.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="text-[0.72rem] font-medium uppercase tracking-[0.12em] text-[#1D1D1D]/42">
                          {formatActivityDate(event.publishedAt)}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(event.ctaLabel);
                            setIsActivityOpen(false);
                          }}
                          className="rounded-full border border-[#1D1D1D]/10 bg-white px-3 py-2 text-xs font-semibold text-[#1D1D1D]"
                        >
                          {event.ctaLabel}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {isSearchOpen ? (
        <div
          className="fixed inset-0 z-30 bg-[#1D1D1D]/16 p-4 sm:p-6"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="mx-auto flex max-h-[min(42rem,calc(100vh-3rem))] w-full max-w-4xl flex-col overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white shadow-[0_20px_60px_rgba(29,29,29,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#1D1D1D]/10 px-5 py-4">
              <input
                autoFocus
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search chats..."
                className="w-full border-0 bg-transparent text-[1.35rem] font-medium tracking-[-0.03em] text-[#1D1D1D] outline-none placeholder:text-[#1D1D1D]/32"
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#1D1D1D]/44 hover:bg-[#F6F7F2] hover:text-[#1D1D1D]"
              >
                <span className="text-[1.7rem] leading-none">×</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <button
                type="button"
                onClick={createNewChat}
                className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-3 text-left text-[#1D1D1D] hover:bg-[#F6F7F2]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1D1D1D]/10">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4.5 w-4.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <span className="text-base font-medium">New chat</span>
              </button>

              <div className="mt-3 space-y-5">
                {groupedSearchThreads.length ? (
                  groupedSearchThreads.map((group) => (
                    <div key={group.label} className="space-y-1.5">
                      <div className="px-3 text-xs font-medium text-[#1D1D1D]/44">
                        {group.label}
                      </div>
                      <div className="space-y-1">
                        {group.threads.map((thread) => (
                          <button
                            type="button"
                            key={thread.id}
                            onClick={() => openSavedThread(thread)}
                            className="flex w-full items-center gap-3 rounded-[0.95rem] px-3 py-3 text-left text-[#1D1D1D] hover:bg-[#F6F7F2]"
                          >
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#1D1D1D]/10">
                              <svg
                                aria-hidden="true"
                                viewBox="0 0 24 24"
                                className="h-4.5 w-4.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                            </span>
                            <span className="min-w-0 flex-1 truncate text-base font-medium">
                              {thread.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-[#1D1D1D]/54">
                    No matching chats found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function ArticleCard({ article }: { article: RecommendedArticle }) {
  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white">
      <div className="space-y-6 p-5 lg:p-7">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#3B7539]">
          <div className="flex items-center gap-2">
            <span>Home</span>
            <span>/</span>
            <span>{article.blogTitle ?? "Featured"}</span>
          </div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="text-[#3B7539] no-underline"
          >
            Read on site
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="m-0 text-3xl font-semibold uppercase tracking-[0.04em] text-black sm:text-4xl">
            {article.title}
          </h2>
          <div className="text-base font-medium text-[#717171]">{formatArticleMeta(article)}</div>
        </div>

        {article.imageUrl ? (
          <div className="overflow-hidden rounded-[0.4rem] bg-[#f6f6f3]">
            <img
              src={article.imageUrl}
              alt={article.imageAlt ?? article.title}
              className="max-h-[34rem] w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="space-y-6 text-lg leading-9 text-black">
          <p className="m-0">{article.summary}</p>
          <div
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(article.contentHtml) }}
          />
        </div>
      </div>
    </article>
  );
}

function PageCard({
  page,
  onSelectLinkedPage,
}: {
  page: RecommendedPage;
  onSelectLinkedPage?: (page: RecommendedPage, linkedPages: RecommendedPage[]) => void;
}) {
  const isFormPage = isFormLikePage(page);
  const summaryText = normalizeRenderedRichText(page.summary);
  const bodyText = normalizeRenderedRichText(sanitizeArticleHtml(page.contentHtml));
  const bodyExtendsSummary =
    summaryText.length > 0 &&
    bodyText.startsWith(summaryText) &&
    bodyText.length > summaryText.length * 1.2;
  const shouldShowBody =
    !isFormPage && bodyText.length > 0 && (bodyExtendsSummary || bodyText !== summaryText);
  const shouldShowSummary =
    summaryText.length > 0 &&
    (!shouldShowBody || (!bodyText.startsWith(summaryText) && bodyText !== summaryText));

  return (
    <article className="overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white">
      {page.imageUrl ? (
        <div className="border-b border-[#1D1D1D]/10 bg-[#F7FBF8]">
          <img
            src={page.imageUrl}
            alt={page.imageAlt ?? page.title}
            className="max-h-[34rem] w-full object-cover"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="space-y-6 p-5 lg:p-7">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#3B7539]">
          <div className="flex items-center gap-2">
            <span>Home</span>
            <span>/</span>
            <span>{page.pageType ?? "Page"}</span>
          </div>
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            className="text-[#3B7539] no-underline"
          >
            Open page
          </a>
        </div>

        <div className="space-y-3">
          <h2 className="m-0 text-3xl font-semibold uppercase tracking-[0.04em] text-black sm:text-4xl">
            {page.title}
          </h2>
          <div className="text-base font-medium text-[#717171]">{formatPageMeta(page)}</div>
        </div>

        {shouldShowSummary ? (
          <div className="rounded-[1rem] border border-[#1D1D1D]/10 bg-[#F7FBF8] p-4 text-lg leading-9 text-black">
            <p className="m-0">{page.summary}</p>
          </div>
        ) : null}

        {shouldShowBody ? (
          <div
            className="article-content text-lg leading-9 text-black"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(page.contentHtml) }}
          />
        ) : null}

        {isFormPage ? (
          <div className="rounded-[1rem] border border-[#3B7539]/18 bg-[linear-gradient(135deg,#F7FBF8_0%,#EEF7F0_100%)] p-5">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Sign-up Form
            </div>
            <p className="mb-4 mt-2 text-base leading-7 text-[#173A40]">
              This page includes a live form, so the best experience is to open it on the VPA
              website and complete it there.
            </p>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-[0.95rem] bg-[#173A40] px-5 py-3 text-sm font-extrabold uppercase tracking-[0.08em] text-white no-underline"
            >
              Open Form On Site
            </a>
          </div>
        ) : null}

        {page.pageType === "Events" && page.linkedPages?.length ? (
          <EventRecapGrid
            pages={page.linkedPages}
            onSelectPage={(linkedPage) => onSelectLinkedPage?.(linkedPage, page.linkedPages ?? [])}
          />
        ) : null}
      </div>
    </article>
  );
}

function OrderStatusCard({
  order,
  customerSession,
}: {
  order: typeof sampleOrder;
  customerSession: CustomerAuthSession | null;
}) {
  const orderSteps = buildOrderSteps(order);

  return (
    <article className="mt-5 overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white">
      <div className="border-b border-[#1D1D1D]/8 bg-[linear-gradient(135deg,#F7FBF8_0%,#EEF7F0_100%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Order Tracking
            </div>
            <h2 className="m-0 text-[1.85rem] font-semibold tracking-[-0.05em] text-[#173A40]">
              {order.orderNumber}
            </h2>
            <p className="m-0 max-w-xl text-sm leading-7 text-[#173A40]/70 sm:text-base">
              A cleaner place for shipping progress, ETA updates, and fulfilment events without
              sending the customer away from chat.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#3B7539] px-3 py-1 text-sm font-semibold text-white">
              {order.status}
            </span>
            <span className="rounded-full border border-[#173A40]/10 bg-white px-3 py-1 text-sm font-semibold text-[#173A40]">
              {order.eta}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
        <div className="space-y-4">
          <div className="rounded-[1.2rem] border border-[#1D1D1D]/10 bg-[#F8FBF8] p-4">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Latest update
            </div>
            <p className="mt-3 mb-0 text-sm leading-7 text-[#173A40]/74 sm:text-base">
              {order.lastEvent}
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#173A40]/58">
              Fulfilment Timeline
            </div>
            <div className="space-y-3">
              {orderSteps.map((step) => (
                <div
                  key={step.label}
                  className={`rounded-[1.1rem] border px-4 py-3 ${
                    step.state === "done"
                      ? "border-[#3B7539]/14 bg-[#F4FAF4]"
                      : step.state === "active"
                        ? "border-[#173A40]/12 bg-white shadow-[0_10px_24px_rgba(23,58,64,0.05)]"
                        : "border-[#1D1D1D]/10 bg-[#FAFBF8]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        step.state === "done"
                          ? "bg-[#3B7539] text-white"
                          : step.state === "active"
                            ? "bg-[#173A40] text-white"
                            : "bg-[#E4E8E0] text-[#173A40]/62"
                      }`}
                    >
                      {step.state === "done" ? "✓" : step.index}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#173A40]">{step.label}</div>
                      <div className="mt-1 text-sm leading-6 text-[#173A40]/64">{step.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.2rem] border border-[#1D1D1D]/10 bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F8F3_100%)] p-4">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Tracking snapshot
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1rem] border border-[#173A40]/8 bg-white px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/56">
                  Status
                </div>
                <div className="mt-1 text-base font-semibold text-[#173A40]">{order.status}</div>
              </div>
              <div className="rounded-[1rem] border border-[#173A40]/8 bg-white px-3 py-3">
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/56">
                  ETA
                </div>
                <div className="mt-1 text-base font-semibold text-[#173A40]">{order.eta}</div>
              </div>
              {order.financialStatus ? (
                <div className="rounded-[1rem] border border-[#173A40]/8 bg-white px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/56">
                    Payment
                  </div>
                  <div className="mt-1 text-base font-semibold text-[#173A40]">
                    {order.financialStatus}
                  </div>
                </div>
              ) : null}
              {order.trackingNumber ? (
                <div className="rounded-[1rem] border border-[#173A40]/8 bg-white px-3 py-3">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/56">
                    Tracking number
                  </div>
                  <div className="mt-1 text-base font-semibold text-[#173A40]">
                    {order.trackingNumber}
                  </div>
                  {order.trackingCompany ? (
                    <div className="mt-1 text-sm text-[#173A40]/64">{order.trackingCompany}</div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex rounded-full bg-[#173A40] px-4 py-2 text-sm font-semibold text-white no-underline"
              >
                Open tracking
              </a>
            ) : null}
          </div>

          <div className="rounded-[1.2rem] border border-[#1D1D1D]/10 bg-[#F8FBF8] p-4">
            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
              Account status
            </div>
            {customerSession ? (
              <div className="mt-3 space-y-2">
                <div className="text-base font-semibold tracking-[-0.02em] text-[#173A40]">
                  Connected as {customerSession.customer.email}
                </div>
                <p className="m-0 text-sm leading-6 text-[#173A40]/68">
                  This is where live Shopify order cards, tracking links, and delivery events can
                  appear for the signed-in customer.
                </p>
                <Link
                  to="/account"
                  className="mt-2 inline-flex rounded-full border border-[#173A40]/10 bg-white px-4 py-2 text-sm font-semibold text-[#173A40] no-underline"
                >
                  Manage account
                </Link>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="text-base font-semibold tracking-[-0.02em] text-[#173A40]">
                  Connect your Shopify account
                </div>
                <p className="m-0 text-sm leading-6 text-[#173A40]/68">
                  Once connected, we can swap this preview for the customer’s real orders, delivery
                  updates, and fulfilment history.
                </p>
                <Link
                  to="/account"
                  className="mt-2 inline-flex rounded-full bg-[#173A40] px-4 py-2 text-sm font-semibold text-white no-underline"
                >
                  Connect account
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </article>
  );
}

function OrderStatusGrid({
  orders,
  customerSession,
}: {
  orders: Array<typeof sampleOrder>;
  customerSession: CustomerAuthSession | null;
}) {
  return (
    <section className="mt-5 space-y-4">
      <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
        Order Matches
      </div>
      <div className="space-y-5">
        {orders.map((order) => (
          <OrderStatusCard
            key={`${order.orderNumber}-${order.customerEmail ?? "guest"}`}
            order={order}
            customerSession={customerSession}
          />
        ))}
      </div>
    </section>
  );
}

function looksLikeOrderSupportRequest(input: string) {
  const lowered = input.toLowerCase();

  return (
    lowered.includes("track order") ||
    lowered.includes("track my order") ||
    lowered.includes("track this order") ||
    lowered.includes("order status") ||
    lowered.includes("where is my order") ||
    lowered.includes("order history") ||
    lowered.includes("my orders") ||
    lowered.includes("previous orders") ||
    lowered.includes("past orders") ||
    lowered.includes("list of orders") ||
    lowered.includes("orders i've") ||
    lowered.includes("orders i’ve") ||
    lowered.includes("orders i have") ||
    lowered.includes("orders i created") ||
    lowered.includes("orders i placed") ||
    lowered.includes("orders i made") ||
    ((lowered.includes("order") || lowered.includes("orders")) && lowered.includes("refunded")) ||
    (lowered.includes("orders") && lowered.includes("email")) ||
    (lowered.includes("order") && lowered.includes("#"))
  );
}

function buildOrderSteps(order: typeof sampleOrder) {
  const normalizedStatus = order.status.toLowerCase();
  const isInTransit = normalizedStatus.includes("transit");
  const isDelivered = normalizedStatus.includes("delivered");

  return [
    {
      index: 1,
      label: "Order confirmed",
      detail: "Payment accepted and the order is in the warehouse queue.",
      state: "done" as const,
    },
    {
      index: 2,
      label: "Packed and handed over",
      detail: order.lastEvent,
      state: "done" as const,
    },
    {
      index: 3,
      label: "In transit",
      detail: isInTransit || isDelivered ? order.eta : "Waiting for the courier scan update.",
      state: isInTransit || isDelivered ? ("active" as const) : ("upcoming" as const),
    },
    {
      index: 4,
      label: "Delivered",
      detail: isDelivered ? "Delivery confirmed." : "Delivery completion will appear here.",
      state: isDelivered ? ("active" as const) : ("upcoming" as const),
    },
  ];
}

function ArticleGrid({
  articles,
  currentArticle,
  onSelectArticle,
}: {
  articles: RecommendedArticle[];
  currentArticle?: RecommendedArticle;
  onSelectArticle: (article: RecommendedArticle, relatedArticles: RecommendedArticle[]) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
        Related Articles
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <button
            type="button"
            key={article.url}
            onClick={() =>
              onSelectArticle(article, [
                ...(currentArticle ? [currentArticle] : []),
                ...articles.filter((entry) => entry.url !== article.url),
              ])
            }
            className="block rounded-[1.2rem] border border-[#1D1D1D]/10 bg-white p-4 text-left text-black"
          >
            <div className="space-y-3">
              {article.imageUrl ? (
                <img
                  src={article.imageUrl}
                  alt={article.imageAlt ?? article.title}
                  className="h-48 w-full rounded-[0.8rem] object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3B7539]">
                {article.blogTitle ?? "Featured"}
              </div>
              <h3 className="m-0 text-xl font-semibold uppercase tracking-[0.04em] text-black">
                {article.title}
              </h3>
              <p className="m-0 text-base leading-7 text-black">{article.summary}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function PageGrid({
  pages,
  currentPage,
  onSelectPage,
}: {
  pages: RecommendedPage[];
  currentPage?: RecommendedPage;
  onSelectPage: (page: RecommendedPage, relatedPages: RecommendedPage[]) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
        Related Pages
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {pages.map((page) => (
          <button
            type="button"
            key={page.url}
            onClick={() =>
              onSelectPage(page, [
                ...(currentPage ? [currentPage] : []),
                ...pages.filter((entry) => entry.url !== page.url),
              ])
            }
            className="block rounded-[1.2rem] border border-[#1D1D1D]/10 bg-white p-4 text-left text-black"
          >
            <div className="space-y-3">
              {page.imageUrl ? (
                <div className="overflow-hidden rounded-[1rem] border border-[#1D1D1D]/10 bg-[#F7FBF8]">
                  <img
                    src={page.imageUrl}
                    alt={page.imageAlt ?? page.title}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : null}
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#3B7539]">
                {page.pageType ?? "Page"}
              </div>
              <h3 className="m-0 text-xl font-semibold uppercase tracking-[0.04em] text-black">
                {page.title}
              </h3>
              <p className="m-0 text-base leading-7 text-black">{page.summary}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function EventRecapGrid({
  pages,
  onSelectPage,
}: {
  pages: RecommendedPage[];
  onSelectPage: (page: RecommendedPage) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
        Event Recaps
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <button
            type="button"
            key={page.url}
            onClick={() => onSelectPage(page)}
            className="group overflow-hidden rounded-[1.4rem] border border-[#1D1D1D]/10 bg-[#222222] text-left text-white"
          >
            <div className="relative">
              {page.imageUrl ? (
                <img
                  src={page.imageUrl}
                  alt={page.imageAlt ?? page.title}
                  className="h-72 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                />
              ) : (
                <div className="h-72 w-full bg-[linear-gradient(135deg,#315A30_0%,#193420_100%)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08)_0%,rgba(0,0,0,0.82)_100%)]" />
              <div className="absolute inset-x-0 bottom-0 space-y-3 p-5">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white/72">
                  Event Recap
                </div>
                <h3 className="m-0 text-[1.85rem] font-semibold uppercase leading-[1.02] tracking-[-0.04em] text-white">
                  {page.title}
                </h3>
                <p className="m-0 line-clamp-4 text-base leading-7 text-white/86">{page.summary}</p>
                <div className="pt-1">
                  <span className="inline-flex rounded-[0.85rem] border border-white/70 px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white">
                    View Event Recap
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  onAddToCart,
}: {
  product: RecommendedProduct;
  onAddToCart: (item: Omit<ChatCartItem, "selections">) => void;
}) {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(
    product.bundlePricing[0]?.label ?? null,
  );
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    Object.fromEntries(
      product.variants
        .filter((variant) => !isFlavourOption(variant.name))
        .map((variant) => [variant.name, variant.values[0] ?? ""]),
    ),
  );
  const [selectedFlavourSlots, setSelectedFlavourSlots] = useState<string[]>([]);
  const [activeFlavourSlot, setActiveFlavourSlot] = useState(0);
  const [flavourImages, setFlavourImages] = useState<Record<string, string>>(
    flavourImageCache ?? {},
  );
  const [storefrontVariantData, setStorefrontVariantData] = useState<
    Record<
      string,
      {
        price: string;
        imageUrl: string | null;
        selectedOptions: Array<{
          name: string;
          value: string;
        }>;
      }
    >
  >(() => storefrontVariantCache[product.url] ?? {});

  const flavourVariant = product.variants.find((variant) => isFlavourOption(variant.name)) ?? null;
  const nonFlavourVariants = product.variants.filter((variant) => !isFlavourOption(variant.name));
  const flavourValues = flavourVariant?.values ?? [];
  const selectedQuantity = parseBundleQuantity(selectedBundle) ?? 1;
  const flavourSelectionCounts = flavourValues.reduce<Record<string, number>>((counts, value) => {
    const count = selectedFlavourSlots.filter((selected) => selected === value).length;

    if (count > 0) {
      counts[value] = count;
    }

    return counts;
  }, {});

  useEffect(() => {
    if (!flavourVariant) {
      return;
    }

    setSelectedFlavourSlots((current) => {
      const next = Array.from({ length: selectedQuantity }, (_, index) => current[index] ?? "");
      return areArraysEqual(current, next) ? current : next;
    });
    setActiveFlavourSlot((current) => Math.min(current, Math.max(0, selectedQuantity - 1)));
  }, [flavourVariant, selectedQuantity]);

  const resolvedVariantChoices = product.variantChoices.map((variant) => {
    const storefrontVariant = storefrontVariantData[variant.id];

    return {
      ...variant,
      price: storefrontVariant?.price ?? variant.price,
      imageUrl: storefrontVariant?.imageUrl ?? null,
      selectedOptions:
        storefrontVariant?.selectedOptions.length > 0
          ? storefrontVariant.selectedOptions
          : variant.selectedOptions,
    };
  });
  const selectedVariant = findVariantChoice(resolvedVariantChoices, selectedOptions);
  const activeImageUrl = selectedVariant?.imageUrl ?? product.imageUrl;
  const activeBundlePrice =
    product.bundlePricing.find((tier) => tier.label === selectedBundle)?.totalPrice ??
    selectedVariant?.price ??
    product.price;
  const selectedOptionLabel = nonFlavourVariants
    .map((variant) => selectedOptions[variant.name])
    .filter(Boolean)
    .join(" • ");
  const selectedPurchaseLabel = selectedBundle ?? (selectedOptionLabel || "Single");
  const selectedVariantSelections = buildSelectedVariantSelections(
    product,
    flavourVariant,
    selectedFlavourSlots,
    selectedOptions,
  );
  const isFlavourSelectionComplete = flavourVariant
    ? selectedFlavourSlots.length === selectedQuantity &&
      selectedFlavourSlots.every((value) => value.trim()) &&
      selectedVariantSelections.length > 0
    : true;

  useEffect(() => {
    if (flavourImageCache) {
      setFlavourImages(flavourImageCache);
      return;
    }

    let cancelled = false;

    async function loadFlavourImages() {
      try {
        const response = await fetch("https://products.vpa.com.au/public/feed/flavours.json");
        if (!response.ok) {
          return;
        }

        const entries = (await response.json()) as FlavourImageEntry[];
        const mapped = Object.fromEntries(
          entries.map((entry) => [normalizeFlavourName(entry.name), entry.url]),
        );

        flavourImageCache = mapped;

        if (!cancelled) {
          setFlavourImages(mapped);
        }
      } catch {}
    }

    void loadFlavourImages();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (storefrontVariantCache[product.url]) {
      setStorefrontVariantData(storefrontVariantCache[product.url]);
      return;
    }

    const resolvedProductJsonUrl = buildStorefrontProductJsonUrl(product.url);

    if (!resolvedProductJsonUrl) {
      return;
    }

    const productJsonUrl: string = resolvedProductJsonUrl;

    let cancelled = false;

    async function loadStorefrontVariants() {
      try {
        const response = await fetch(new URL(productJsonUrl));

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as {
          options?: Array<{ name?: string | null }>;
          variants?: Array<{
            id?: number | null;
            price?: number | null;
            option1?: string | null;
            option2?: string | null;
            option3?: string | null;
            featured_image?: {
              src?: string | null;
            } | null;
          }>;
        };
        const currencyCode = product.price.split(" ")[0] ?? "AUD";
        const variantData = Object.fromEntries(
          (payload.variants ?? [])
            .filter((variant) => variant.id != null && typeof variant.price === "number")
            .map((variant) => {
              const variantPrice = variant.price ?? 0;
              const selectedOptions = [variant.option1, variant.option2, variant.option3]
                .map((value, index) => ({
                  name: payload.options?.[index]?.name?.trim() ?? "",
                  value: value?.trim() ?? "",
                }))
                .filter((option) => option.name && option.value);

              return [
                String(variant.id),
                {
                  price: `${currencyCode} ${(variantPrice / 100).toFixed(2)}`,
                  imageUrl: variant.featured_image?.src ?? null,
                  selectedOptions,
                },
              ];
            }),
        );

        storefrontVariantCache = {
          ...storefrontVariantCache,
          [product.url]: variantData,
        };

        if (!cancelled) {
          setStorefrontVariantData(variantData);
        }
      } catch {}
    }

    void loadStorefrontVariants();

    return () => {
      cancelled = true;
    };
  }, [product.price, product.url]);

  return (
    <div className="feature-card product-detail-card block overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white no-underline">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="bg-white px-4 pt-4 pb-4 lg:px-5 lg:pt-5 lg:pb-6">
          <div className="overflow-hidden rounded-[1.35rem]">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={product.imageAlt ?? product.title}
                className="block h-full min-h-72 w-full object-cover lg:min-h-[26rem]"
                loading="lazy"
              />
            ) : (
              <ImagePlaceholder label={product.title} size="large" />
            )}
          </div>

          {flavourVariant ? (
            <div>
              <div className="space-y-4">
                <div className="space-y-3 bg-white px-5 py-4 lg:px-7">
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black">
                    Pick {selectedQuantity} flavour{selectedQuantity > 1 ? "s" : ""}
                  </div>
                  <div
                    className="grid items-start gap-x-2.5 gap-y-2"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(selectedFlavourSlots.length, 1)}, minmax(0, 1fr))`,
                    }}
                  >
                    {selectedFlavourSlots.map((value, index) => {
                      const flavourImage = value ? findFlavourImage(value, flavourImages) : null;

                      return (
                        <div key={`slot-${index}`} className="relative min-w-0 overflow-visible">
                          <button
                            type="button"
                            onClick={() => setActiveFlavourSlot(index)}
                            className="block w-full text-center"
                          >
                            <div
                              className={`mx-auto flex aspect-square w-full max-w-[4.8rem] items-center justify-center overflow-hidden rounded-[0.9rem] bg-[#EAEFE7] ${
                                activeFlavourSlot === index ? "ring-2 ring-[#3B7539]" : ""
                              }`}
                            >
                              {flavourImage ? (
                                <img
                                  src={flavourImage}
                                  alt={value}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-[#1D1D1D]/60">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="mt-2.5 mx-auto w-full max-w-[4.8rem] px-1 text-center">
                              <div
                                className={`text-[0.82rem] font-semibold leading-tight ${
                                  value ? "text-black" : "text-[#1D1D1D]/58"
                                }`}
                              >
                                {value || "Choose flavour"}
                              </div>
                            </div>
                          </button>
                          {value ? (
                            <button
                              type="button"
                              aria-label={`Remove ${value}`}
                              onClick={() => {
                                setSelectedFlavourSlots((current) => {
                                  const next = [...current];
                                  next[index] = "";
                                  return next;
                                });
                                setActiveFlavourSlot(index);
                              }}
                              className="absolute -top-2 -right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1D1D1D] shadow-sm"
                            >
                              ×
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-5 p-5 lg:p-7">
          <div className="space-y-3">
            <h3 className="m-0 text-3xl font-semibold uppercase tracking-[0.04em] text-black sm:text-4xl">
              {product.title}
            </h3>
            {!product.bundlePricing.length ? (
              <div className="text-3xl font-semibold text-[#3B7539]">
                {activeBundlePrice.replace("AUD ", "$")}
              </div>
            ) : null}
            {product.reviewCount ? (
              <div className="flex items-center gap-3 text-sm font-semibold text-black">
                <span className="text-lg leading-none text-[#f5bf2e]">★★★★★</span>
                <span>{product.reviewCount} reviews</span>
              </div>
            ) : null}
          </div>

          {product.bundlePricing.length ? (
            <div className="space-y-3">
              <div className="text-2xl font-semibold text-black">Buy more & save</div>
              <div className="space-y-3">
                {product.bundlePricing.map((tier) => (
                  <button
                    type="button"
                    key={tier.label}
                    onClick={() => setSelectedBundle(tier.label)}
                    className={`rounded-[1.05rem] border px-5 py-4 ${
                      selectedBundle === tier.label
                        ? "border-[#3B7539] bg-[#3B7539] text-white"
                        : "border-[#1D1D1D]/10 bg-white text-black"
                    } w-full text-left`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-3xl font-semibold leading-none">{tier.label}</div>
                        {tier.saveAmount ? (
                          <div
                            className={`mt-2 text-base font-semibold ${
                              selectedBundle === tier.label ? "text-white/92" : "text-black"
                            }`}
                          >
                            Save {tier.saveAmount.replace("AUD ", "$")}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-4xl font-semibold leading-none">
                        {tier.totalPrice.replace("AUD ", "$")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {nonFlavourVariants.map((variant) => (
            <div key={variant.name} className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-[0.08em] text-black">
                {variant.name}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {variant.values.map((value) => (
                  <button
                    type="button"
                    key={`${variant.name}-${value}`}
                    onClick={() => {
                      setSelectedOptions((current) => ({
                        ...current,
                        [variant.name]: value,
                      }));
                    }}
                    className={`rounded-full border px-2.5 py-1.5 text-xs font-medium ${
                      selectedOptions[variant.name] === value
                        ? "border-[#3B7539] bg-[#3B7539] text-white"
                        : "border-[#1D1D1D]/10 bg-white text-black"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-1">
            <div className="space-y-3">
              {selectedQuantity ? (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      !selectedQuantity ||
                      !selectedVariantSelections.length ||
                      (flavourVariant && !isFlavourSelectionComplete)
                    ) {
                      return;
                    }

                    const flavourSummary = summarizeFlavourSelection(selectedVariantSelections);

                    onAddToCart({
                      id: `${product.url}-${selectedPurchaseLabel}-${selectedVariantSelections
                        .map((selection) => `${selection.variantId}:${selection.quantity}`)
                        .join(",")}`,
                      variantSelections: selectedVariantSelections,
                      productTitle: product.title,
                      productUrl: product.url,
                      imageUrl: activeImageUrl,
                      flavourSummary,
                      bundleLabel: selectedPurchaseLabel,
                      unitQuantity: selectedQuantity,
                      bundlePrice: parseMoney(activeBundlePrice),
                    });
                  }}
                  disabled={Boolean(flavourVariant && !isFlavourSelectionComplete)}
                  className={`block w-full rounded-[0.95rem] px-5 py-3 text-center text-base font-extrabold uppercase tracking-[0.08em] no-underline ${
                    flavourVariant && !isFlavourSelectionComplete
                      ? "cursor-not-allowed bg-[#1D1D1D]/25 text-white/80"
                      : "cursor-pointer bg-[#1D1D1D] text-white"
                  }`}
                >
                  Add to cart
                </button>
              ) : null}
              {flavourVariant && !isFlavourSelectionComplete ? (
                <div className="text-sm font-medium text-[#1D1D1D]/60">
                  Choose {selectedQuantity} flavour{selectedQuantity > 1 ? "s" : ""} to add this
                  bundle.
                </div>
              ) : null}
              <div className="text-sm font-semibold text-black">
                <a
                  href={product.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-black no-underline hover:text-black"
                >
                  View full product on vpa.com.au
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {flavourVariant ? (
        <div className="px-5 pt-7 pb-5 lg:px-7 lg:pt-8 lg:pb-6">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {flavourValues.map((value) => {
              const flavourImage = findFlavourImage(value, flavourImages);
              const isActiveValue = selectedFlavourSlots[activeFlavourSlot] === value;
              const selectedCount = flavourSelectionCounts[value] ?? 0;

              return (
                <button
                  type="button"
                  key={`${flavourVariant.name}-${value}`}
                  onClick={() => {
                    setSelectedFlavourSlots((current) => {
                      const next = [...current];
                      const slotIndex = selectedQuantity > 1 ? activeFlavourSlot : 0;
                      next[slotIndex] = value;
                      return next;
                    });

                    if (selectedQuantity > 1) {
                      setActiveFlavourSlot((current) =>
                        Math.min(current + 1, selectedQuantity - 1),
                      );
                    }
                  }}
                  className="text-center"
                >
                  <div className="h-full">
                    <div className="relative mx-auto w-[72px] overflow-visible">
                      {selectedCount ? (
                        <span className="absolute -top-2 -right-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#1D1D1D] px-1.5 text-[0.72rem] font-bold leading-none text-white shadow-sm ring-2 ring-white/90">
                          {selectedCount}
                        </span>
                      ) : null}
                      <div
                        className={`flex aspect-square w-[72px] items-center justify-center overflow-hidden rounded-[0.75rem] bg-[#EAEFE7] ${
                          isActiveValue ? "ring-2 ring-[#3B7539]" : ""
                        }`}
                      >
                        {flavourImage ? (
                          <img
                            src={flavourImage}
                            alt={value}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImagePlaceholder label={value} size="small" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`inline-block whitespace-nowrap text-center text-xs font-semibold leading-tight ${
                          isActiveValue ? "text-[#3B7539]" : "text-black"
                        }`}
                      >
                        {value}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AssistantTypingIndicator() {
  return (
    <article aria-live="polite" aria-label="VPA Coach is typing">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#1D1D1D]/50">
        VPA coach
      </div>
      <div className="inline-flex items-center gap-2 rounded-[1.35rem] border border-[#1D1D1D]/10 bg-white px-4 py-3 shadow-[0_10px_28px_rgba(23,58,64,0.06)]">
        <span className="typing-dot" />
        <span className="typing-dot typing-dot-delay-1" />
        <span className="typing-dot typing-dot-delay-2" />
      </div>
    </article>
  );
}

function ImagePlaceholder({ label, size }: { label: string; size: "small" | "large" }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#F7FAF1,transparent_65%),linear-gradient(180deg,#EDF2E7_0%,#E2E9DA_100%)] px-3 text-[#6B7167]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className={size === "large" ? "h-8 w-8" : "h-5 w-5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
        <circle cx="9" cy="10" r="1.25" />
        <path d="m7 16 3.2-3.2a1 1 0 0 1 1.42 0L14 15l1.7-1.7a1 1 0 0 1 1.41 0L20 16" />
      </svg>
      {size === "large" ? (
        <div className="mt-2 max-w-[16rem] text-center text-xs leading-tight text-[#6B7167]/75">
          {label}
        </div>
      ) : null}
    </div>
  );
}

function ProductGrid({
  products,
  title = "Best Sellers",
  onSelectProduct,
}: {
  products: RecommendedProduct[];
  title?: string;
  onSelectProduct: (product: RecommendedProduct) => void;
}) {
  return (
    <section className="mt-4 space-y-5">
      <div className="text-center">
        <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
          {title}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <button
            type="button"
            key={product.url}
            onClick={() => onSelectProduct(product)}
            className="block cursor-pointer rounded-[1rem] text-left no-underline"
          >
            <article className="space-y-3 rounded-[1rem] border border-transparent p-2 transition-colors duration-150 hover:border-[#3B7539]/25 hover:bg-[#F5F8F3]">
              <div className="overflow-hidden rounded-[0.75rem] bg-[#f5f7f3]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.title}
                    className="aspect-square w-full object-contain p-4"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-4 text-center text-sm font-semibold text-black">
                    {product.title}
                  </div>
                )}
              </div>
              <div className="space-y-1 text-center">
                <h3 className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-black sm:text-base">
                  {product.title}
                </h3>
                <p className="m-0 text-lg font-semibold text-[#4c8c3d]">
                  {product.price.startsWith("AUD ") ? `$${product.price.slice(4)}` : product.price}
                </p>
              </div>
            </article>
          </button>
        ))}
      </div>
    </section>
  );
}

function createThreadId() {
  return `thread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildThreadTitle(text: string) {
  const trimmed = text.trim().replace(/\s+/g, " ");

  if (trimmed.length <= 42) {
    return trimmed;
  }

  return `${trimmed.slice(0, 42).trimEnd()}...`;
}

function groupThreadsByDate(threads: SavedChatThread[]) {
  const groups = new Map<string, SavedChatThread[]>();

  for (const thread of threads) {
    const label = getThreadDateLabel(thread.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), thread]);
  }

  return Array.from(groups.entries()).map(([label, groupThreads]) => ({
    label,
    threads: groupThreads,
  }));
}

function getThreadDateLabel(updatedAt: number) {
  const updatedDate = new Date(updatedAt);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfUpdatedDate = new Date(
    updatedDate.getFullYear(),
    updatedDate.getMonth(),
    updatedDate.getDate(),
  );
  const dayDifference = Math.floor(
    (startOfToday.getTime() - startOfUpdatedDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDifference <= 0) {
    return "Today";
  }

  if (dayDifference === 1) {
    return "Yesterday";
  }

  if (dayDifference <= 7) {
    return "Previous 7 Days";
  }

  return "Older";
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "VP";
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isWorkoutListRequest(text: string) {
  const lowered = text.toLowerCase();
  const withoutSupplementPhrases = lowered
    .replace(/\bpre[-\s]?workout\b/g, " ")
    .replace(/\bpost[-\s]?workout\b/g, " ");

  if (/\bexercise\b|\bexercises\b|\broutine\b|\broutines\b/.test(withoutSupplementPhrases)) {
    return true;
  }

  return /\bworkout\b|\bworkouts\b/.test(withoutSupplementPhrases);
}

function attachWorkoutCardsToMessages(messages: DemoMessage[], workoutSlugs?: string[]) {
  if (!workoutSlugs?.length) {
    return messages;
  }

  let attached = false;

  return messages.map((message) => {
    if (attached || message.role !== "assistant" || message.kind !== "text") {
      return message;
    }

    attached = true;
    return {
      ...message,
      workoutSlugs,
    };
  });
}

function selectWorkoutCards(workoutSlugs: string[], workoutCatalog: WorkoutCatalogWorkout[]) {
  const workoutBySlug = new Map(workoutCatalog.map((workout) => [workout.slug, workout]));

  return workoutSlugs
    .map((slug) => workoutBySlug.get(slug) ?? buildFallbackWorkoutCard(slug))
    .filter((workout): workout is WorkoutCatalogWorkout => Boolean(workout));
}

function findWorkoutDetail(workoutSlug: string, workoutCatalog: WorkoutCatalogWorkout[]) {
  return (
    workoutCatalog.find((workout) => workout.slug === workoutSlug) ??
    buildFallbackWorkoutCard(workoutSlug)
  );
}

function buildFallbackWorkoutCard(slug: string): WorkoutCatalogWorkout | null {
  const workout = workouts.find((entry) => entry.id === slug);

  if (!workout) {
    return null;
  }

  return {
    slug: workout.id,
    name: workout.name,
    goal: workout.goal,
    level: workout.level,
    durationMinutes: workout.durationMinutes,
    summary: workout.summary,
    imageUrl: null,
    exercises: workout.exercises.map((exercise) => ({
      slug: exercise.id,
      name: exercise.name,
      mode: exercise.mode,
      defaultTarget: exercise.target,
      unit: exercise.unit,
      defaultRestSeconds: exercise.restSeconds,
      focus: exercise.focus,
      summary: exercise.focus,
      instructions: [],
      imageUrl: null,
    })),
    recommendedProducts: [],
  };
}

function readSavedThreads(): SavedChatThread[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return sanitizeSavedThreads(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeSavedThreads(threads: SavedChatThread[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(threads));
  } catch {}
}

function readSavedCartItems(): ChatCartItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CHAT_CART_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChatCartItem[];

    return Array.isArray(parsed)
      ? parsed.filter(
          (item) =>
            typeof item?.id === "string" &&
            typeof item?.productTitle === "string" &&
            typeof item?.productUrl === "string" &&
            (typeof item?.imageUrl === "string" || item?.imageUrl === null) &&
            (typeof item?.flavourSummary === "string" || item?.flavourSummary === null) &&
            typeof item?.bundleLabel === "string" &&
            typeof item?.unitQuantity === "number" &&
            typeof item?.bundlePrice === "number" &&
            typeof item?.selections === "number" &&
            Array.isArray(item?.variantSelections),
        )
      : [];
  } catch {
    return [];
  }
}

function writeSavedCartItems(items: ChatCartItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(CHAT_CART_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function readWorkoutActivity(): WorkoutActivityEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WORKOUT_ACTIVITY_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    return sanitizeWorkoutActivityEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeWorkoutActivity(items: WorkoutActivityEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORKOUT_ACTIVITY_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function readWorkoutActivitySeenAt() {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const raw = window.localStorage.getItem(WORKOUT_ACTIVITY_SEEN_AT_STORAGE_KEY);
    const value = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeWorkoutActivitySeenAt(value: number) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(WORKOUT_ACTIVITY_SEEN_AT_STORAGE_KEY, `${value}`);
  } catch {}
}

function formatActivityDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-AU", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function normalizeFlavourName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sanitizeArticleHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<form[\s\S]*?<\/form>/gi, "");
}

function normalizeRenderedRichText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isFormLikePage(page: RecommendedPage) {
  const haystack = `${page.title} ${page.summary} ${page.url} ${page.contentHtml}`.toLowerCase();

  return (
    haystack.includes("signup form") ||
    haystack.includes("sign up form") ||
    haystack.includes("/pages/vpa-signup-form") ||
    (haystack.includes("<form") &&
      haystack.includes("submit") &&
      (haystack.includes("email") || haystack.includes("first name")))
  );
}

function formatArticleMeta(article: RecommendedArticle) {
  const parts: string[] = [];

  if (article.publishedAt) {
    parts.push(
      new Intl.DateTimeFormat("en-AU", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(article.publishedAt)),
    );
  }

  if (article.readTimeMinutes) {
    parts.push(`${article.readTimeMinutes} min read`);
  }

  return parts.join(" • ");
}

function formatPageMeta(page: RecommendedPage) {
  const parts: string[] = [];

  if (page.pageType) {
    parts.push(page.pageType);
  }

  if (page.updatedAt) {
    parts.push(
      `Updated ${new Intl.DateTimeFormat("en-AU", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(page.updatedAt))}`,
    );
  }

  return parts.join(" • ");
}

function isProductDetailResponse(text: string) {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("here are the details for") ||
    lowered.includes("you can pick a bundle and flavour below")
  );
}

function findFlavourImage(flavour: string, flavourImages: Record<string, string>) {
  const normalized = normalizeFlavourName(flavour);

  if (flavourImages[normalized]) {
    return flavourImages[normalized];
  }

  for (const [name, url] of Object.entries(flavourImages)) {
    if (name.includes(normalized) || normalized.includes(name)) {
      return url;
    }
  }

  return null;
}

function parseBundleQuantity(bundleLabel: string | null) {
  if (!bundleLabel) {
    return null;
  }

  const match = bundleLabel.match(/^(\d+)x/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function isFlavourOption(optionName: string) {
  return /flavo[u]?r/i.test(optionName);
}

function areArraysEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function buildStorefrontProductJsonUrl(productUrl: string) {
  try {
    const url = new URL(productUrl);
    const pathname = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
    return `${url.origin}${pathname}.js`;
  } catch {
    return null;
  }
}

function findVariantChoice<
  T extends {
    selectedOptions: Array<{
      name: string;
      value: string;
    }>;
  },
>(variantChoices: T[], selectedVariants: Record<string, string>) {
  return (
    variantChoices.find((variant) =>
      variant.selectedOptions.every((option) => {
        const selected = selectedVariants[option.name];
        return selected ? selected === option.value : true;
      }),
    ) ??
    variantChoices[0] ??
    null
  );
}

function findSelectedVariant(
  product: RecommendedProduct,
  selectedVariants: Record<string, string>,
) {
  return findVariantChoice(product.variantChoices, selectedVariants);
}

function buildSelectedVariantSelections(
  product: RecommendedProduct,
  flavourVariant: RecommendedProduct["variants"][number] | null,
  selectedFlavourSlots: string[],
  selectedOptions: Record<string, string>,
) {
  if (!product.variantChoices.length) {
    return [];
  }

  if (!flavourVariant) {
    const selectedVariant = findSelectedVariant(product, selectedOptions);
    return selectedVariant
      ? [{ variantId: selectedVariant.id, flavourLabel: null, quantity: 1 }]
      : [];
  }

  const flavourCounts = new Map<string, number>();

  for (const flavour of selectedFlavourSlots) {
    if (!flavour.trim()) {
      continue;
    }

    flavourCounts.set(flavour, (flavourCounts.get(flavour) ?? 0) + 1);
  }

  return Array.from(flavourCounts.entries())
    .map(([flavourLabel, quantity]) => {
      const selectedVariant = findSelectedVariant(product, {
        ...selectedOptions,
        [flavourVariant.name]: flavourLabel,
      });

      if (!selectedVariant) {
        return null;
      }

      return {
        variantId: selectedVariant.id,
        flavourLabel,
        quantity,
      };
    })
    .filter((selection): selection is NonNullable<typeof selection> => Boolean(selection));
}

function summarizeFlavourSelection(
  selections: Array<{ flavourLabel: string | null; quantity: number }>,
) {
  const flavours = selections
    .map((selection) =>
      selection.flavourLabel
        ? selection.quantity > 1
          ? `${selection.quantity}x ${selection.flavourLabel}`
          : selection.flavourLabel
        : null,
    )
    .filter(Boolean);

  return flavours.length ? flavours.join(", ") : null;
}

function parseMoney(value: string) {
  const normalized = value.replace(/[^\d.]+/g, "");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(value);
}

function buildCheckoutUrl(items: ChatCartItem[]) {
  const byVariant = new Map<string, number>();

  for (const item of items) {
    for (const selection of item.variantSelections) {
      byVariant.set(
        selection.variantId,
        (byVariant.get(selection.variantId) ?? 0) + selection.quantity * item.selections,
      );
    }
  }

  if (byVariant.size === 0) {
    return null;
  }

  const cartPath = Array.from(byVariant.entries())
    .map(([variantId, quantity]) => `${variantId}:${quantity}`)
    .join(",");

  return `https://www.vpa.com.au/cart/${cartPath}`;
}
