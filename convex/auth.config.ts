import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      // Clerk issuer domain used by Convex to validate JWTs.
      domain: "https://caring-civet-44.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
