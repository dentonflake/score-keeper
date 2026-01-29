"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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

const getTotals = (game: Game) => {
  const totals: Record<string, number> = {};
  game.players.forEach((player) => {
    totals[player.id] = 0;
  });
  game.rounds.forEach((round) => {
    round.entries.forEach((entry) => {
      totals[entry.playerId] = (totals[entry.playerId] ?? 0) + entry.delta;
    });
  });
  return totals;
};

const getWinners = (game: Game) => {
  const totals = getTotals(game);
  const maxScore = Math.max(...Object.values(totals), 0);
  return game.players.filter((player) => totals[player.id] === maxScore);
};

export default function HistoryPage() {
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

  const completedGames = useMemo(() => games.filter((game) => game.endedAt), [games]);

  const deleteGame = (gameId: string) => {
    setGames((prev) => prev.filter((game) => game.id !== gameId));
  };

  const openGame = (gameId: string) => {
    localStorage.setItem(ACTIVE_GAME_KEY, gameId);
    router.push("/");
  };

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }, [games, isLoaded]);

  return (
    <div className="min-h-screen">
      <header className="shadow-[0_1px_0_0_rgba(255,255,255,0.06)] bg-[var(--dark-900)]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-red)]">
              Score Keeper
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Win History</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-white shadow-md shadow-black/40 transition hover:bg-white/15"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-3xl  bg-[var(--dark-800)]/90 p-6 shadow-2xl shadow-black/50">
          {completedGames.length === 0 ? (
            <p className="text-sm text-[var(--text-200)]">No completed games yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {completedGames.map((game) => {
                const winners = getWinners(game);
                return (
                  <div
                    key={game.id}
                    className="rounded-2xl  bg-[var(--dark-900)]/80 px-4 py-4 text-sm shadow-md shadow-black/30"
                  >
                    <p className="font-semibold uppercase tracking-wide text-white">{game.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-200)]">
                      Ended {formatDate(game.endedAt!)}
                    </p>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent-red)]">
                      Winner{winners.length > 1 ? "s" : ""}: {winners.map((winner) => winner.name).join(", ")}
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        className="w-full rounded-full bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-black/40 transition hover:bg-white/20"
                        onClick={() => openGame(game.id)}
                      >
                        View game
                      </button>
                      <button
                        className="w-full rounded-full bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-200)] shadow-md shadow-black/30 transition hover:bg-white/10 hover:text-[var(--accent-red)]"
                        onClick={() => deleteGame(game.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
