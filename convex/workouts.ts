import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import {
  seedExercises,
  seedProducts,
  seedWorkouts,
  type WorkoutSeed,
  type WorkoutSeedExercise,
  type WorkoutSeedProduct,
} from "./workoutSeed";

type CatalogExercise = WorkoutSeedExercise & {
  imageUrl: string | null;
};

type CatalogProduct = WorkoutSeedProduct;

type CatalogWorkout = Omit<WorkoutSeed, "exerciseSlugs" | "recommendedProductSlugs"> & {
  imageUrl: string | null;
  exercises: CatalogExercise[];
  recommendedProducts: CatalogProduct[];
};

const workoutOrder = new Map(seedWorkouts.map((workout, index) => [workout.slug, index]));
const exerciseOrder = new Map(seedExercises.map((exercise, index) => [exercise.slug, index]));
const productOrder = new Map(seedProducts.map((product, index) => [product.slug, index]));

function sortBySeedOrder<T extends { slug: string }>(entries: T[], order: Map<string, number>) {
  return [...entries].sort(
    (left, right) =>
      (order.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
  );
}

function buildSeedCatalog(): CatalogWorkout[] {
  const exerciseBySlug = new Map(seedExercises.map((exercise) => [exercise.slug, exercise]));
  const productBySlug = new Map(seedProducts.map((product) => [product.slug, product]));

  return seedWorkouts.map((workout) => ({
    ...workout,
    imageUrl: null,
    exercises: workout.exerciseSlugs
      .map((slug) => exerciseBySlug.get(slug))
      .filter((exercise): exercise is WorkoutSeedExercise => Boolean(exercise))
      .map((exercise) => ({
        ...exercise,
        imageUrl: null,
      })),
    recommendedProducts: workout.recommendedProductSlugs
      .map((slug) => productBySlug.get(slug))
      .filter((product): product is WorkoutSeedProduct => Boolean(product)),
  }));
}

async function upsertSeedProducts(ctx: MutationCtx) {
  for (const product of seedProducts) {
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", product.slug))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        title: product.title,
        category: product.category,
        priceLabel: product.priceLabel,
        benefit: product.benefit,
        imageUrl: product.imageUrl,
        productUrl: product.productUrl,
      });
      continue;
    }

    await ctx.db.insert("products", {
      slug: product.slug,
      title: product.title,
      category: product.category,
      priceLabel: product.priceLabel,
      benefit: product.benefit,
      imageUrl: product.imageUrl,
      productUrl: product.productUrl,
    });
  }
}

async function upsertSeedExercises(ctx: MutationCtx) {
  for (const exercise of seedExercises) {
    const existing = await ctx.db
      .query("exercises")
      .withIndex("by_slug", (q) => q.eq("slug", exercise.slug))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: exercise.name,
        mode: exercise.mode,
        defaultTarget: exercise.defaultTarget,
        unit: exercise.unit,
        defaultRestSeconds: exercise.defaultRestSeconds,
        focus: exercise.focus,
        summary: exercise.summary,
        instructions: exercise.instructions,
        equipment: exercise.equipment,
        youtubeUrl: exercise.youtubeUrl,
        imagePrompt: exercise.imagePrompt,
      });
      continue;
    }

    await ctx.db.insert("exercises", {
      slug: exercise.slug,
      name: exercise.name,
      mode: exercise.mode,
      defaultTarget: exercise.defaultTarget,
      unit: exercise.unit,
      defaultRestSeconds: exercise.defaultRestSeconds,
      focus: exercise.focus,
      summary: exercise.summary,
      instructions: exercise.instructions,
      equipment: exercise.equipment,
      youtubeUrl: exercise.youtubeUrl,
      imagePrompt: exercise.imagePrompt,
    });
  }
}

async function upsertSeedWorkouts(ctx: MutationCtx) {
  for (const workout of seedWorkouts) {
    const existing = await ctx.db
      .query("workouts")
      .withIndex("by_slug", (q) => q.eq("slug", workout.slug))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: workout.name,
        goal: workout.goal,
        level: workout.level,
        durationMinutes: workout.durationMinutes,
        summary: workout.summary,
        exerciseSlugs: workout.exerciseSlugs,
        recommendedProductSlugs: workout.recommendedProductSlugs,
        imagePrompt: workout.imagePrompt,
      });
      continue;
    }

    await ctx.db.insert("workouts", {
      slug: workout.slug,
      name: workout.name,
      goal: workout.goal,
      level: workout.level,
      durationMinutes: workout.durationMinutes,
      summary: workout.summary,
      exerciseSlugs: workout.exerciseSlugs,
      recommendedProductSlugs: workout.recommendedProductSlugs,
      imagePrompt: workout.imagePrompt,
    });
  }
}

async function ensureSeedCatalog(ctx: MutationCtx) {
  await upsertSeedProducts(ctx);
  await upsertSeedExercises(ctx);
  await upsertSeedWorkouts(ctx);
}

export const syncSeedCatalog = mutation({
  args: {},
  handler: async (ctx) => {
    await ensureSeedCatalog(ctx);

    return {
      workouts: seedWorkouts.length,
      exercises: seedExercises.length,
      products: seedProducts.length,
    };
  },
});

