export type WorkoutSeedExercise = {
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
  imagePrompt: string;
};

export type WorkoutSeedProduct = {
  slug: string;
  title: string;
  category: string;
  priceLabel: string;
  benefit: string;
  imageUrl?: string;
  productUrl: string;
};

export type WorkoutSeed = {
  slug: string;
  name: string;
  goal: string;
  level: string;
  durationMinutes: number;
  summary: string;
  imagePrompt: string;
  exerciseSlugs: string[];
  recommendedProductSlugs: string[];
};

export const seedProducts: WorkoutSeedProduct[] = [
  {
    slug: "whey-isolate",
    title: "Whey Protein Isolate",
    category: "Recovery",
    priceLabel: "From $69",
    benefit: "Fast post-workout protein support after explosive or high-volume training.",
    imageUrl:
      "https://www.vpa.com.au/cdn/shop/files/3f495ceb-491b-496d-92af-c1b98f6a1804_460x.png?v=1753758405",
    productUrl: "https://www.vpa.com.au/products/whey-protein-isolate",
  },
  {
    slug: "pre-workout",
    title: "Pre-Workout",
    category: "Energy",
    priceLabel: "From $49",
    benefit: "A strong pairing for high-intensity sessions, jumps, sprints, and big effort blocks.",
    imageUrl:
      "https://www.vpa.com.au/cdn/shop/files/VPA_1200x1200_PRE_-_Purple_Rain_460x.png?v=1724390672",
    productUrl: "https://www.vpa.com.au/products/pre-workout",
  },
  {
    slug: "creatine",
    title: "Creatine",
    category: "Strength",
    priceLabel: "From $29",
    benefit:
      "Useful for repeat strength sessions, loaded carries, and progressive overload blocks.",
    imageUrl:
      "https://www.vpa.com.au/cdn/shop/files/CreatineMonohydratePowder-Australian-Made-VPAAustralia_460x.png?v=1733458843",
    productUrl: "https://www.vpa.com.au/products/creatine-monohydrate-powder",
  },
  {
    slug: "electrolytes",
    title: "Electrolytes",
    category: "Hydration",
    priceLabel: "From $24",
    benefit:
      "Helpful after sweaty conditioning circuits, longer intervals, and warm-weather training.",
    imageUrl:
      "https://www.vpa.com.au/cdn/shop/files/VPA-Hydration-Electrolytes-LemonLime-1200x1200_460x.png?v=1727835594",
    productUrl: "https://www.vpa.com.au/products/hydration-electrolytes",
  },
];

