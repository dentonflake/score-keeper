"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

export default function NewGamePage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newPlayers, setNewPlayers] = useState<string[]>([""]);
  const [newGameError, setNewGameError] = useState("");
  const [scoringRule, setScoringRule] = useState<"high" | "low">("high");
  const playerInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const prevPlayerCount = useRef(newPlayers.length);

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

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(GAMES_KEY, JSON.stringify(games));
  }, [games, isLoaded]);

  useEffect(() => {
    if (newPlayers.length > prevPlayerCount.current) {
      const nextIndex = newPlayers.length - 1;
      requestAnimationFrame(() => {
        playerInputRefs.current[nextIndex]?.focus();
      });
    }
    prevPlayerCount.current = newPlayers.length;
  }, [newPlayers.length]);

  const addPlayerField = () => {
    setNewPlayers((prev) => [...prev, ""]);
  };

  const createGame = () => {
    const trimmedNames = newPlayers
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    const seen = new Set<string>();
    const duplicates = trimmedNames.filter((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });

    if (trimmedNames.length < 1) {
      setNewGameError("Add at least one player to start.");
      return;
    }
    if (duplicates.length > 0) {
      setNewGameError("Player names must be unique.");
      return;
    }

    const newGame: Game = {
      id: makeId(),
      name: newGameName.trim() || `Game ${games.length + 1}`,
      createdAt: new Date().toISOString(),
      endedAt: null,
      scoring: scoringRule,
      players: trimmedNames.map((name) => ({ id: makeId(), name })),
      rounds: [],
    };

    const nextGames = [newGame, ...games];
    setGames(nextGames);
    localStorage.setItem(GAMES_KEY, JSON.stringify(nextGames));
    localStorage.setItem(ACTIVE_GAME_KEY, newGame.id);
    router.push("/");
  };

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
                New Game
              </h1>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-6 py-10 animate-fade-in">
        <div className="rounded-lg  bg-[var(--dark-800)]/90 p-8 animate-fade-up">
          <h2 className="text-2xl font-semibold text-[var(--text-100)]">Start a New Game</h2>
          <p className="mt-2 text-sm text-[var(--text-200)]">
            Add players, give your game a name, and start tracking rounds.
          </p>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-200)]">
              Game name
              <input
                value={newGameName}
                onChange={(event) => setNewGameName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    playerInputRefs.current[0]?.focus();
                  }
                }}
                placeholder="Friday Night Showdown"
                className="h-11 w-full rounded-lg  bg-[var(--dark-900)] px-3 text-base text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/50"
              />
            </label>

            <div className="grid gap-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-200)]">
              Scoring rule
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={scoringRule === "high"}
                  className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    scoringRule === "high"
                      ? "bg-[var(--accent-red)] text-white"
                      : "bg-[var(--surface-1)] text-[var(--text-100)] hover:bg-[var(--surface-1-hover)]"
                  }`}
                  onClick={() => setScoringRule("high")}
                >
                  Highest score wins
                </button>
                <button
                  type="button"
                  aria-pressed={scoringRule === "low"}
                  className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                    scoringRule === "low"
                      ? "bg-[var(--accent-red)] text-white"
                      : "bg-[var(--surface-1)] text-[var(--text-100)] hover:bg-[var(--surface-1-hover)]"
                  }`}
                  onClick={() => setScoringRule("low")}
                >
                  Lowest score wins
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold uppercase tracking-wide text-[var(--text-200)]">Players</p>
              {newPlayers.map((player, index) => (
                <div
                  key={`player-${index}`}
                  className="flex gap-2 animate-fade-up"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <input
                    ref={(element) => {
                      playerInputRefs.current[index] = element;
                    }}
                    value={player}
                    onChange={(event) =>
                      setNewPlayers((prev) =>
                        prev.map((value, innerIndex) =>
                          innerIndex === index ? event.target.value : value
                        )
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (index === newPlayers.length - 1) {
                          addPlayerField();
                        }
                      }
                    }}
                    placeholder={`Player ${index + 1}`}
                    className="h-11 w-full rounded-lg  bg-[var(--dark-900)] px-3 text-base text-[var(--text-100)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-red)]/50"
                  />
                  {newPlayers.length > 1 && (
                    <button
                      className="h-11 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-200)]"
                      onClick={() => setNewPlayers((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                className="w-fit rounded-md bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                onClick={addPlayerField}
              >
                Add player
              </button>
              {newGameError && (
                <p className="text-sm font-semibold text-[var(--accent-red)]">{newGameError}</p>
              )}
            </div>

            <button
              className="mt-2 w-full rounded-md  bg-[var(--accent-red)] py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)]"
              onClick={createGame}
            >
              Start game
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
