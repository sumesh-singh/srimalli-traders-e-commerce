import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Register | Sri Mallikarjuna Traders",
};

export default function RegisterPage() {
  return (
    <main className="min-h-[70vh]">
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Create your account</h1>
          <p className="text-muted-foreground mt-1">
            Already have an account? <Link href="/login" className="text-orange-600 hover:underline">Sign in</Link>
          </p>
        </div>
        <RegisterForm />
      </section>
    </main>
  );
}