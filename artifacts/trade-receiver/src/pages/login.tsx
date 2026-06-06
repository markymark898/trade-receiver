import { useState, FormEvent } from "react";
import { Terminal, Lock, Loader2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json() as { ok: boolean; error?: string };

      if (data.ok) {
        sessionStorage.setItem("trdr_authed", "1");
        onLogin();
      } else {
        setError(data.error ?? "Incorrect password.");
      }
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo / brand */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">TRD_REQ_RCVR</h1>
          <p className="text-sm text-muted-foreground">Trading signal dashboard</p>
        </div>

        {/* Login card */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-8 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Sign in</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
                required
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-semibold font-mono hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 font-mono">
          Session ends when you close the browser tab.
        </p>
      </div>
    </div>
  );
}