export const seedExercises: WorkoutSeedExercise[] = [
  {
    slug: "jump-squat",
    name: "Jump Squats",
    mode: "reps",
    defaultTarget: 12,
    unit: "reps",
    defaultRestSeconds: 25,
    focus: "Explosive legs",
    summary: "Drive through the floor, land softly, and keep the chest proud through each jump.",
    instructions: [
      "Stand tall with feet around shoulder width.",
      "Sit into a shallow squat, then explode upward.",
      "Land softly through the midfoot and reset before the next rep.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=CVaEhXotL7M",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person demonstrating a jump squat in a clean boutique gym\nSubject: trainer at the top of a controlled jump squat with knees soft and chest up\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical medium shot, centered subject, clear body position\nLighting/mood: bright natural gym lighting, energetic but premium\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "mountain-climber",
    name: "Mountain Climbers",
    mode: "timer",
    defaultTarget: 35,
    unit: "sec",
    defaultRestSeconds: 20,
    focus: "Cardio core",
    summary:
      "Keep shoulders stacked over wrists and run the knees in without letting the hips bounce.",
    instructions: [
      "Start in a strong plank with hands below shoulders.",
      "Drive one knee toward the chest, then switch legs quickly.",
      "Stay long through the spine and keep a steady rhythm.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=nmwgirgXLYM",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing mountain climbers on a mat in a modern training studio\nSubject: trainer in a plank driving one knee forward with strong shoulder position\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical low angle, full body, dynamic motion cues\nLighting/mood: crisp studio daylight, intense and clean\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "push-up",
    name: "Push-Ups",
    mode: "reps",
    defaultTarget: 10,
    unit: "reps",
    defaultRestSeconds: 30,
    focus: "Upper-body push",
    summary:
      "Lower as one line from shoulders to heels and press the floor away without shrugging.",
    instructions: [
      "Set up in a straight plank from head to heels.",
      "Lower the chest between the hands with elbows angled back.",
      "Press up until the arms are straight again.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=IODxDxX7oi4",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person holding a textbook push-up in a minimalist gym\nSubject: trainer near the bottom of a push-up with aligned body and active core\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical medium-wide shot, side profile for form clarity\nLighting/mood: calm bright studio light, premium athletic editorial feel\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "plank-hold",
    name: "Plank Hold",
    mode: "timer",
    defaultTarget: 40,
    unit: "sec",
    defaultRestSeconds: 30,
    focus: "Bracing core",
    summary:
      "Think long through the crown of the head and brace as if someone is about to tap your stomach.",
    instructions: [
      "Line elbows under shoulders and extend the legs behind you.",
      "Lift the body into one strong line from head to heel.",
      "Breathe steadily without letting the hips sag or pike.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=pSHjTRCQxIw",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person holding a forearm plank in a bright training space\nSubject: trainer in a perfect forearm plank with neutral neck and straight line posture\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical side view, full body, form-focused\nLighting/mood: soft daylight, focused and disciplined\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "reverse-crunch",
    name: "Reverse Crunch",
    mode: "reps",
    defaultTarget: 12,
    unit: "reps",
    defaultRestSeconds: 25,
    focus: "Lower abs",
    summary:
      "Curl the hips toward the ribs with control and keep the movement small enough to stay in the abs.",
    instructions: [
      "Lie on the back with knees bent and shins parallel to the floor.",
      "Brace the core, then gently roll the hips up off the mat.",
      "Lower slowly and reset before the next rep.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=hyv14e2QDq0",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing a reverse crunch on a mat in a bright training studio\nSubject: trainer lifting the hips slightly off the floor with knees bent and core engaged\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical three-quarter view, full body, clear floor position\nLighting/mood: clean studio daylight, focused and premium\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "goblet-squat",
    name: "Goblet Squat",
    mode: "reps",
    defaultTarget: 8,
    unit: "reps",
    defaultRestSeconds: 60,
    focus: "Lower-body strength",
    summary: "Hug the weight high, sit between the hips, and stand up through the whole foot.",
    instructions: [
      "Hold a dumbbell or kettlebell close to the chest.",
      "Squat down while keeping the elbows inside the knees.",
      "Drive back up tall with the chest lifted.",
    ],
    equipment: "Dumbbell or kettlebell",
    youtubeUrl: "https://www.youtube.com/watch?v=6xwGFn-J_Qg",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing a goblet squat with a dumbbell in a strength gym\nSubject: trainer at the bottom of a goblet squat with elbows inside knees and upright torso\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical medium-wide shot, clear body position\nLighting/mood: premium gym lighting, confident and grounded\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "romanian-deadlift",
    name: "Romanian Deadlift",
    mode: "reps",
    defaultTarget: 10,
    unit: "reps",
    defaultRestSeconds: 50,
    focus: "Posterior chain",
    summary: "Push the hips back like a hinge, keep the lats tight, and feel the hamstrings load.",
    instructions: [
      "Hold dumbbells or a bar close to the thighs.",
      "Hinge at the hips while keeping a soft knee bend.",
      "Stand tall again by squeezing the glutes.",
    ],
    equipment: "Barbell or dumbbells",
    youtubeUrl: "https://www.youtube.com/watch?v=2SHsk9AzdjA",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person demonstrating a romanian deadlift with dumbbells in a premium gym\nSubject: trainer in the hinge position with flat back and weights close to the legs\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical three-quarter profile, full body, technique-first\nLighting/mood: bright strength floor lighting, focused and powerful\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "dumbbell-row",
    name: "Dumbbell Row",
    mode: "reps",
    defaultTarget: 10,
    unit: "reps",
    defaultRestSeconds: 45,
    focus: "Upper-back pull",
    summary: "Brace the trunk, pull the elbow to the hip, and avoid twisting through the torso.",
    instructions: [
      "Support one hand on a bench or sturdy surface.",
      "Let the opposite arm hang with the dumbbell under the shoulder.",
      "Row the weight toward the ribcage, then lower with control.",
    ],
    equipment: "Dumbbell and bench",
    youtubeUrl: "https://www.youtube.com/watch?v=roCP6wCXPqo",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing a one-arm dumbbell row in a clean gym\nSubject: trainer rowing a dumbbell with one knee and hand supported on a bench\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical side angle, full body, clear pulling path\nLighting/mood: strong but natural gym light, premium editorial style\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "farmer-carry",
    name: "Farmer Carry",
    mode: "timer",
    defaultTarget: 45,
    unit: "sec",
    defaultRestSeconds: 40,
    focus: "Grip and trunk",
    summary:
      "Walk tall with ribs stacked over hips and let the weights challenge your grip and posture.",
    instructions: [
      "Pick up a pair of heavy weights and stand tall.",
      "Walk with short controlled steps and tight posture.",
      "Keep shoulders down and avoid leaning side to side.",
    ],
    equipment: "Two dumbbells or kettlebells",
    youtubeUrl: "https://www.youtube.com/watch?v=Fkzk_RqlYig",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person doing a farmer carry through a modern gym lane\nSubject: trainer walking tall with two heavy dumbbells and strong posture\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical full-body shot, slight low angle, motion-forward\nLighting/mood: crisp bright gym lighting, confident and strong\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "worlds-greatest-stretch",
    name: "World's Greatest Stretch",
    mode: "timer",
    defaultTarget: 30,
    unit: "sec",
    defaultRestSeconds: 15,
    focus: "Hips and thoracic spine",
    summary:
      "Open the hip, rotate through the upper back, and use the breath to make the position feel smoother.",
    instructions: [
      "Step into a deep lunge with both hands inside the front foot.",
      "Rotate the inside arm toward the ceiling and follow it with the eyes.",
      "Return the hand down and repeat calmly through the timer.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=7MZ0jJ9rRpY",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing world's greatest stretch on a mat in a recovery studio\nSubject: trainer in a deep lunge with one arm reaching upward in rotation\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical full-body shot, clear mobility pose\nLighting/mood: soft natural light, restorative and calm\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "dead-bug",
    name: "Dead Bug",
    mode: "reps",
    defaultTarget: 10,
    unit: "reps",
    defaultRestSeconds: 20,
    focus: "Deep core control",
    summary:
      "Lock the ribs down, move slowly, and keep the low back gently connected to the floor.",
    instructions: [
      "Lie on the back with arms up and knees bent over hips.",
      "Lower the opposite arm and leg away from each other slowly.",
      "Return to center and alternate sides.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=4XLEnwUr8lE",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person demonstrating a dead bug exercise on a mat\nSubject: trainer lying on the back with opposite arm and leg extended in control\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical top-three-quarter view, full body, instructional clarity\nLighting/mood: bright recovery studio light, precise and calm\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "glute-bridge",
    name: "Glute Bridge",
    mode: "reps",
    defaultTarget: 12,
    unit: "reps",
    defaultRestSeconds: 20,
    focus: "Posterior activation",
    summary: "Press through the heels, lift the hips without over-arching, and squeeze at the top.",
    instructions: [
      "Lie on the back with knees bent and feet planted.",
      "Drive through the heels to lift the hips.",
      "Pause briefly at the top, then lower with control.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=wPM8icPu6H8",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: athletic person performing a glute bridge on a mat in a clean studio\nSubject: trainer at the top of a glute bridge with strong hip extension and planted feet\nStyle/medium: photorealistic fitness photography\nComposition/framing: vertical side view, full body, technique-focused\nLighting/mood: airy studio light, calm and supportive\nConstraints: no logos; no text; no watermark",
  },
  {
    slug: "box-breathing",
    name: "Box Breathing",
    mode: "timer",
    defaultTarget: 60,
    unit: "sec",
    defaultRestSeconds: 10,
    focus: "Recovery downshift",
    summary:
      "Slow the breath, let the shoulders soften, and use the inhale-hold-exhale-hold rhythm to settle.",
    instructions: [
      "Sit or lie in a comfortable position.",
      "Inhale for four counts, hold for four, exhale for four, hold for four.",
      "Repeat gently until the timer ends.",
    ],
    youtubeUrl: "https://www.youtube.com/watch?v=tEmt1Znux58",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout exercise card\nPrimary request: calm athlete practicing box breathing in a light wellness studio\nSubject: trainer seated cross-legged with relaxed posture and hands resting on knees\nStyle/medium: photorealistic wellness photography\nComposition/framing: vertical medium shot, centered and uncluttered\nLighting/mood: soft calming daylight, restorative premium feel\nConstraints: no logos; no text; no watermark",
  },
];

export const seedWorkouts: WorkoutSeed[] = [
  {
    slug: "ignite-hiit",
    name: "Ignite HIIT",
    goal: "Fat-loss and conditioning",
    level: "Beginner to intermediate",
    durationMinutes: 24,
    summary:
      "A punchy cardio-and-core block with short surges, simple movement patterns, and clean rest windows.",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout program hero card\nPrimary request: premium HIIT workout image inside a bright modern gym\nSubject: two athletic people mid-circuit with jump squats and mountain climbers energy\nStyle/medium: photorealistic fitness photography\nComposition/framing: wide landscape hero, dynamic but clean, room for overlay text\nLighting/mood: bright motivating gym light, energetic and polished\nConstraints: no logos; no text; no watermark",
    exerciseSlugs: ["jump-squat", "mountain-climber", "push-up", "plank-hold"],
    recommendedProductSlugs: ["pre-workout", "electrolytes", "whey-isolate"],
  },
  {
    slug: "core-control",
    name: "Core Control",
    goal: "Abs strength and trunk stability",
    level: "Beginner to intermediate",
    durationMinutes: 20,
    summary:
      "A focused core session that mixes bracing, lower-ab control, and steady trunk work for home or gym days.",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout program hero card\nPrimary request: premium core workout image in a bright modern studio\nSubject: athletic person moving through a controlled abs circuit on a mat with focused energy\nStyle/medium: photorealistic fitness photography\nComposition/framing: wide landscape hero, grounded composition, premium editorial feel\nLighting/mood: clean daylight, confident and athletic\nConstraints: no logos; no text; no watermark",
    exerciseSlugs: ["dead-bug", "plank-hold", "mountain-climber", "reverse-crunch"],
    recommendedProductSlugs: ["electrolytes", "whey-isolate"],
  },
  {
    slug: "strength-builder",
    name: "Strength Builder",
    goal: "Muscle gain and progression",
    level: "Intermediate",
    durationMinutes: 38,
    summary:
      "A steady strength block built around controlled reps, loaded patterns, and longer resets between efforts.",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout program hero card\nPrimary request: premium strength workout image in a polished free-weights gym\nSubject: athletic person performing a goblet squat while strength tools sit nearby\nStyle/medium: photorealistic fitness photography\nComposition/framing: wide landscape hero, centered athlete, premium editorial feel\nLighting/mood: dramatic but natural gym lighting, strong and confident\nConstraints: no logos; no text; no watermark",
    exerciseSlugs: ["goblet-squat", "romanian-deadlift", "dumbbell-row", "farmer-carry"],
    recommendedProductSlugs: ["creatine", "whey-isolate"],
  },
  {
    slug: "reset-recovery",
    name: "Reset Recovery",
    goal: "Mobility and lower-intensity reset",
    level: "Any level",
    durationMinutes: 18,
    summary:
      "A calming recovery flow with mobility, bracing, and breathwork to help the session end lighter than it started.",
    imagePrompt:
      "Use case: photorealistic-natural\nAsset type: workout program hero card\nPrimary request: premium recovery workout image in a bright wellness studio\nSubject: athletic person moving through a mobility flow on a mat with calm focused energy\nStyle/medium: photorealistic wellness photography\nComposition/framing: wide landscape hero, balanced negative space, premium studio aesthetic\nLighting/mood: soft natural light, restorative and clean\nConstraints: no logos; no text; no watermark",
    exerciseSlugs: ["worlds-greatest-stretch", "dead-bug", "glute-bridge", "box-breathing"],
    recommendedProductSlugs: ["electrolytes", "whey-isolate"],
  },
];
