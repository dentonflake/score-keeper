"use client";

import Link from "next/link";
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

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getTotals = (game: Game | null) => {
  if (!game) return {} as Record<string, number>;
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
  if (!game.endedAt) return [] as Player[];
  const totals = getTotals(game);
  const scoreValues = Object.values(totals);
  if (scoreValues.length === 0) return [] as Player[];
  const scoring = game.scoring ?? "high";
  const targetScore =
    scoring === "low" ? Math.min(...scoreValues) : Math.max(...scoreValues);
  return game.players.filter((player) => totals[player.id] === targetScore);
};

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const [playerToAdd, setPlayerToAdd] = useState("");
  const [roundDeltas, setRoundDeltas] = useState<Record<string, string>>({});
  const [roundSigns, setRoundSigns] = useState<Record<string, 1 | -1>>({});
  const [roundError, setRoundError] = useState("");
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [editEntries, setEditEntries] = useState<Record<string, string>>({});
  const [editSigns, setEditSigns] = useState<Record<string, 1 | -1>>({});

  useEffect(() => {
    try {
      const storedGames = localStorage.getItem(GAMES_KEY);
      const storedActive = localStorage.getItem(ACTIVE_GAME_KEY);
      if (storedGames) {
        setGames(JSON.parse(storedGames));
      }
      if (storedActive) {
        setActiveGameId(storedActive);
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
    if (activeGameId) {
      localStorage.setItem(ACTIVE_GAME_KEY, activeGameId);
    } else {
      localStorage.removeItem(ACTIVE_GAME_KEY);
    }
  }, [games, activeGameId, isLoaded]);

  const activeGame = useMemo(() => {
    const found = games.find((game) => game.id === activeGameId) ?? null;
    if (!found) return null;
    return {
      ...found,
      scoring: found.scoring ?? "high",
    };
  }, [games, activeGameId]);

  const totals = useMemo(() => getTotals(activeGame), [activeGame]);

  const sortedPlayers = useMemo(() => {
    if (!activeGame) return [];
    return [...activeGame.players].sort((a, b) => {
      const aTotal = totals[a.id] ?? 0;
      const bTotal = totals[b.id] ?? 0;
      return activeGame.scoring === "low" ? aTotal - bTotal : bTotal - aTotal;
    });
  }, [activeGame, totals]);

  useEffect(() => {
    if (!activeGame) {
      setRoundDeltas({});
      setRoundSigns({});
      return;
    }
    const next: Record<string, string> = {};
    const nextSigns: Record<string, 1 | -1> = {};
    activeGame.players.forEach((player) => {
      next[player.id] = "";
      nextSigns[player.id] = 1;
    });
    setRoundDeltas(next);
    setRoundSigns(nextSigns);
  }, [activeGame?.id, activeGame?.players.length]);

  const updateGame = (gameId: string, updater: (game: Game) => Game) => {
    setGames((prev) => prev.map((game) => (game.id === gameId ? updater(game) : game)));
  };

  const addPlayerToGame = () => {
    if (!activeGame || activeGame.endedAt) return;
    const trimmed = playerToAdd.trim();
    if (!trimmed) return;
    if (activeGame.players.some((player) => player.name.toLowerCase() === trimmed.toLowerCase())) {
      setRoundError("Player already exists.");
      return;
    }
    updateGame(activeGame.id, (game) => ({
      ...game,
      players: [...game.players, { id: makeId(), name: trimmed }],
    }));
    setPlayerToAdd("");
    setRoundError("");
  };

  const addRound = () => {
    if (!activeGame || activeGame.endedAt) return;
    const entries = activeGame.players
      .map((player) => ({
        playerId: player.id,
        delta:
          (roundSigns[player.id] ?? 1) *
          Number(roundDeltas[player.id] ? Math.abs(Number(roundDeltas[player.id])) : 0),
      }))
      .filter((entry) => !Number.isNaN(entry.delta) && entry.delta !== 0);

    if (entries.length === 0) {
      setRoundError("Add at least one non-zero score change.");
      return;
    }

    const newRound: Round = {
      id: makeId(),
      createdAt: new Date().toISOString(),
      entries,
    };

    updateGame(activeGame.id, (game) => ({
      ...game,
      rounds: [...game.rounds, newRound],
    }));

    setRoundDeltas((prev) => {
      const next: Record<string, string> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = "";
      });
      return next;
    });
    setRoundSigns((prev) => {
      const next: Record<string, 1 | -1> = {};
      Object.keys(prev).forEach((key) => {
        next[key] = 1;
      });
      return next;
    });
    setRoundError("");
  };

  const startEditRound = (round: Round) => {
    if (!activeGame || activeGame.endedAt) return;
    const next: Record<string, string> = {};
    const nextSigns: Record<string, 1 | -1> = {};
    activeGame.players.forEach((player) => {
      const entry = round.entries.find((item) => item.playerId === player.id);
      next[player.id] = entry ? String(Math.abs(entry.delta)) : "";
      nextSigns[player.id] = entry && entry.delta < 0 ? -1 : 1;
    });
    setEditingRoundId(round.id);
    setEditEntries(next);
    setEditSigns(nextSigns);
  };

  const saveEditRound = () => {
    if (!activeGame || activeGame.endedAt || !editingRoundId) return;
    const updatedEntries = activeGame.players
      .map((player) => ({
        playerId: player.id,
        delta:
          (editSigns[player.id] ?? 1) *
          Number(editEntries[player.id] ? Math.abs(Number(editEntries[player.id])) : 0),
      }))
      .filter((entry) => !Number.isNaN(entry.delta) && entry.delta !== 0);

    updateGame(activeGame.id, (game) => ({
      ...game,
      rounds: game.rounds.map((round) =>
        round.id === editingRoundId ? { ...round, entries: updatedEntries } : round
      ),
    }));

    setEditingRoundId(null);
    setEditEntries({});
    setEditSigns({});
  };

  const deleteRound = (roundId: string) => {
    if (!activeGame || activeGame.endedAt) return;
    updateGame(activeGame.id, (game) => ({
      ...game,
      rounds: game.rounds.filter((round) => round.id !== roundId),
    }));
    setEditingRoundId(null);
    setEditEntries({});
    setEditSigns({});
  };

  const deleteGame = (gameId: string) => {
    setGames((prev) => prev.filter((game) => game.id !== gameId));
    setEditingRoundId(null);
    setEditEntries({});
    if (activeGameId === gameId) {
      setActiveGameId(null);
    }
  };

  const endGame = () => {
    if (!activeGame) return;
    updateGame(activeGame.id, (game) => ({
      ...game,
      endedAt: new Date().toISOString(),
    }));
    setEditingRoundId(null);
    setEditEntries({});
    setEditSigns({});
  };

  const playAgain = () => {
    if (!activeGame) return;
    const newGame: Game = {
      id: makeId(),
      name: activeGame.name,
      createdAt: new Date().toISOString(),
      endedAt: null,
      scoring: activeGame.scoring,
      players: activeGame.players.map((player) => ({
        id: makeId(),
        name: player.name,
      })),
      rounds: [],
    };
    setGames((prev) => [...prev, newGame]);
    setActiveGameId(newGame.id);
  };

  const goHome = () => {
    setActiveGameId(null);
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--dark-900)] text-xl font-semibold text-[var(--text-100)]">
        Loading score keeper...
      </div>
    );
  }

  const completedGames = games.filter((game) => game.endedAt);
  const inProgressGames = games.filter((game) => !game.endedAt);
  const recentCompleted = completedGames.slice(0, 2);
  const recentInProgress = inProgressGames.slice(0, 2);

  return (
    <div className="min-h-screen">
      <header className="bg-[var(--dark-900)]/80 backdrop-blur animate-fade-in">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-6">
          <Link href="/" className="group" onClick={goHome}>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-red)] transition group-hover:text-[var(--accent-red-dark)]">
                Score Keeper
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-100)] transition group-hover:text-[var(--accent-red-dark)]">
                Score Keeper
              </h1>
            </div>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8 animate-fade-in">
        <section className="space-y-8">
          {!activeGame && (
            <>
              <div className="relative overflow-hidden rounded-lg card-surface bg-[var(--dark-800)]/80 px-8 pb-8 pt-8 animate-fade-up">
                <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[var(--accent-red)]/20 blur-3xl animate-float" />
                <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-start">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent-red)]">
                      Retro Score Keeper
                    </p>
                    <h2 className="mt-1 text-4xl font-semibold tracking-tight text-[var(--text-100)] md:text-5xl">
                      Track every round.
                      <span className="block text-[var(--text-200)]">
                        Crown the winner fast.
                      </span>
                    </h2>
                    <p className="mt-4 text-sm text-[var(--text-200)]">
                      Create a game, add players, and keep scores in any order. Edit rounds or
                      subtract points whenever you need.
                    </p>
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        href="/new"
                        className="btn inline-flex items-center justify-center rounded-md bg-[var(--accent-red)] px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)]"
                      >
                        Start a new game
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeGame && (
            <div className="space-y-6">
              <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-6 animate-fade-up">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-red)]">
                      {activeGame.endedAt ? "Final Scores" : "Active Game"}
                    </p>
                    <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-100)]">
                      {activeGame.name}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--text-200)]">
                      Started {formatDate(activeGame.createdAt)}
                    </p>
                    {activeGame.endedAt && (
                      <p className="mt-1 text-sm text-[var(--text-200)]">
                        Ended {formatDate(activeGame.endedAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-between gap-3 md:w-auto">
                    <div className="flex h-11 items-center rounded-md bg-[var(--dark-900)] px-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)]">
                      {activeGame.rounds.length} rounds
                    </div>
                    {!activeGame.endedAt && (
                      <button
                        className="btn rounded-md bg-[var(--accent-red)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)]"
                        onClick={endGame}
                      >
                        End game
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {sortedPlayers.map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between rounded-lg card-inset bg-[var(--dark-900)]/90 px-4 py-3 text-sm font-semibold animate-fade-up"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <span className="uppercase tracking-wide text-[var(--text-200)]">
                        {player.name}
                      </span>
                      <span className="text-lg font-semibold text-[var(--text-100)]">
                        {totals[player.id] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>

                {activeGame.endedAt && (
                  <>
                    <div className="mt-6 rounded-lg card-inset bg-[var(--accent-red)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white animate-fade-up">
                      Winner{getWinners(activeGame).length > 1 ? "s" : ""}: {" "}
                      {getWinners(activeGame)
                        .map((player) => player.name)
                        .join(", ")}
                    </div>
                    <button
                      className="btn mt-3 w-full rounded-md bg-[var(--surface-1)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                      onClick={playAgain}
                    >
                      Play again
                    </button>
                  </>
                )}
              </div>

              {!activeGame.endedAt && (
                <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-6 animate-fade-up">
                  <h3 className="text-xl font-semibold text-[var(--text-100)]">Add Round</h3>
                  <p className="mt-1 text-sm text-[var(--text-200)]">
                    Enter point changes for any player. Negative values subtract points.
                  </p>
                  <div className="mt-4 grid gap-3">
                    {activeGame.players.map((player) => (
                      <label
                        key={player.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                      >
                        <span className="w-full text-sm font-semibold uppercase tracking-wide text-[var(--text-200)] sm:w-24">
                          {player.name}
                        </span>
                        <div className="flex w-full items-center gap-2">
                          <div className="flex h-11 shrink-0 overflow-hidden rounded-lg border border-[var(--dark-700)] bg-[var(--dark-900)]">
                            <button
                              type="button"
                              aria-pressed={(roundSigns[player.id] ?? 1) === 1}
                              className={`grid h-full place-items-center px-4 text-2xl font-semibold uppercase leading-none tracking-wide ${
                                (roundSigns[player.id] ?? 1) === 1
                                  ? "bg-[var(--surface-1)] text-[var(--text-100)]"
                                  : "text-[var(--text-200)]"
                              }`}
                              onClick={() =>
                                setRoundSigns((prev) => ({
                                  ...prev,
                                  [player.id]: 1,
                                }))
                              }
                            >
                              <span className="leading-none">+</span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={(roundSigns[player.id] ?? 1) === -1}
                              className={`grid h-full place-items-center px-4 text-2xl font-semibold uppercase leading-none tracking-wide ${
                                (roundSigns[player.id] ?? 1) === -1
                                  ? "bg-[var(--accent-red)] text-white"
                                  : "text-[var(--text-200)]"
                              }`}
                              onClick={() =>
                                setRoundSigns((prev) => ({
                                  ...prev,
                                  [player.id]: -1,
                                }))
                              }
                            >
                              <span className="inline-block -translate-y-[1px] leading-none">-</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={roundDeltas[player.id] ?? ""}
                            onChange={(event) =>
                              setRoundDeltas((prev) => ({
                                ...prev,
                                [player.id]: event.target.value,
                              }))
                            }
                            placeholder="0"
                            className="input-field min-w-0"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                  {roundError && (
                    <p className="mt-3 text-sm font-semibold text-[var(--accent-red)]">
                      {roundError}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      className="btn w-full rounded-md bg-[var(--accent-red)] px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)] md:ml-auto md:w-auto md:px-5 md:py-2"
                      onClick={addRound}
                    >
                      Save round
                    </button>
                  </div>
                  <div className="mt-4 flex w-full items-center gap-2">
                    <input
                      value={playerToAdd}
                      onChange={(event) => setPlayerToAdd(event.target.value)}
                      placeholder="New player"
                      className="input-field"
                    />
                    <button
                      className="btn h-11 shrink-0 rounded-md bg-[var(--surface-1)] px-4 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                      onClick={addPlayerToGame}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-6 animate-fade-up">
                <h3 className="text-xl font-semibold text-[var(--text-100)]">Rounds</h3>
                {activeGame.rounds.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--text-200)]">
                    No rounds yet. Add your first round to start tracking points.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-4">
                    {activeGame.rounds.map((round, index) => (
                      <div
                        key={round.id}
                        className="rounded-lg card-inset bg-[var(--dark-900)]/80 p-4 animate-fade-up"
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-red)]">
                              Round {index + 1}
                            </p>
                            <p className="text-sm text-[var(--text-200)]">
                              {formatDate(round.createdAt)}
                            </p>
                          </div>
                          {!activeGame.endedAt && (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="btn rounded-md bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                                onClick={() => startEditRound(round)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn rounded-md  bg-[var(--accent-red)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)]"
                                onClick={() => deleteRound(round.id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {editingRoundId === round.id && !activeGame.endedAt ? (
                          <div className="mt-4 grid gap-3">
                            {activeGame.players.map((player) => (
                              <label
                                key={player.id}
                                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
                              >
                                <span className="w-full text-sm font-semibold uppercase tracking-wide text-[var(--text-200)] sm:w-24">
                                  {player.name}
                                </span>
                                <div className="flex w-full items-center gap-2">
                                  <div className="flex h-11 shrink-0 overflow-hidden rounded-lg border border-[var(--dark-700)] bg-[var(--dark-900)]">
                                    <button
                                      type="button"
                                      aria-pressed={(editSigns[player.id] ?? 1) === 1}
                                      className={`grid h-full place-items-center px-4 text-2xl font-semibold uppercase leading-none tracking-wide ${
                                        (editSigns[player.id] ?? 1) === 1
                                          ? "bg-[var(--surface-1)] text-[var(--text-100)]"
                                          : "text-[var(--text-200)]"
                                      }`}
                                      onClick={() =>
                                        setEditSigns((prev) => ({
                                          ...prev,
                                          [player.id]: 1,
                                        }))
                                      }
                                    >
                                      <span className="leading-none">+</span>
                                    </button>
                                    <button
                                      type="button"
                                      aria-pressed={(editSigns[player.id] ?? 1) === -1}
                                      className={`grid h-full place-items-center px-4 text-2xl font-semibold uppercase leading-none tracking-wide ${
                                        (editSigns[player.id] ?? 1) === -1
                                          ? "bg-[var(--accent-red)] text-white"
                                          : "text-[var(--text-200)]"
                                      }`}
                                      onClick={() =>
                                        setEditSigns((prev) => ({
                                          ...prev,
                                          [player.id]: -1,
                                        }))
                                      }
                                    >
                                      <span className="inline-block -translate-y-[1px] leading-none">-</span>
                                    </button>
                                  </div>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    min={0}
                                    value={editEntries[player.id] ?? ""}
                                    onChange={(event) =>
                                      setEditEntries((prev) => ({
                                        ...prev,
                                        [player.id]: event.target.value,
                                      }))
                                    }
                                    placeholder="0"
                                    className="input-field min-w-0"
                                  />
                                </div>
                              </label>
                            ))}
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="btn rounded-md  bg-[var(--accent-red)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[var(--accent-red-dark)]"
                                onClick={saveEditRound}
                              >
                                Save changes
                              </button>
                              <button
                                className="btn rounded-md bg-[var(--surface-1)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                                onClick={() => setEditingRoundId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 grid gap-2 text-sm text-[var(--text-100)]">
                            {round.entries.map((entry) => {
                              const player = activeGame.players.find(
                                (item) => item.id === entry.playerId
                              );
                              return (
                                <div
                                  key={`${round.id}-${entry.playerId}`}
                                  className="flex items-center justify-between"
                                >
                                  <span className="font-semibold uppercase tracking-wide text-[var(--text-200)]">
                                    {player?.name ?? "Unknown"}
                                  </span>
                                  <span
                                    className={
                                      entry.delta >= 0
                                        ? "text-[var(--text-100)]"
                                        : "text-[var(--accent-red)]"
                                    }
                                  >
                                    {entry.delta >= 0 ? "+" : ""}
                                    {entry.delta}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {!activeGame && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-5 animate-fade-up">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--text-100)]">Win History</h3>
                  <Link
                    href="/history"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)] transition hover:text-[var(--text-100)]"
                  >
                    Full list
                  </Link>
                </div>
                {completedGames.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--text-200)]">
                    Finish a game to see winners here.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-4">
                    {recentCompleted.map((game, index) => {
                      const winners = getWinners(game);
                      return (
                        <div
                          key={game.id}
                          className="rounded-lg card-inset bg-[var(--dark-900)]/80 px-3 py-3 text-sm animate-fade-up"
                          style={{ animationDelay: `${index * 70}ms` }}
                        >
                          <p className="font-semibold uppercase tracking-wide text-[var(--text-100)]">
                            {game.name}
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-200)]">
                            Ended {formatDate(game.endedAt!)}
                          </p>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--accent-red)]">
                            Winner{winners.length > 1 ? "s" : ""}:{" "}
                            {winners.map((winner) => winner.name).join(", ")}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              className="btn inline-flex w-full items-center justify-center rounded-md bg-[var(--surface-1)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                              onClick={() => setActiveGameId(game.id)}
                            >
                              View game
                            </button>
                            <button
                              className="btn inline-flex w-full items-center justify-center rounded-md bg-[var(--surface-2)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-200)] transition hover:bg-[var(--surface-2-hover)] hover:text-[var(--accent-red)]"
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

              <div className="rounded-xl card-surface bg-[var(--dark-800)]/90 p-5 animate-fade-up">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--text-100)]">In Progress</h3>
                  <Link
                    href="/in-progress"
                    className="text-xs font-semibold uppercase tracking-wide text-[var(--text-200)] transition hover:text-[var(--text-100)]"
                  >
                    Full list
                  </Link>
                </div>
                {inProgressGames.length === 0 ? (
                  <p className="mt-3 text-sm text-[var(--text-200)]">No active games yet.</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {recentInProgress.map((game, index) => (
                      <div
                        key={game.id}
                        className="rounded-lg card-inset bg-[var(--dark-900)]/80 px-3 py-3 text-sm animate-fade-up"
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <button
                          className="w-full text-left font-semibold uppercase tracking-wide text-[var(--text-100)]"
                          onClick={() => setActiveGameId(game.id)}
                        >
                          {game.name}
                        </button>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            className="btn inline-flex w-full items-center justify-center rounded-md bg-[var(--surface-1)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[var(--text-100)] transition hover:bg-[var(--surface-1-hover)]"
                            onClick={() => setActiveGameId(game.id)}
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
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
