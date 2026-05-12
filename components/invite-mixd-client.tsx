"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function getParticipantId() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem("mixd-participant-id");
  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem("mixd-participant-id", created);
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

export function InviteMixdClient({
  inviteCode,
  ownerName,
  mixdName
}: {
  inviteCode: string;
  ownerName: string;
  mixdName: string;
}) {
  const router = useRouter();
  const [musicKitReady, setMusicKitReady] = useState(false);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [status, setStatus] = useState("로그인 필요");
  const [joined, setJoined] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchJson<{ session: { displayName?: string } | null }>("/api/session").then(
      (payload) => {
        if (payload.session?.displayName) {
          setSessionName(payload.session.displayName);
          setStatus("참여 가능");
        }
      }
    );
  }, []);

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

  const join = async () => {
    if (!sessionName) {
      router.push(`/login?redirect=/invite/${inviteCode}`);
      return;
    }

    if (!musicKit) {
      setStatus("참여 불가");
      return;
    }

    setBusy(true);
    try {
      const participantId = getParticipantId();
      const token = await musicKit.authorize();
      const resolvedToken = token || musicKit.musicUserToken || "";

      if (!resolvedToken) {
        throw new Error("로그인 실패");
      }

      await fetchJson(`/api/mixd/${inviteCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          musicUserToken: resolvedToken,
          participantId,
          displayName: sessionName
        })
      });

      setJoined(true);
      setStatus("참여 완료");
      router.push("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "참여 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="apple-page">
      <section className="login-card">
        <div className="login-copy">
          <p className="kicker">mixd</p>
          <h1>{mixdName}</h1>
          <p className="subcopy">{ownerName}님과 당신의 음악 취향을 확인해보세요.</p>
        </div>

        <div className="login-actions">
          <button
            className="button button-primary"
            type="button"
            onClick={join}
            disabled={!musicKitReady || busy || joined}
          >
            {sessionName ? "참여하기" : "로그인"}
          </button>
          <Link className="button button-secondary" href="/">
            홈으로
          </Link>
        </div>

        <div className="status-line">{status}</div>
      </section>
    </main>
  );
}
