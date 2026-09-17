import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SavePlaylistButton } from "@/components/save-playlist-button";
import { calculateMixdResult, type MixdResultTrack } from "@/lib/mixd-analysis";
import { getMixdByInviteCode } from "@/lib/mixd-store";
import { getSession } from "@/lib/session";

function TrackRow({ track, index }: { track: MixdResultTrack; index: number }) {
  return (
    <li className="result-track">
      <span className="track-index">{index + 1}</span>
      {track.artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="track-artwork" src={track.artworkUrl} alt="" />
      ) : <div className="track-artwork mix-artwork-fallback" />}
      <div className="track-copy">
        <strong>{track.name}</strong>
        <span>{track.artistName} · {track.albumName}</span>
      </div>
      <span className="shared-by">{track.sharedBy.join(", ")}</span>
    </li>
  );
}

export default async function MixdResultPage({
  params
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const [session, mixd] = await Promise.all([getSession(), getMixdByInviteCode(inviteCode)]);
  if (!mixd) notFound();
  if (!session) redirect(`/login?redirect=${encodeURIComponent(`/mixd/${inviteCode}`)}`);
  const isParticipant = mixd.participants.some(
    (participant) => participant.participantId === session.participantId
  );
  if (!isParticipant) redirect(`/invite/${inviteCode}`);
  const result = calculateMixdResult(mixd.participants);

  return (
    <main className="apple-page">
      <section className="login-card result-hero">
        <div className="login-copy">
          <p className="kicker">mixd result</p>
          <h1>{mixd.name}</h1>
          <p className="subcopy">{mixd.participants.map((participant) => participant.displayName).join(" · ")}</p>
        </div>
        <div className="login-actions">
          <Link className="button button-secondary" href="/">내 믹스</Link>
          <Link className="button button-secondary" href={`/invite/${inviteCode}`}>초대 링크</Link>
        </div>
      </section>

      {result.status === "waiting" ? (
        <section className="waiting-card">
          <p className="score-label">친구를 기다리는 중</p>
          <h2>초대 링크를 보내면 결과가 완성돼요.</h2>
          <p>친구가 Apple Music을 연결하면 취향 일치도, 같이 들은 곡, 믹스 플레이리스트가 나타납니다.</p>
        </section>
      ) : (
        <>
          <section className="score-grid">
            <div className="score-card score-main">
              <span className="score-label">취향 일치도</span>
              <strong>{result.compatibilityPercentage}%</strong>
            </div>
            <div className="score-card">
              <span className="score-label">함께 들은 곡</span>
              <strong>{result.sharedTrackCount}</strong>
            </div>
            <div className="score-card">
              <span className="score-label">참여자</span>
              <strong>{result.participantCount}</strong>
            </div>
          </section>

          <section className="result-section">
            <div className="section-head">
              <h2>Mixd 플레이리스트</h2>
              <span>{result.playlist.length}곡</span>
            </div>
            <SavePlaylistButton inviteCode={inviteCode} />
            <ol className="result-list">
              {result.playlist.map((track, index) => <TrackRow key={track.id} track={track} index={index} />)}
            </ol>
          </section>

          <section className="result-section">
            <div className="section-head">
              <h2>같이 들은 음악</h2>
              <span>{result.sharedTracks.length}곡</span>
            </div>
            {result.sharedTracks.length > 0 ? (
              <ol className="result-list">
                {result.sharedTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} />)}
              </ol>
            ) : <p className="empty-copy">최근 재생곡 중 정확히 겹치는 곡은 아직 없어요.</p>}
          </section>
        </>
      )}
    </main>
  );
}
