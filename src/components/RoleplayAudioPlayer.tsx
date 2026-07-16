import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getRoleplaySession,
  getRoleplayAudioSignedUrl,
} from "@/lib/roleplay-sessions.functions";

type Props = {
  sessionId: string | null;
  compact?: boolean;
};

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

/**
 * Native product-branded audio player for trainer review.
 * No vendor branding, no conversation IDs surfaced. Polls the session row
 * until audio_status is `ready` or `failed`, then loads a short-lived signed URL.
 */
export function RoleplayAudioPlayer({ sessionId, compact }: Props) {
  const [status, setStatus] = useState<"pending" | "ready" | "failed" | "missing">(
    sessionId ? "pending" : "missing",
  );
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fetchSession = useServerFn(getRoleplaySession);
  const fetchSignedUrl = useServerFn(getRoleplayAudioSignedUrl);

  // Poll session row until audio_status resolves.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const row = await fetchSession({ data: { sessionId } });
        if (cancelled || !row) return;
        if (row.audio_status === "ready") {
          const signed = await fetchSignedUrl({ data: { sessionId } });
          if (cancelled) return;
          setUrl(signed.url);
          setStatus(signed.url ? "ready" : "failed");
          return;
        }
        if (row.audio_status === "failed") {
          setStatus("failed");
          return;
        }
        if (attempts < 20) {
          window.setTimeout(tick, 3_000);
        } else {
          setStatus("failed");
        }
      } catch {
        setStatus("failed");
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [sessionId, fetchSession, fetchSignedUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, url]);

  const progressPct = useMemo(
    () => (duration > 0 ? (current / duration) * 100 : 0),
    [current, duration],
  );

  if (status === "missing") return null;

  if (status === "pending") {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
        Preparing recording for trainer review…
      </div>
    );
  }

  if (status === "failed" || !url) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
        Audio recording could not be retrieved. Voice-based communication analysis
        is unavailable for this attempt.
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
