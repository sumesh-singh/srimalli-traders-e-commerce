"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function WholesaleRegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    gstin: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    message: "",
  });

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName || !form.contactName || !form.phone) {
      toast.error("Please fill required fields");
      return;
    }
    try {
      setSubmitting(true);
      const token = typeof window !== "undefined" ? localStorage.getItem("bearer_token") : null;
      const res = await fetch("/api/wholesale/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Submission failed");
      }
      toast.success("Application submitted! We'll get back within 24-48h.");
      router.push("/");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Wholesale Registration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm">Business Name *</label>
              <Input name="businessName" value={form.businessName} onChange={onChange} placeholder="Your Firm / Company" />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm">GSTIN</label>
                <Input name="gstin" value={form.gstin} onChange={onChange} placeholder="12ABCDE3456F7Z8" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Contact Name *</label>
                <Input name="contactName" value={form.contactName} onChange={onChange} placeholder="Full Name" />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <label className="text-sm">Phone *</label>
                <Input name="phone" value={form.phone} onChange={onChange} placeholder="98765 43210" />
              </div>
              <div className="grid gap-2">
                <label className="text-sm">Email</label>
                <Input type="email" name="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Address</label>
              <Textarea name="address" value={form.address} onChange={onChange} placeholder="Street, City, Pincode" rows={3} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm">Message</label>
              <Textarea name="message" value={form.message} onChange={onChange} placeholder="Tell us about your wholesale needs" rows={4} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={submitting}>Cancel</Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground mt-3">Only approved wholesale accounts can access wholesale pricing and combos.</p>
    </div>
  );
}