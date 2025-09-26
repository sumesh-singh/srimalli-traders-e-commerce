import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login | Sri Mallikarjuna Traders",
};

export default function LoginPage() {
  return (
    <main className="min-h-[70vh]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-1">
            New here? <Link href="/register" className="text-orange-600 hover:underline">Create an account</Link>
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}