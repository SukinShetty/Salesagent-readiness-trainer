import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getRoleplaySession,
  getRoleplayAudioSignedUrl,
} from "@/lib/roleplay-sessions.functions";
import { retrieveRoleplayAudio } from "@/lib/roleplay-audio.functions";

type Props = {
  sessionId: string | null;
  compact?: boolean;
};

type Phase = "pending" | "processing" | "ready" | "failed" | "unavailable" | "missing";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
const IS_DEV = import.meta.env.DEV;

/**
 * Native product-branded audio player for trainer review.
 * Polls the session row until audio_status is `ready`, `failed`, or
 * `unavailable`. When the recording is still being prepared, offers a
 * "Check Recording Status" button that re-triggers the secure retrieval
 * server function.
 */
export function RoleplayAudioPlayer({ sessionId, compact }: Props) {
  const [phase, setPhase] = useState<Phase>(sessionId ? "pending" : "missing");
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [checking, setChecking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fetchSession = useServerFn(getRoleplaySession);
  const fetchSignedUrl = useServerFn(getRoleplayAudioSignedUrl);
  const retrieveAudio = useServerFn(retrieveRoleplayAudio);
  const kickedRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  const poll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const row = await fetchSession({ data: { sessionId } });
      if (!row) return;
      if (IS_DEV)
        console.log(
          `[Player] session=${sessionId} audio_status=${row.audio_status} conv=${row.conversation_id ?? "-"}`,
        );
      if (row.audio_status === "ready") {
        const signed = await fetchSignedUrl({ data: { sessionId } });
        setUrl(signed.url);
        setPhase(signed.url ? "ready" : "failed");
        return;
      }
      if (row.audio_status === "failed") {
        setPhase("failed");
        return;
      }
      if (row.audio_status === "unavailable") {
        setPhase("unavailable");
        return;
      }
      // pending / processing — auto-kick once if not started, else keep polling
      if (!kickedRef.current && row.conversation_id) {
        kickedRef.current = true;
        if (IS_DEV) console.log(`[Player] kicking retrieveAudio for session=${sessionId}`);
        void retrieveAudio({ data: { sessionId } }).catch((e) =>
          IS_DEV && console.warn("[Player] retrieve threw", e),
        );
      }
      setPhase(row.audio_status === "processing" ? "processing" : "pending");
      pollTimerRef.current = window.setTimeout(poll, 5_000);
    } catch (e) {
      if (IS_DEV) console.warn("[Player] poll error", e);
      setPhase("failed");
    }
  }, [sessionId, fetchSession, fetchSignedUrl, retrieveAudio]);

  useEffect(() => {
    if (!sessionId) return;
    kickedRef.current = false;
    void poll();
    return () => {
      if (pollTimerRef.current !== null) window.clearTimeout(pollTimerRef.current);
    };
  }, [sessionId, poll]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, url]);

  const progressPct = useMemo(
    () => (duration > 0 ? (current / duration) * 100 : 0),
    [current, duration],
  );

  const checkStatus = useCallback(async () => {
    if (!sessionId || checking) return;
    setChecking(true);
    try {
      if (IS_DEV) console.log(`[Player] manual re-check for session=${sessionId}`);
      await retrieveAudio({ data: { sessionId } }).catch(() => {});
      await poll();
    } finally {
      setChecking(false);
    }
  }, [sessionId, checking, retrieveAudio, poll]);

  if (phase === "missing") return null;

  if (phase === "pending" || phase === "processing") {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
        <div>Roleplay recording is being prepared. Please check again shortly.</div>
        <button
          type="button"
          onClick={checkStatus}
          disabled={checking}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check Recording Status"}
        </button>
      </div>
    );
  }

  if (phase === "failed" || phase === "unavailable" || !url) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
        <div>
          Roleplay recording is unavailable for this attempt. Transcript-based
          evaluation remains available.
        </div>
        <button
          type="button"
          onClick={checkStatus}
          disabled={checking}
          className="mt-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
        >
          {checking ? "Checking…" : "Check Recording Status"}
        </button>
      </div>
    );
  }

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = (Number(e.target.value) / 100) * duration;
    a.currentTime = t;
    setCurrent(t);
  };

  return (
    <div
      className={`rounded-xl border border-border bg-surface ${
        compact ? "p-3" : "p-5"
      } shadow-card`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card hover:opacity-90"
          aria-label={playing ? "Pause recording" : "Play recording"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progressPct}
            onChange={seek}
            className="w-full accent-[var(--primary)]"
            aria-label="Seek"
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formatTime(current)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5 text-xs">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`rounded px-2 py-1 ${
                speed === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={(e) => setCurrent((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onEnded={() => setPlaying(false)}
        preload="metadata"
        className="hidden"
      />
    </div>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}
