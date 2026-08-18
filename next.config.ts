import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin v14 depends on jwks-rsa v4, which in turn loads the
  // ESM-only jose v6 package. Next.js externalizes firebase-admin by default,
  // causing a CommonJS require(ESM) crash in Vercel Functions. Bundle this
  // dependency chain so Next can handle the ESM interop during compilation.
  transpilePackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;
