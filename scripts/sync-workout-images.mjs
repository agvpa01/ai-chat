#!/usr/bin/env node

import { readFile, mkdir, access } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const OUTPUT_DIR = path.resolve("output/imagegen");
const WORKOUT_SIZE = "1536x1024";
const EXERCISE_SIZE = "1024x1536";

function getFlag(name) {
  return process.argv.includes(name);
}

function getOption(name) {
  const index = process.argv.indexOf(name);

  if (index === -1) {
    return null;
  }

  return process.argv[index + 1] ?? null;
}

function resolveImageCliPath() {
  if (process.env.IMAGE_GEN) {
    return process.env.IMAGE_GEN;
  }

  const codexHome = process.env.CODEX_HOME ?? path.join(homedir(), ".codex");
  return path.join(codexHome, "skills/imagegen/scripts/image_gen.py");
}

async function loadLocalEnvFile(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {}
}

async function loadProjectEnv() {
  const envFiles = [path.resolve(".env.local"), path.resolve(".env")];

  for (const filePath of envFiles) {
    try {
      await access(filePath);
      await loadLocalEnvFile(filePath);
    } catch {}
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
  });
}

function commandExists(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    stdio: "ignore",
    env: process.env,
  });

  return result.status === 0;
}

async function uploadImage(uploadUrl, filePath) {
  const body = await readFile(filePath);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `Convex upload failed for ${filePath}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = await response.json();

  if (!payload.storageId) {
    throw new Error(`Convex upload did not return a storageId for ${filePath}`);
  }

  return payload.storageId;
}

async function main() {
  await loadProjectEnv();

  const dryRun = getFlag("--dry-run");
  const limitValue = getOption("--limit");
  const limit = limitValue ? Number(limitValue) : Number.POSITIVE_INFINITY;
  const pythonCommand = process.env.PYTHON_BIN ?? "python3";
  const hasUv = commandExists("uv");

  if (!process.env.VITE_CONVEX_URL) {
    throw new Error("VITE_CONVEX_URL is required to upload generated images into Convex storage.");
  }

  if (!dryRun && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is required for live image generation. Re-run with --dry-run to preview commands only.",
    );
  }

  const imageCliPath = resolveImageCliPath();
  const client = new ConvexHttpClient(process.env.VITE_CONVEX_URL);

  await mkdir(OUTPUT_DIR, { recursive: true });
  await client.mutation(api.workouts.syncSeedCatalog, {});

  const manifest = await client.query(api.workouts.imageManifest, {});
  const jobs = manifest.slice(0, limit);

  if (!jobs.length) {
    console.log("No workout or exercise images are waiting to be generated.");
    return;
  }

  for (const job of jobs) {
    const outputPath = path.join(OUTPUT_DIR, `${job.kind}-${job.slug}.png`);
    const size = job.kind === "workout" ? WORKOUT_SIZE : EXERCISE_SIZE;
    const baseArgs = [
      imageCliPath,
      "generate",
      "--prompt",
      job.prompt,
      "--size",
      size,
      "--quality",
      "high",
      "--output-format",
      "png",
      "--out",
      outputPath,
    ];

    console.log(`\nGenerating ${job.kind} image for ${job.slug}...`);

    if (dryRun) {
      await runCommand(pythonCommand, [...baseArgs, "--dry-run"]);
      continue;
    }

    if (hasUv) {
      await runCommand("uv", [
        "run",
        "--with",
        "openai",
        "--with",
        "pillow",
        "python",
        ...baseArgs,
      ]);
    } else {
      await runCommand(pythonCommand, baseArgs);
    }

    const uploadUrl = await client.mutation(api.workouts.generateImageUploadUrl, {});
    const storageId = await uploadImage(uploadUrl, outputPath);
    const savedUrl = await client.mutation(api.workouts.saveGeneratedImage, {
      kind: job.kind,
      slug: job.slug,
      storageId,
    });

    console.log(`Saved ${job.kind}:${job.slug} to Convex storage -> ${savedUrl ?? storageId}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
