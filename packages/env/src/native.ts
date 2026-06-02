import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// IMPORTANT: pass each var explicitly, NOT `runtimeEnv: process.env`.
// Metro inlines `process.env.KEY` (dot-notation static access) at bundle time,
// but does NOT inline property accesses on the process.env object reference
// when it is passed to another function. Passing the whole object causes
// production Hermes builds to see `undefined` for every key, making z.url()
// throw at module init — which crashes lib/auth.ts before the login screen
// can even mount (blank screen).
export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url(),
  },
  runtimeEnv: {
    EXPO_PUBLIC_SERVER_URL: process.env.EXPO_PUBLIC_SERVER_URL,
  },
  emptyStringAsUndefined: true,
});
