"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending) {
      const role = (session as any)?.user?.role;
      if (!session?.user || role !== "admin") {
        router.push("/login?redirect=/admin");
      }
    }
  }, [isPending, session, router]);

  if (isPending || !session?.user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/admin/orders"><Button variant="outline">Manage Orders</Button></Link>
          <Link href="/admin/products"><Button className="bg-orange-500 hover:bg-orange-600">Manage Products</Button></Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Today's Orders</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">—</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue (Est.)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">—</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Low Stock</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">—</CardContent>
        </Card>
      </div>
    </div>
  );
}