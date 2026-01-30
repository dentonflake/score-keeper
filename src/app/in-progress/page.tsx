"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ThemeToggle from "@/components/theme-toggle";

type Player = {
  id: string;
  name: string;
};

type RoundEntry = {
  playerId: string;
  delta: number;
};

type Round = {
  id: string;
  createdAt: string;
  entries: RoundEntry[];
};

type Game = {
  id: string;
  name: string;
  createdAt: string;
  endedAt: string | null;
  scoring: "high" | "low";
  players: Player[];
  rounds: Round[];
};

const GAMES_KEY = "score-keeper.games";
const ACTIVE_GAME_KEY = "score-keeper.activeGameId";

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

export default function InProgressPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedGames = localStorage.getItem(GAMES_KEY);
      if (storedGames) {
        setGames(JSON.parse(storedGames));
      }
    } catch (error) {
      console.error("Failed to load games", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const inProgressGames = useMemo(() => games.filter((game) => !game.endedAt), [games]);

  const deleteGame = (gameId: string) => {
    setGames((prev) => prev.filter((game) => game.id !== gameId));
    const activeId = localStorage.getItem(ACTIVE_GAME_KEY);
    if (activeId === gameId) {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  };

  const resumeGame = (gameId: string) => {
    localStorage.setItem(ACTIVE_GAME_KEY, gameId);
    router.push("/");
  };

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }, [games, isLoaded]);

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--dark-900)]/80 backdrop-blur animate-fade-in">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <Link
            href="/"
            className="group"
            onClick={() => localStorage.removeItem(ACTIVE_GAME_KEY)}
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-red)] transition group-hover:text-[var(--accent-red-dark)]">
                Score Keeper
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-100)] transition group-hover:text-[var(--accent-red-dark)]">
                In Progress
              </h1>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10 animate-fade-in">
        <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-6 animate-fade-up">
          {inProgressGames.length === 0 ? (
            <p className="text-sm text-[var(--text-200)]">No active games yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inProgressGames.map((game, index) => (
                <div
                  key={game.id}
                  className="rounded-lg card-inset bg-[var(--dark-900)]/80 px-4 py-4 text-sm animate-fade-up"
                  style={{ animationDelay: `${index * 70}ms` }}
                >
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-100)]">
                    {game.name}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-200)]">
                    Started {formatDate(game.createdAt)}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      className="btn inline-flex w-full items-center justify-center rounded-md bg-[var(--surface-1)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                      onClick={() => resumeGame(game.id)}
                    >
                      Resume
                    </button>
                    <button
                      className="btn inline-flex w-full items-center justify-center rounded-md bg-[var(--surface-2)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-200)] transition hover:bg-[var(--surface-2-hover)] hover:text-[var(--accent-red)]"
                      onClick={() => deleteGame(game.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
