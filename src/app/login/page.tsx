import { Suspense } from "react";
import { AuthForm } from "@/features/auth/components/auth-form";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <Suspense fallback={<Loader2 className="size-6 animate-spin text-accent" />}>
        <AuthForm />
      </Suspense>
    </div>
  );
}
