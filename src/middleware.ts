import { type NextRequest, type NextFetchEvent } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const withClerk = clerkMiddleware();

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname === "/prototype"
  )
    return;
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
