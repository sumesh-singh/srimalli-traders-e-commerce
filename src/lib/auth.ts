import { NextRequest } from "next/server";

// Minimal auth helper to satisfy imports in API routes.
// Replace with real authentication integration when available.
export type AuthUser = {
  id: number;
  role: "retail" | "wholesale" | string;
  email?: string;
  name?: string;
};

export async function getCurrentUser(_req: NextRequest): Promise<AuthUser | null> {
  // Guest by default. If you later integrate auth, detect the user here.
  // Example (optional): parse a bearer token from headers to mock a user.
  // const auth = _req.headers.get("authorization");
  // if (auth?.startsWith("Bearer ")) {
  //   const token = auth.slice(7);
  //   if (token === "demo-wholesale") return { id: 1, role: "wholesale" };
  //   if (token === "demo-retail") return { id: 2, role: "retail" };
  // }
  return null;
}