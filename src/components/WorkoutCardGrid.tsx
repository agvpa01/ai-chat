import { Clock3, Pause, Play, PlayCircle, RotateCcw, SkipForward, X } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { buildSafeYoutubeEmbedUrl, sanitizeAssetUrl, sanitizeVpaUrl } from "../lib/url-safety";

export type WorkoutCatalogProduct = {
  slug: string;
  title: string;
  category: string;
  priceLabel: string;
  benefit: string;
  imageUrl?: string;
  productUrl: string;
};

export type WorkoutCatalogExercise = {
  slug: string;
  name: string;
  mode: "reps" | "timer";
  defaultTarget: number;
  unit: string;
  defaultRestSeconds: number;
  focus: string;
  summary: string;
  instructions: string[];
  equipment?: string;
  youtubeUrl?: string;
  imageUrl: string | null;
};

export type WorkoutCatalogWorkout = {
  slug: string;
  name: string;
  goal: string;
  level: string;
  durationMinutes: number;
  summary: string;
  imageUrl: string | null;
  exercises: WorkoutCatalogExercise[];
  recommendedProducts: WorkoutCatalogProduct[];
};

export type WorkoutActivityLog = {
  workoutSlug: string;
  workoutName: string;
  type: "started" | "completed";
  completedExercises: number;
  totalExercises: number;
  timestamp: number;
};

