import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL;

export const convexHttpClient = new ConvexHttpClient(CONVEX_URL);
