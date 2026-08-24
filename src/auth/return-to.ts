export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "http://internal.local");
    if (
      url.origin !== "http://internal.local" ||
      url.pathname.startsWith("/login")
    )
      return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginHref(pathname: string, search = "", hash = "") {
  const requested = safeReturnTo(`${pathname}${search}${hash}`) ?? "/";
  return `/login?returnTo=${encodeURIComponent(requested)}`;
}