export function WorkoutCardGrid({
  workouts,
  onSelectWorkout,
}: {
  workouts: WorkoutCatalogWorkout[];
  onSelectWorkout: (workout: WorkoutCatalogWorkout) => void;
}) {
  return (
    <section className="mt-5 space-y-5">
      <div className="text-center">
        <div className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-black">
          Workout Picks
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {workouts.map((workout) => (
          <button
            type="button"
            key={workout.slug}
            onClick={() => onSelectWorkout(workout)}
            className="overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white text-left transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#EEF4EE]">
              {workout.imageUrl ? (
                <img
                  src={sanitizeAssetUrl(workout.imageUrl) ?? undefined}
                  alt={workout.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <WorkoutImagePlaceholder title={workout.name} subtitle={workout.goal} />
              )}
            </div>

            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#2F6A4A]">
                  {workout.level}
                </span>
                <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#173A40]">
                  {workout.durationMinutes} min
                </span>
                <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#173A40]">
                  {workout.exercises.length} exercises
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="m-0 text-[1.5rem] font-semibold tracking-[-0.04em] text-[#173A40]">
                  {workout.name}
                </h3>
                <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[#2F6A4A]">
                  {workout.goal}
                </div>
                <p className="m-0 text-sm leading-6 text-[#173A40]/64">
                  {shortWorkoutSummary(workout)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function WorkoutDetailCard({
  workout,
  onTrackWorkoutActivity,
}: {
  workout: WorkoutCatalogWorkout;
  onTrackWorkoutActivity?: (activity: WorkoutActivityLog) => void;
}) {
  const [selectedVideo, setSelectedVideo] = useState<{
    title: string;
    embedUrl: string;
  } | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<"exercise" | "rest" | "complete">("exercise");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      workout.exercises.map((exercise) => [exercise.slug, exercise.defaultTarget]),
    ),
  );
  const hasLoggedCompletionRef = useRef(false);

  useEffect(() => {
    if (!selectedVideo) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedVideo(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedVideo]);

  const activeExercise = workout.exercises[exerciseIndex] ?? workout.exercises[0] ?? null;
  const nextExercise = workout.exercises[exerciseIndex + 1] ?? null;
  const activeEmbedUrl = buildYoutubeEmbedUrl(activeExercise?.youtubeUrl);
  const isLastExercise = exerciseIndex >= workout.exercises.length - 1;
  const activeTarget = activeExercise
    ? (targets[activeExercise.slug] ?? activeExercise.defaultTarget)
    : 0;

  const moveToNextExercise = useEffectEvent(() => {
    if (isLastExercise) {
      setPhase("complete");
      setIsRunning(false);
      setRemainingSeconds(null);
      return;
    }

    const upcomingExercise = workout.exercises[exerciseIndex + 1];

    if (!upcomingExercise) {
      setPhase("complete");
      setIsRunning(false);
      setRemainingSeconds(null);
      return;
    }

    setExerciseIndex((current) => current + 1);
    setPhase("exercise");

    if (upcomingExercise.mode === "timer") {
      const upcomingTarget = targets[upcomingExercise.slug] ?? upcomingExercise.defaultTarget;
      setRemainingSeconds(upcomingTarget);
      setIsRunning(true);
    } else {
      setRemainingSeconds(null);
      setIsRunning(false);
    }
  });

  const beginRest = useEffectEvent(() => {
    if (!activeExercise) {
      return;
    }

    if (isLastExercise) {
      setPhase("complete");
      setIsRunning(false);
      setRemainingSeconds(null);
      return;
    }

    setPhase("rest");
    setRemainingSeconds(activeExercise.defaultRestSeconds);
    setIsRunning(true);
  });

  useEffect(() => {
    if (!isStarted) {
      return;
    }

    if (!isRunning || remainingSeconds == null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemainingSeconds((current) => {
        if (current == null) {
          return current;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [isRunning, isStarted, remainingSeconds]);

  useEffect(() => {
    if (!isStarted || remainingSeconds !== 0) {
      return;
    }

    if (phase === "exercise" && activeExercise?.mode === "timer") {
      beginRest();
      return;
    }

    if (phase === "rest") {
      moveToNextExercise();
    }
  }, [activeExercise, beginRest, isStarted, moveToNextExercise, phase, remainingSeconds]);

  useEffect(() => {
    if (!isStarted || phase !== "complete" || hasLoggedCompletionRef.current) {
      return;
    }

    hasLoggedCompletionRef.current = true;
    onTrackWorkoutActivity?.({
      workoutSlug: workout.slug,
      workoutName: workout.name,
      type: "completed",
      completedExercises: workout.exercises.length,
      totalExercises: workout.exercises.length,
      timestamp: Date.now(),
    });
  }, [
    isStarted,
    onTrackWorkoutActivity,
    phase,
    workout.exercises.length,
    workout.name,
    workout.slug,
  ]);

  function startWorkout() {
    const firstExercise = workout.exercises[0];
    hasLoggedCompletionRef.current = false;

    setIsStarted(true);
    setExerciseIndex(0);
    setPhase("exercise");
    onTrackWorkoutActivity?.({
      workoutSlug: workout.slug,
      workoutName: workout.name,
      type: "started",
      completedExercises: 0,
      totalExercises: workout.exercises.length,
      timestamp: Date.now(),
    });

    if (firstExercise?.mode === "timer") {
      setRemainingSeconds(targets[firstExercise.slug] ?? firstExercise.defaultTarget);
      setIsRunning(true);
    } else {
      setRemainingSeconds(null);
      setIsRunning(false);
    }
  }

  function restartWorkout() {
    setTargets(
      Object.fromEntries(
        workout.exercises.map((exercise) => [exercise.slug, exercise.defaultTarget]),
      ),
    );
    setSelectedVideo(null);
    startWorkout();
  }

  function adjustTarget(delta: number) {
    if (!activeExercise) {
      return;
    }

    setTargets((current) => {
      const existing = current[activeExercise.slug] ?? activeExercise.defaultTarget;
      const minimum = activeExercise.mode === "timer" ? 5 : 1;
      const nextValue = Math.max(minimum, existing + delta);

      return {
        ...current,
        [activeExercise.slug]: nextValue,
      };
    });

    if (activeExercise.mode === "timer" && phase === "exercise") {
      setRemainingSeconds((current) => {
        const base = current ?? activeTarget;
        return Math.max(5, base + delta);
      });
    }
  }

  return (
    <>
      <section className="mt-5 overflow-hidden rounded-[1.6rem] border border-[#1D1D1D]/10 bg-white">
        <div className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
            <div className="space-y-5">
              <div className="overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white">
                <div className="aspect-[16/10] overflow-hidden bg-[#EEF4EE]">
                  {workout.imageUrl ? (
                    <img
                      src={workout.imageUrl}
                      alt={workout.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <WorkoutImagePlaceholder title={workout.name} subtitle={workout.goal} />
                  )}
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#2F6A4A]">
                      {workout.level}
                    </span>
                    <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#173A40]">
                      {workout.durationMinutes} min
                    </span>
                    <span className="rounded-full border border-[#173A40]/8 bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#173A40]">
                      {workout.exercises.length} exercises
                    </span>
                  </div>

                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[#2F6A4A]">
                      {workout.goal}
                    </div>
                    <p className="mt-3 mb-0 text-sm leading-7 text-[#173A40]/72 sm:text-base">
                      {workout.summary}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {!isStarted || phase === "complete" ? (
                      <button
                        type="button"
                        onClick={phase === "complete" ? restartWorkout : startWorkout}
                        className="rounded-full bg-[#173A40] px-5 py-3 text-sm font-semibold text-white"
                      >
                        {phase === "complete" ? "Restart workout" : "Start workout"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={restartWorkout}
                        className="inline-flex items-center gap-2 rounded-full border border-[#173A40]/10 bg-white px-4 py-3 text-sm font-semibold text-[#173A40]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restart
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[0.8rem] font-semibold uppercase tracking-[0.18em] text-[#173A40]">
                Exercises
              </div>
              <div className="space-y-4">
                {workout.exercises.map((exercise, index) => {
                  const videoEmbedUrl = buildYoutubeEmbedUrl(exercise.youtubeUrl);

                  return (
                    <article
                      key={exercise.slug}
                      className={`overflow-hidden rounded-[1.35rem] border bg-white ${
                        isStarted && index === exerciseIndex
                          ? "border-[#173A40]/18 shadow-[0_12px_30px_rgba(23,58,64,0.08)]"
                          : "border-[#1D1D1D]/10"
                      }`}
                    >
                      <div className="grid gap-0 sm:grid-cols-[5.75rem_minmax(0,1fr)]">
                        <div className="relative aspect-square overflow-hidden bg-[#EEF4EE]">
                          {sanitizeAssetUrl(exercise.imageUrl) ? (
                            <img
                              src={sanitizeAssetUrl(exercise.imageUrl) ?? undefined}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <WorkoutImagePlaceholder
                              title={exercise.name}
                              subtitle={exercise.focus}
                            />
                          )}
                          {videoEmbedUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedVideo({
                                  title: exercise.name,
                                  embedUrl: videoEmbedUrl,
                                })
                              }
                              className="absolute inset-0 flex items-center justify-center bg-black/18 text-white transition-colors hover:bg-black/28"
                            >
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#173A40]/92">
                                <PlayCircle className="h-4 w-4" />
                              </span>
                            </button>
                          ) : null}
                        </div>
                        <div className="space-y-2.5 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                                Exercise {index + 1}
                              </div>
                              <h4 className="mt-1 mb-0 text-base font-semibold tracking-[-0.02em] text-[#173A40]">
                                {exercise.name}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-[#F5F9F6] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#173A40]">
                                {exercise.focus}
                              </span>
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F9F6] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#173A40]">
                                <Clock3 className="h-3 w-3" />
                                {targets[exercise.slug] ?? exercise.defaultTarget} {exercise.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>

          {isStarted ? (
            <div className="overflow-hidden rounded-[1.5rem] border border-[#173A40]/10 bg-[linear-gradient(160deg,#F7FBF8_0%,#EEF7F0_100%)]">
              <div className="p-5 sm:p-6">
                {phase === "complete" ? (
                  <div className="space-y-4">
                    <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                      Workout complete
                    </div>
                    <h3 className="m-0 text-[1.9rem] font-semibold tracking-[-0.04em] text-[#173A40]">
                      Nice work.
                    </h3>
                    <p className="m-0 text-sm leading-7 text-[#173A40]/70 sm:text-base">
                      You finished {workout.name}. Restart if you want to run it again.
                    </p>
                    {workout.recommendedProducts.length ? (
                      <div className="space-y-4 rounded-[1.3rem] border border-[#173A40]/10 bg-white p-4 sm:p-5">
                        <div className="space-y-1">
                          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                            Suggested supplements
                          </div>
                          <p className="m-0 text-sm leading-7 text-[#173A40]/70 sm:text-base">
                            Here are a few VPA picks that fit this session and recovery window.
                          </p>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {workout.recommendedProducts.map((product) => {
                            const safeProductUrl = sanitizeVpaUrl(product.productUrl);

                            return safeProductUrl ? (
                              <a
                                key={product.slug}
                                href={safeProductUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-[1.1rem] border border-[#173A40]/10 bg-[#F8FBF8] p-4 text-inherit no-underline transition-transform duration-200 hover:-translate-y-0.5"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="rounded-full bg-white px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#2F6A4A]">
                                    {product.category}
                                  </span>
                                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/58">
                                    {product.priceLabel}
                                  </span>
                                </div>
                                <h4 className="mt-3 mb-0 text-base font-semibold tracking-[-0.02em] text-[#173A40]">
                                  {product.title}
                                </h4>
                                <p className="mt-2 mb-0 text-sm leading-6 text-[#173A40]/68">
                                  {product.benefit}
                                </p>
                                <div className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]">
                                  View supplement
                                </div>
                              </a>
                            ) : null;
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : phase === "rest" ? (
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_13rem]">
                    <div className="space-y-4">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                        Rest phase
                      </div>
                      <h3 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[#173A40]">
                        Catch your breath.
                      </h3>
                      <p className="m-0 text-sm leading-7 text-[#173A40]/70 sm:text-base">
                        {nextExercise
                          ? `Next up: ${nextExercise.name}.`
                          : "You are almost done with this workout."}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setIsRunning((current) => !current)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#173A40] px-4 py-3 text-sm font-semibold text-white"
                        >
                          {isRunning ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4 fill-current" />
                          )}
                          {isRunning ? "Pause rest" : "Resume rest"}
                        </button>
                        <button
                          type="button"
                          onClick={moveToNextExercise}
                          className="inline-flex items-center gap-2 rounded-full border border-[#173A40]/10 bg-white px-4 py-3 text-sm font-semibold text-[#173A40]"
                        >
                          <SkipForward className="h-4 w-4" />
                          Skip rest
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-center rounded-[1.25rem] border border-[#173A40]/8 bg-white px-4 py-6 text-center">
                      <div>
                        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                          Rest timer
                        </div>
                        <div className="mt-2 text-[3rem] font-semibold tracking-[-0.06em] text-[#173A40]">
                          {remainingSeconds ?? 0}
                        </div>
                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/54">
                          seconds
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeExercise ? (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                        Current exercise
                      </div>
                      <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#173A40]/52">
                        Step {exerciseIndex + 1} of {workout.exercises.length}
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-white/75">
                      <div
                        className="h-full rounded-full bg-[#173A40] transition-[width] duration-300"
                        style={{
                          width: `${((exerciseIndex + 1) / Math.max(workout.exercises.length, 1)) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
                      <div className="rounded-[1.4rem] border border-[#173A40]/10 bg-white p-4 sm:p-5">
                        <div className="grid gap-5 md:grid-cols-[9rem_minmax(0,1fr)]">
                          <div className="relative mx-auto aspect-square w-full max-w-[9rem] overflow-hidden rounded-[1.2rem] bg-[#EAF2EC]">
                            {sanitizeAssetUrl(activeExercise.imageUrl) ? (
                              <img
                                src={sanitizeAssetUrl(activeExercise.imageUrl) ?? undefined}
                                alt={activeExercise.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <WorkoutImagePlaceholder
                                title={activeExercise.name}
                                subtitle={activeExercise.focus}
                              />
                            )}
                            {activeEmbedUrl ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedVideo({
                                    title: activeExercise.name,
                                    embedUrl: activeEmbedUrl,
                                  })
                                }
                                className="absolute inset-0 flex items-center justify-center bg-black/18 text-white transition-colors hover:bg-black/28"
                              >
                                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#173A40]/92">
                                  <PlayCircle className="h-5 w-5" />
                                </span>
                              </button>
                            ) : null}
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-3">
                              <h3 className="m-0 text-[2rem] font-semibold tracking-[-0.04em] text-[#173A40]">
                                {activeExercise.name}
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#173A40]">
                                  {activeExercise.focus}
                                </span>
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F9F6] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[#173A40]">
                                  <Clock3 className="h-3 w-3" />
                                  {activeTarget} {activeExercise.unit}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mx-auto mt-5 flex w-full max-w-[22.75rem] flex-col items-center gap-3">
                          <div className="grid w-full gap-3 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() =>
                                adjustTarget(activeExercise.mode === "timer" ? -5 : -1)
                              }
                              className="w-full rounded-full border border-[#173A40]/10 bg-[#F8FBF8] px-4 py-3 text-sm font-semibold text-[#173A40]"
                            >
                              {activeExercise.mode === "timer" ? "-5 sec" : "-1 rep"}
                            </button>
                            <button
                              type="button"
                              onClick={() => adjustTarget(activeExercise.mode === "timer" ? 5 : 1)}
                              className="w-full rounded-full border border-[#173A40]/10 bg-[#F8FBF8] px-4 py-3 text-sm font-semibold text-[#173A40]"
                            >
                              {activeExercise.mode === "timer" ? "+5 sec" : "+1 rep"}
                            </button>
                          </div>

                          {activeExercise.mode === "reps" ? (
                            <button
                              type="button"
                              onClick={beginRest}
                              className="w-full rounded-full bg-[#173A40] px-5 py-3 text-sm font-semibold text-white"
                            >
                              Mark done
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsRunning((current) => !current)}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#173A40] px-5 py-3 text-sm font-semibold text-white"
                            >
                              {isRunning ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4 fill-current" />
                              )}
                              {isRunning ? "Pause timer" : "Resume timer"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={beginRest}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#173A40]/10 bg-white px-4 py-3 text-sm font-semibold text-[#173A40]"
                          >
                            <SkipForward className="h-4 w-4" />
                            Skip to rest
                          </button>
                        </div>
                      </div>

                      <div className="flex items-stretch">
                        <div className="flex w-full items-center justify-center rounded-[1.25rem] border border-[#173A40]/8 bg-white px-4 py-6 text-center">
                          <div>
                            <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                              {activeExercise.mode === "timer" ? "Time left" : "Target"}
                            </div>
                            <div className="mt-2 text-[3rem] font-semibold tracking-[-0.06em] text-[#173A40]">
                              {activeExercise.mode === "timer"
                                ? (remainingSeconds ?? activeTarget)
                                : activeTarget}
                            </div>
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#173A40]/54">
                              {activeExercise.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {selectedVideo ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/56 p-4 backdrop-blur-[2px]"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-[1.5rem] border border-white/12 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white sm:px-5">
              <div className="text-lg font-semibold">{selectedVideo.title}</div>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/6 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="aspect-video bg-black">
              <iframe
                src={buildSafeYoutubeEmbedUrl(selectedVideo.embedUrl) ?? undefined}
                title={selectedVideo.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="no-referrer"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function WorkoutImagePlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#F8FBF8,transparent_64%),linear-gradient(180deg,#EDF5EE_0%,#DDE9E1_100%)] px-6 text-center">
      <div className="rounded-full border border-white/70 bg-white/75 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
        Workout
      </div>
      <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#173A40]">{title}</div>
      <div className="mt-2 max-w-[14rem] text-sm leading-6 text-[#173A40]/60">{subtitle}</div>
    </div>
  );
}

function shortWorkoutSummary(workout: WorkoutCatalogWorkout) {
  const exerciseNames = workout.exercises
    .slice(0, 3)
    .map((exercise) => exercise.name)
    .join(", ");

  return exerciseNames ? exerciseNames : workout.summary;
}

function buildYoutubeEmbedUrl(youtubeUrl?: string) {
  return buildSafeYoutubeEmbedUrl(youtubeUrl);
}