export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await ensureSeedCatalog(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveGeneratedImage = mutation({
  args: {
    kind: v.union(v.literal("workout"), v.literal("exercise")),
    slug: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ensureSeedCatalog(ctx);

    if (args.kind === "workout") {
      const workout = await ctx.db
        .query("workouts")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();

      if (!workout) {
        throw new Error(`Workout not found for slug "${args.slug}"`);
      }

      await ctx.db.patch(workout._id, {
        imageStorageId: args.storageId,
      });
    } else {
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", args.slug))
        .unique();

      if (!exercise) {
        throw new Error(`Exercise not found for slug "${args.slug}"`);
      }

      await ctx.db.patch(exercise._id, {
        imageStorageId: args.storageId,
      });
    }

    return await ctx.storage.getUrl(args.storageId);
  },
});

export const imageManifest = query({
  args: {},
  handler: async (ctx) => {
    const workouts = await ctx.db.query("workouts").collect();
    const exercises = await ctx.db.query("exercises").collect();

    if (!workouts.length || !exercises.length) {
      return [
        ...seedWorkouts.map((workout) => ({
          kind: "workout" as const,
          slug: workout.slug,
          name: workout.name,
          prompt: workout.imagePrompt,
        })),
        ...seedExercises.map((exercise) => ({
          kind: "exercise" as const,
          slug: exercise.slug,
          name: exercise.name,
          prompt: exercise.imagePrompt,
        })),
      ];
    }

    return [
      ...sortBySeedOrder(workouts, workoutOrder)
        .filter((workout) => !workout.imageStorageId)
        .map((workout) => ({
          kind: "workout" as const,
          slug: workout.slug,
          name: workout.name,
          prompt: workout.imagePrompt ?? "",
        })),
      ...sortBySeedOrder(exercises, exerciseOrder)
        .filter((exercise) => !exercise.imageStorageId)
        .map((exercise) => ({
          kind: "exercise" as const,
          slug: exercise.slug,
          name: exercise.name,
          prompt: exercise.imagePrompt ?? "",
        })),
    ];
  },
});

async function resolveStorageUrl(ctx: QueryCtx, storageId: Id<"_storage"> | undefined) {
  if (!storageId) {
    return null;
  }

  return await ctx.storage.getUrl(storageId);
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workoutDocs = sortBySeedOrder(await ctx.db.query("workouts").collect(), workoutOrder);
    const exerciseDocs = sortBySeedOrder(await ctx.db.query("exercises").collect(), exerciseOrder);
    const productDocs = sortBySeedOrder(await ctx.db.query("products").collect(), productOrder);

    if (!workoutDocs.length || !exerciseDocs.length) {
      return buildSeedCatalog();
    }

    const exercisesBySlug = new Map(exerciseDocs.map((exercise) => [exercise.slug, exercise]));
    const productsBySlug = new Map(productDocs.map((product) => [product.slug, product]));

    return await Promise.all(
      workoutDocs.map(
        async (workout): Promise<CatalogWorkout> => ({
          slug: workout.slug,
          name: workout.name,
          goal: workout.goal,
          level: workout.level,
          durationMinutes: workout.durationMinutes,
          summary: workout.summary,
          imagePrompt: workout.imagePrompt ?? "",
          imageUrl: await resolveStorageUrl(ctx, workout.imageStorageId),
          exercises: (
            await Promise.all(
              workout.exerciseSlugs
                .map((slug) => exercisesBySlug.get(slug))
                .filter((exercise): exercise is NonNullable<(typeof exerciseDocs)[number]> =>
                  Boolean(exercise),
                )
                .map(async (exercise) => ({
                  slug: exercise.slug,
                  name: exercise.name,
                  mode: exercise.mode,
                  defaultTarget: exercise.defaultTarget,
                  unit: exercise.unit,
                  defaultRestSeconds: exercise.defaultRestSeconds,
                  focus: exercise.focus,
                  summary: exercise.summary ?? "",
                  instructions: exercise.instructions ?? [],
                  equipment: exercise.equipment,
                  youtubeUrl: exercise.youtubeUrl,
                  imagePrompt: exercise.imagePrompt ?? "",
                  imageUrl: await resolveStorageUrl(ctx, exercise.imageStorageId),
                })),
            )
          ).sort(
            (left, right) =>
              (exerciseOrder.get(left.slug) ?? Number.MAX_SAFE_INTEGER) -
              (exerciseOrder.get(right.slug) ?? Number.MAX_SAFE_INTEGER),
          ),
          recommendedProducts: workout.recommendedProductSlugs
            .map((slug) => productsBySlug.get(slug))
            .filter((product): product is NonNullable<(typeof productDocs)[number]> =>
              Boolean(product),
            )
            .map((product) => ({
              slug: product.slug,
              title: product.title,
              category: product.category,
              priceLabel: product.priceLabel,
              benefit: product.benefit,
              imageUrl: product.imageUrl,
              productUrl:
                product.productUrl ??
                `https://www.vpa.com.au/search?q=${encodeURIComponent(product.title)}`,
            })),
        }),
      ),
    );
  },
});
