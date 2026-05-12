"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

function getParticipantId() {
  const key = "mixd-participant-id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload as T;
}

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [musicKitReady, setMusicKitReady] = useState(false);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("로그인 필요");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const setupMusicKit = async () => {
      if (!window.MusicKit) {
        attempts += 1;
        if (attempts < 40) {
          window.setTimeout(setupMusicKit, 250);
          return;
        }

        if (!cancelled) {
          setStatus("로드 실패");
        }
        return;
      }

      try {
        const payload = await fetchJson<{ developerToken: string; appName: string }>(
          "/api/apple/developer-token"
        );
        const configured = await window.MusicKit.configure({
          developerToken: payload.developerToken,
          app: {
            name: payload.appName,
            build: "0.1.0"
          }
        });
        const instance = window.MusicKit.getInstance?.() || configured;

        if (!instance || typeof instance.authorize !== "function") {
          throw new Error("초기화 실패");
        }

        if (!cancelled) {
          setMusicKit(instance);
          setMusicKitReady(true);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "초기화 실패");
        }
      }
    };

    void setupMusicKit();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = async () => {
    if (!musicKitReady || !musicKit) {
      setStatus("로그인 불가");
      return;
    }

    if (!displayName.trim()) {
      setStatus("이름 입력");
      return;
    }

    setBusy(true);

    try {
      const token = await musicKit.authorize();

      if (!token && !musicKit.musicUserToken) {
        throw new Error("로그인 실패");
      }

      await fetchJson("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          participantId: getParticipantId(),
          displayName: displayName.trim()
        })
      });

      const redirect = searchParams.get("redirect") || "/";
      router.push(redirect);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "로그인 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="apple-page">
      <section className="login-card">
        <div className="login-copy">
          <p className="kicker">mixd</p>
          <h1>로그인</h1>
          <p className="subcopy">이름과 Apple Music 계정을 연결합니다.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>이름</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        </div>

        <div className="login-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={login}
            disabled={!musicKitReady || busy}
          >
            Apple Music 로그인
          </button>
        </div>

        <div className="status-line">{status}</div>
      </section>
    </main>
  );
}
