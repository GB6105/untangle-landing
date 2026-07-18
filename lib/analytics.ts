import type { PostHog } from "posthog-js";

/**
 * Usage analytics for the 쪼개기(Split) feature, backed by PostHog.
 *
 * Principles:
 * - Explicit events only — autocapture, session replay, automatic pageviews,
 *   and every remote-config-toggleable auto-collection (exceptions, dead
 *   clicks, heatmaps, web vitals, surveys) are pinned off, so nothing can be
 *   enabled from the PostHog dashboard without a code change here.
 * - Metadata only — never send user content (goal/answer text). Callers pass
 *   lengths, counts, and enum-ish keys instead.
 * - Fail silent — analytics must never break the product. Missing token means
 *   every call is a no-op, and capture errors are swallowed.
 * - Zero cost when off — the SDK is loaded with a dynamic import only when a
 *   token exists; without one, no PostHog bytes are ever fetched.
 */

type EventProps = Record<string, string | number | boolean>;

let client: PostHog | null = null;
// Non-null while the SDK chunk is loading: events fired before init resolves
// (e.g. split_view on a slow connection) are queued and flushed, not dropped.
let queue: Array<[string, EventProps | undefined]> | null = null;

/** Called once from instrumentation-client.ts before hydration. */
export function initAnalytics(): void {
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  if (!token || client || queue) return;
  queue = [];
  import("posthog-js")
    .then(({ default: posthog }) => {
      posthog.init(token, {
        api_host:
          process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
        defaults: "2026-06-25",
        // Explicit events only (see module docblock). Several of these
        // default to "follow remote config" when left undefined — pin them
        // so a dashboard toggle can never start collecting on its own.
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        capture_exceptions: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_performance: false,
        disable_surveys: true,
        // No lazy-loaded feature is wanted, so also block the SDK from
        // fetching external extension scripts (recorder, surveys, site apps).
        disable_external_dependency_loading: true,
        // Anonymous events only — we never call identify(), so no person
        // profiles are created and events stay cheap and privacy-lean.
        person_profiles: "identified_only",
        // The "2026-01-30"+ defaults auto-mark localhost as an internal user,
        // which force-enables person processing in dev. Explicitly off to
        // keep the no-person-profiles invariant everywhere.
        internal_or_test_user_hostname: null,
      });
      client = posthog;
      const backlog = queue ?? [];
      queue = null;
      for (const [event, props] of backlog) client.capture(event, props);
    })
    .catch(() => {
      queue = null; // SDK failed to load — analytics stays off.
    });
}

/** Fire-and-forget event capture. Safe to call anywhere on the client. */
export function track(event: string, props?: EventProps): void {
  try {
    if (client) client.capture(event, props);
    else if (queue) queue.push([event, props]);
  } catch {
    // Analytics must never break the app.
  }
}
