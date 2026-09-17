import assert from "node:assert/strict";
import test from "node:test";
import { calculateMixdResult } from "../lib/mixd-analysis.ts";

function track(id, artistName) {
  return {
    id,
    type: "songs",
    name: id,
    artistName,
    albumName: "album",
    artworkUrl: "",
    durationInMillis: 180000
  };
}

function participant(participantId, displayName, tracks) {
  return {
    participantId,
    displayName,
    role: participantId === "a" ? "owner" : "guest",
    joinedAt: "2026-01-01T00:00:00.000Z",
    syncedAt: "2026-01-01T00:00:00.000Z",
    trackCount: tracks.length,
    tracks
  };
}

test("한 명뿐이면 결과를 대기 상태로 반환한다", () => {
  const result = calculateMixdResult([participant("a", "A", [track("one", "Artist")])]);
  assert.equal(result.status, "waiting");
  assert.equal(result.compatibilityPercentage, null);
  assert.deepEqual(result.playlist, []);
});

test("곡과 아티스트 겹침을 계산하고 공통곡을 플레이리스트 첫 곡으로 둔다", () => {
  const result = calculateMixdResult([
    participant("a", "A", [track("shared", "Shared Artist"), track("a-only", "A Artist")]),
    participant("b", "B", [track("shared", "Shared Artist"), track("b-only", "B Artist")])
  ]);
  assert.equal(result.status, "ready");
  assert.equal(result.compatibilityPercentage, 50);
  assert.equal(result.sharedTrackCount, 1);
  assert.equal(result.sharedTracks[0].id, "shared");
  assert.deepEqual(result.sharedTracks[0].sharedBy, ["A", "B"]);
  assert.equal(result.playlist[0].id, "shared");
});

test("중복 재생은 한 곡으로 처리하고 결과 플레이리스트를 50곡으로 제한한다", () => {
  const manyTracks = Array.from({ length: 60 }, (_, index) => track(`song-${index}`, `artist-${index}`));
  const result = calculateMixdResult([
    participant("a", "A", [manyTracks[0], manyTracks[0], ...manyTracks.slice(1)]),
    participant("b", "B", manyTracks)
  ]);
  assert.equal(result.compatibilityPercentage, 100);
  assert.equal(result.sharedTrackCount, 60);
  assert.equal(result.playlist.length, 50);
});
