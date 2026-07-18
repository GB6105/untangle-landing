// Runs once on the client before hydration (Next.js file convention).
// Initializes PostHog; a missing NEXT_PUBLIC_POSTHOG_KEY leaves analytics off.
import { initAnalytics } from "./lib/analytics";

initAnalytics();
