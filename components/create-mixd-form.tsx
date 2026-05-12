"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

export function CreateMixdForm() {
  const router = useRouter();
  const [musicKitReady, setMusicKitReady] = useState(false);
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);
  const [musicUserToken, setMusicUserToken] = useState("");
  const [mixdName, setMixdName] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [status, setStatus] = useState("로그인 필요");
  const [busy, setBusy] = useState(false);
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    void fetchJson<{ session: { displayName?: string } | null }>("/api/session").then(
      (payload) => {
        if (payload.session?.displayName) {
          setOwnerName(payload.session.displayName);
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

  const authorize = async () => {
    if (!musicKit) {
      setStatus("로그인 불가");
      return;
    }

    setBusy(true);
    try {
      const token = await musicKit.authorize();
      setMusicUserToken(token || "");
      setStatus(token ? "로그인 완료" : "취소됨");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "로그인 실패");
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!musicUserToken && !musicKit?.musicUserToken) {
      setStatus("로그인 필요");
      return;
    }

    if (!ownerName.trim() || !mixdName.trim()) {
      setStatus("이름 입력");
      return;
    }

    setBusy(true);
    try {
      const participantId = getParticipantId();
      const payload = await fetchJson<{ mixd: { inviteCode: string } }>("/api/mixd", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ownerName: ownerName.trim(),
          name: mixdName.trim(),
          musicUserToken: musicUserToken || musicKit?.musicUserToken,
          participantId
        })
      });

      const url = `${window.location.origin}/invite/${payload.mixd.inviteCode}`;
      setInviteUrl(url);
      setStatus("생성 완료");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "생성 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="apple-page">
      <section className="login-card">
        <div className="login-copy">
          <p className="kicker">mixd</p>
          <h1>새 믹스</h1>
          <p className="subcopy">이름을 만들고 링크를 공유합니다.</p>
        </div>

        <div className="form-grid">
          <label className="field">
            <span>블렌드 이름</span>
            <input value={mixdName} onChange={(e) => setMixdName(e.target.value)} />
          </label>
        </div>

        <div className="login-actions">
          <Link className="button button-secondary" href="/">
            돌아가기
          </Link>
          <button
            className="button button-secondary"
            type="button"
            onClick={authorize}
            disabled={!musicKitReady || busy}
          >
            Apple Music 로그인
          </button>
          <button className="button button-primary" type="button" onClick={create} disabled={busy}>
            생성하기
          </button>
        </div>

        <div className="status-line">{status}</div>

        {inviteUrl ? (
          <div className="invite-box">
            <strong>초대 링크</strong>
            <p>{inviteUrl}</p>
            <div className="invite-actions">
              <Link className="button button-primary" href="/">
                홈으로
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
