"use client";

import { useState } from "react";

function getApiErrorMessage(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const error = (value as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return null;
  const message = (error as Record<string, unknown>).message;
  return typeof message === "string" ? message : null;
}

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const json: unknown = await res.json().catch(() => null);
        setError(getApiErrorMessage(json) ?? "No autorizado");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-md px-5 py-12">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-7">
        <h1 className="text-2xl font-bold tracking-tight text-white">Admin</h1>
        <div className="mt-1 text-sm text-zinc-400">
          Ingresá la clave de administración.
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <label className="text-xs font-semibold text-zinc-300">Clave</label>
          <input
            type="password"
            className="mt-1 h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-white/20"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </div>
    </main>
  );
}
