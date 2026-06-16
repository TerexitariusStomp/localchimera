#!/usr/bin/env node
/**
 * Krea Video Generation Script
 *
 * Generates a promotional video for the QVAC-Pear Miner Node
 * using the Krea AI API (text-to-video or image-to-video).
 *
 * Usage:
 *   KREA_API_KEY="your-api-key" node scripts/generate-krea-video.mjs
 *
 * Or with a Krea Workflow ID:
 *   KREA_API_KEY="your-api-key" KREA_WORKFLOW_ID="uuid" node scripts/generate-krea-video.mjs
 */

const KREA_BASE_URL = "https://api.krea.ai";

function getEnv(key, required = true) {
  const value = process.env[key];
  if (required && !value) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

async function kreaFetch(path, options = {}) {
  const apiKey = getEnv("KREA_API_KEY");
  const url = `${KREA_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Krea API error ${res.status}: ${text}`);
  }
  return res.json();
}

async function generateTextToVideo(prompt, options = {}) {
  const model = options.model || "kling/kling-2.5";
  const payload = {
    prompt,
    ...(options.aspect_ratio ? { aspect_ratio: options.aspect_ratio } : {}),
    ...(options.duration ? { duration: options.duration } : {}),
    ...(options.start_image ? { start_image: options.start_image } : {}),
    ...(options.end_image ? { end_image: options.end_image } : {}),
  };
  console.log(`Submitting video job to model: ${model}`);
  const result = await kreaFetch(`/generate/video/${model}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result;
}

async function waitForJob(jobId, intervalMs = 5000) {
  console.log(`Polling job ${jobId} every ${intervalMs}ms...`);
  while (true) {
    const job = await kreaFetch(`/jobs/${jobId}`);
    console.log(`  status: ${job.status}`);
    if (job.status === "completed" || job.status === "failed") {
      return job;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function runWorkflow(workflowId, inputs) {
  console.log(`Triggering Krea workflow: ${workflowId}`);
  const result = await kreaFetch(`/v1/workflows/${workflowId}/run`, {
    method: "POST",
    body: JSON.stringify({ inputs }),
  });
  return result;
}

async function main() {
  const workflowId = process.env.KREA_WORKFLOW_ID;

  // Prompt derived from the Cireeo video script (Scene 1 + Scene 2 visuals)
  const videoPrompt = `
Cinematic dark terminal screen with green monospace logs streaming in.
Text appears: "QVAC-Pear Miner Node" and "Inference by Day. Mining by Night."
The scene transitions to a futuristic split-screen diagram.
Left side: glowing chat bubbles and neural network icons representing AI inference.
Right side: interconnected blockchain nodes with flowing data streams.
A central mechanical gear labeled "NodeManager" rotates and switches between the two sides.
Peer-to-peer network mesh connects everything in the background.
Subtle camera pan from left to right, depth of field, cool blue and green color palette,
technical but accessible, builder-focused aesthetic, photorealistic CGI.
`.trim();

  try {
    let jobResult;

    if (workflowId) {
      // Run a deployed Krea workflow
      jobResult = await runWorkflow(workflowId, {
        prompt: videoPrompt,
        aspect_ratio: "16:9",
        duration: 5,
      });
    } else {
      // Direct video generation via Krea API
      // Note: Krea video generation endpoint may vary; adjust if needed.
      // Using the standard image/video subscribe endpoint pattern.
      console.log("Generating video directly via Krea API...");
      jobResult = await generateTextToVideo(videoPrompt, {
        model: "kling/kling-2.5",
        aspect_ratio: "16:9",
        duration: 5,
      });
    }

    console.log("\nJob submitted:");
    console.log(JSON.stringify(jobResult, null, 2));

    const jobId = jobResult.job_id || jobResult.id;
    if (jobId) {
      const completed = await waitForJob(jobId);
      if (completed.status === "completed") {
        const url = completed.result?.urls?.[0] || completed.result?.url;
        console.log("\nVideo ready:");
        console.log(url);
      } else {
        console.error("\nJob failed:", JSON.stringify(completed, null, 2));
        process.exit(1);
      }
    } else {
      console.log("No job_id returned; workflow may return result immediately.");
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

main();
