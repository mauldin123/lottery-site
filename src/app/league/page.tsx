"use client";

import { useMemo, useState } from "react";

type UserResult = {
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
};

type LeagueListResult = {
  leagues: Array<{
    leagueId: string;
    name: string;
    season: string;
    sport: string;
    totalRosters: number;
    avatar: string | null;
  }>;
};

type LeagueInfoResult = {
  league: any;
};

type TeamsResult = {
  teams: Array<{
    rosterId: number;
    ownerId: string | null;
    displayName: string;
    avatar: string | null;
    record: { wins: number; losses: number; ties: number };
  }>;
};

function isNumericId(value: string) {
  return /^\d+$/.test(value.trim());
}

function seasonOptions() {
  const now = new Date();
  const year = now.getFullYear();
  return [year + 1, year, year - 1, year - 2].map(String);
}

export default function LeaguePage() {
  const seasons = useMemo(() => seasonOptions(), []);
  const defaultSeason = seasons[0] ?? String(new Date().getFullYear());

  const [username, setUsername] = useState("");
  const [season, setSeason] = useState(defaultSeason);

  const [leagueIdInput, setLeagueIdInput] = useState("");

  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingLeagueDetails, setLoadingLeagueDetails] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [foundUser, setFoundUser] = useState<UserResult["user"] | null>(null);
  const [leagues, setLeagues] = useState<LeagueListResult["leagues"]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [teams, setTeams] = useState<TeamsResult["teams"]>([]);

  async function findLeaguesByUsername() {
    setError(null);
    setLeagues([]);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);

    const uname = username.trim();
    if (!uname) {
      setError("Username is required.");
      return;
    }

    try {
      setLoadingUser(true);

      const userRes = await fetch(
        `/api/sleeper/user/by-username/${encodeURIComponent(uname)}`,
        { cache: "no-store" }
      );

      const userJson = (await userRes.json()) as Partial<UserResult> & {
        error?: string;
      };

      if (!userRes.ok || !userJson.user?.userId) {
        setFoundUser(null);
        setError(userJson.error || "User not found on Sleeper.");
        return;
      }

      setFoundUser(userJson.user);

      setLoadingLeagues(true);

      const leaguesRes = await fetch(
        `/api/sleeper/user/${encodeURIComponent(
          userJson.user.userId
        )}/leagues?season=${encodeURIComponent(season)}&sport=nfl`,
        { cache: "no-store" }
      );

      const leaguesJson = (await leaguesRes.json()) as Partial<LeagueListResult> & {
        error?: string;
      };

      if (!leaguesRes.ok || !Array.isArray(leaguesJson.leagues)) {
        setLeagues([]);
        setError(leaguesJson.error || "Failed to load leagues.");
        return;
      }

      setLeagues(leaguesJson.leagues);
      if (leaguesJson.leagues.length === 0) {
        setError("No leagues found for that user in the selected season.");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error while loading leagues.");
    } finally {
      setLoadingUser(false);
      setLoadingLeagues(false);
    }
  }

  async function loadLeagueById(leagueId: string) {
    setError(null);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);

    const id = leagueId.trim();
    if (!id) {
      setError("League ID is required.");
      return;
    }
    if (!isNumericId(id)) {
      setError("Invalid leagueId. Must be numeric.");
      return;
    }

    try {
      setLoadingLeagueDetails(true);

      const [leagueRes, teamsRes] = await Promise.all([
        fetch(`/api/sleeper/league/${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/sleeper/league/${encodeURIComponent(id)}/teams`, {
          cache: "no-store",
        }),
      ]);

      const leagueJson = (await leagueRes.json()) as Partial<LeagueInfoResult> & {
        error?: string;
      };
      const teamsJson = (await teamsRes.json()) as Partial<TeamsResult> & {
        error?: string;
      };

      if (!leagueRes.ok) {
        setError(leagueJson.error || "Failed to load league.");
        return;
      }

      setSelectedLeagueId(id);
      setLeagueInfo(leagueJson.league ?? null);
      setTeams(Array.isArray(teamsJson.teams) ? teamsJson.teams : []);
    } catch (e: any) {
      setError(e?.message || "Unexpected error while loading league.");
    } finally {
      setLoadingLeagueDetails(false);
    }
  }

  async function onPickLeague(leagueId: string) {
    await loadLeagueById(leagueId);
  }

  const canFind = username.trim().length > 0 && !loadingUser && !loadingLeagues;
  const canLoadById = leagueIdInput.trim().length > 0 && !loadingLeagueDetails;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-bold">Load a Sleeper League</h1>
      <p className="mt-2 text-zinc-400">
        Use a Sleeper username to pick a league, or paste a numeric league ID directly.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-xl font-semibold">Find by username</h2>

          <label className="mt-4 block text-sm text-zinc-300">Sleeper username</label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="example: chasennnn"
          />

          <label className="mt-4 block text-sm text-zinc-300">Season</label>
          <select
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={findLeaguesByUsername}
            disabled={!canFind}
          >
            {loadingUser || loadingLeagues ? "Loading..." : "Find leagues"}
          </button>

          {foundUser ? (
            <p className="mt-3 text-sm text-zinc-300">
              Found:{" "}
              <span className="font-medium text-zinc-100">
                {foundUser.displayName} ({foundUser.username})
              </span>
            </p>
          ) : null}

          {leagues.length > 0 ? (
            <div className="mt-5">
              <div className="text-sm text-zinc-300">Pick a league</div>
              <div className="mt-3 grid gap-3">
                {leagues.map((l) => (
                  <button
                    key={l.leagueId}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-left hover:border-zinc-600"
                    onClick={() => onPickLeague(l.leagueId)}
                    disabled={loadingLeagueDetails}
                  >
                    <div className="text-lg font-semibold text-zinc-100">{l.name}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Season {l.season} | Teams {l.totalRosters} | ID {l.leagueId}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-xl font-semibold">Load by league ID</h2>

          <label className="mt-4 block text-sm text-zinc-300">League ID</label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={leagueIdInput}
            onChange={(e) => setLeagueIdInput(e.target.value)}
            placeholder="Example: 1180100331814481920"
          />

          <button
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => loadLeagueById(leagueIdInput)}
            disabled={!canLoadById}
          >
            {loadingLeagueDetails ? "Loading..." : "Load league"}
          </button>

          {selectedLeagueId ? (
            <p className="mt-3 text-sm text-zinc-300">
              Selected League ID:{" "}
              <span className="font-medium text-zinc-100">{selectedLeagueId}</span>
            </p>
          ) : null}
        </section>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
      ) : null}

      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">League details</h2>
            <p className="mt-1 text-sm text-zinc-400">
              This section fills after you click a league or load by ID.
            </p>
          </div>

          <div className="text-sm text-zinc-400">
            {loadingLeagueDetails ? "Loading league data..." : null}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-zinc-100">League</h3>
            <div className="mt-3 text-sm text-zinc-300">
              <div>
                <span className="text-zinc-400">Name:</span>{" "}
                <span className="text-zinc-100">
                  {leagueInfo?.name ?? "(not loaded)"}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-zinc-400">Season:</span>{" "}
                <span className="text-zinc-100">
                  {leagueInfo?.season ?? "(not loaded)"}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-zinc-400">League ID:</span>{" "}
                <span className="text-zinc-100">{selectedLeagueId ?? "(none)"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-zinc-100">Teams</h3>
            <div className="mt-3 text-sm text-zinc-400">
              {teams.length === 0 ? (
                <div>(not loaded)</div>
              ) : (
                <div>
                  Loaded <span className="text-zinc-100">{teams.length}</span> teams.
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="mt-8 text-xl font-semibold">Teams</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(teams ?? []).map((t) => (
            <div
              key={t.rosterId}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-zinc-100">{t.displayName}</div>
                <div className="text-sm text-zinc-400">Roster {t.rosterId}</div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Record:{" "}
                <span className="text-zinc-200">
                  {t.record.wins}-{t.record.losses}
                  {t.record.ties ? `-${t.record.ties}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
