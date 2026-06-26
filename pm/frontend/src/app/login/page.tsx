"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { LoginForm } from "@/components/LoginForm";
import { login, register, isAuthenticated } from "@/lib/auth";

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

  const handleRegister = async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);
    const result = await register(username, password);
    setIsLoading(false);
    if (result.success) {
      router.replace("/");
    } else {
      setError(result.error ?? "Registration failed");
    }
  };

  return (
    <LoginForm onLogin={handleLogin} onRegister={handleRegister} error={error} isLoading={isLoading} />
  );
}
