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

export function WorkoutCardGrid({
  workouts,
  onAskAboutWorkout,
}: {
  workouts: WorkoutCatalogWorkout[];
  onAskAboutWorkout: (workout: WorkoutCatalogWorkout) => void;
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
          <article
            key={workout.slug}
            className="overflow-hidden rounded-[1.5rem] border border-[#1D1D1D]/10 bg-white"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#EEF4EE]">
              {workout.imageUrl ? (
                <img
                  src={workout.imageUrl}
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
              </div>

              <div className="space-y-2">
                <h3 className="m-0 text-[1.5rem] font-semibold tracking-[-0.04em] text-[#173A40]">
                  {workout.name}
                </h3>
                <div className="text-sm font-semibold uppercase tracking-[0.1em] text-[#2F6A4A]">
                  {workout.goal}
                </div>
                <p className="m-0 text-sm leading-7 text-[#173A40]/70">{workout.summary}</p>
              </div>

              <div className="space-y-2">
                <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[#2F6A4A]">
                  Exercises
                </div>
                <div className="flex flex-wrap gap-2">
                  {workout.exercises.slice(0, 4).map((exercise) => (
                    <span
                      key={exercise.slug}
                      className="rounded-full bg-[#F6F7F2] px-3 py-1.5 text-xs font-medium text-[#173A40]"
                    >
                      {exercise.name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onAskAboutWorkout(workout)}
                className="w-full rounded-[1rem] bg-[#173A40] px-4 py-3 text-sm font-semibold text-white"
              >
                Ask about this workout
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
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
