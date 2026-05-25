"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { login, isAuthenticated } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error ?? "Login failed");
    }
  };

  return (
    <LoginForm onLogin={handleLogin} error={error} isLoading={isLoading} />
  );
}
