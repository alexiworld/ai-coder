"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getMe } from "@/lib/auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const authed = isAuthenticated();
      if (!authed) {
        router.replace("/login");
        return;
      }

      const valid = await getMe();
      if (!valid) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    };

    check();
  }, [router]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface)]">
        <p className="text-sm text-[var(--gray-text)]">Loading...</p>
      </div>
    );
  }

  return <>{children}</>;
};
