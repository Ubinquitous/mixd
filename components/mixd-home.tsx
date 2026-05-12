import Link from "next/link";
import type { MixdRecord } from "@/lib/mixd-store";
import type { MixdSession } from "@/lib/session";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function MixdHome({
  mixds,
  session
}: {
  mixds: MixdRecord[];
  session: MixdSession;
}) {
  return (
    <main className="apple-page">
      <section className="login-card">
        <div className="login-copy">
          <p className="kicker">mixd</p>
          <h1>내 믹스</h1>
          <p className="subcopy">{session.displayName}</p>
        </div>
        <div className="login-actions">
          <Link className="button button-primary" href="/create">
            생성하기
          </Link>
          <form action="/login" method="get">
            <input name="logout" type="hidden" value="1" />
            <button className="button button-secondary" type="submit">
              로그아웃
            </button>
          </form>
        </div>
      </section>

      <section className="tracks-card">
        <div className="section-head">
          <h2>목록</h2>
          <span>{mixds.length}</span>
        </div>

        <div className="mix-grid">
          {mixds.map((mixd) => (
            <article className="mix-card" key={mixd.id}>
              <div className="mix-card-head">
                <strong>{mixd.name}</strong>
                <span>{formatDate(mixd.createdAt)}</span>
              </div>
              <div className="mix-preview-grid">
                {mixd.previewTracks.map((track) => (
                  <div className="mix-preview-cell" key={track.id}>
                    {track.artworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={track.name} className="mix-artwork" src={track.artworkUrl} />
                    ) : (
                      <div className="mix-artwork mix-artwork-fallback" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mix-copy">
                <h3>{mixd.ownerName}</h3>
                <p>{mixd.participantCount}명 참여</p>
              </div>
              <div className="mix-link-row">
                <Link className="text-link" href={`/invite/${mixd.inviteCode}`}>
                  초대 링크
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
