"use client";

import { useEffect, useState } from "react";

async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || "요청에 실패했습니다.");
  return payload as T;
}

export function SavePlaylistButton({ inviteCode }: { inviteCode: string }) {
  const [musicKit, setMusicKit] = useState<MusicKitInstance | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const setup = async () => {
      if (!window.MusicKit) {
        attempts += 1;
        if (attempts < 40) window.setTimeout(setup, 250);
        else if (!cancelled) setStatus("MusicKit을 불러오지 못했습니다.");
        return;
      }
      try {
        const payload = await fetchJson<{ developerToken: string; appName: string }>(
          "/api/apple/developer-token"
        );
        const configured = await window.MusicKit.configure({
          developerToken: payload.developerToken,
          app: { name: payload.appName, build: "0.1.0" }
        });
        if (!cancelled) setMusicKit(window.MusicKit.getInstance?.() || configured);
      } catch (error) {
        if (!cancelled) setStatus(error instanceof Error ? error.message : "MusicKit 초기화 실패");
      }
    };
    void setup();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    if (!musicKit) return;
    setBusy(true);
    setStatus("");
    try {
      const token = await musicKit.authorize();
      const musicUserToken = token || musicKit.musicUserToken || "";
      if (!musicUserToken) throw new Error("Apple Music 로그인이 필요합니다.");
      await fetchJson(`/api/mixd/${inviteCode}/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ musicUserToken })
      });
      setStatus("Apple Music 보관함에 저장했습니다.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="save-playlist">
      <button className="button button-primary" type="button" onClick={save} disabled={!musicKit || busy}>
        {busy ? "저장 중…" : "Apple Music에 저장"}
      </button>
      {status ? <span className="status-inline" role="status">{status}</span> : null}
    </div>
  );
}
