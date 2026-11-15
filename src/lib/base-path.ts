export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix a root-relative path with the deployment basePath.
 *
 * Needed for: fetch(), plain <a href>, <img src>, <form action>.
 * NOT needed for: next/link, useRouter().push() — Next prepends basePath
 * itself, and double-prefixing yields /apn/apn/... 404s.
 */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${BASE_PATH}${path}`;
}
