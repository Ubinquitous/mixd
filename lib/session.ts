import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SESSION_COOKIE = "mixd-session";
const DEVICE_COOKIE = "mixd-device";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;
const DEVICE_DURATION_SECONDS = 60 * 60 * 24 * 365;

export type MixdSession = {
  participantId: string;
  displayName: string;
};

function getSessionSecret() {
  const secret = process.env.MIXD_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "mixd-local-development-only-secret";
  throw new Error("Missing MIXD_SESSION_SECRET.");
}

function decodeSession(value: string): MixdSession | null {
  try {
    const payload = jwt.verify(value, getSessionSecret(), { algorithms: ["HS256"] });
    if (typeof payload === "string") return null;
    if (typeof payload.participantId !== "string" || typeof payload.displayName !== "string") {
      return null;
    }
    return { participantId: payload.participantId, displayName: payload.displayName };
  } catch {
    return null;
  }
}

function decodeDevice(value: string) {
  try {
    const payload = jwt.verify(value, getSessionSecret(), { algorithms: ["HS256"] });
    return typeof payload !== "string" && typeof payload.participantId === "string"
      ? payload.participantId
      : null;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

export async function setSession(input: { displayName: string; participantId?: string }) {
  const store = await cookies();
  const current = store.get(SESSION_COOKIE)?.value;
  const existing = current ? decodeSession(current) : null;
  const rawDevice = store.get(DEVICE_COOKIE)?.value;
  const deviceParticipantId = rawDevice ? decodeDevice(rawDevice) : null;
  const session: MixdSession = {
    participantId:
      input.participantId || existing?.participantId || deviceParticipantId || crypto.randomUUID(),
    displayName: input.displayName
  };
  const value = jwt.sign(session, getSessionSecret(), {
    algorithm: "HS256",
    expiresIn: SESSION_DURATION_SECONDS
  });
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS
  });
  store.set(
    DEVICE_COOKIE,
    jwt.sign({ participantId: session.participantId }, getSessionSecret(), {
      algorithm: "HS256",
      expiresIn: DEVICE_DURATION_SECONDS
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEVICE_DURATION_SECONDS
    }
  );
  return session;
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
