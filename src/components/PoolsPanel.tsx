"use client";

import { useCallback, useMemo, useRef } from "react";
import { fetchPools } from "@/lib/api";
import { formatAmount } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { useAsync } from "@/hooks/useAsync";
import { useFocusShortcut } from "@/hooks/useFocusShortcut";
import { useQueryState } from "@/hooks/useQueryState";
import { Card } from "./Card";
import { StatCard } from "./StatCard";
import { PoolTable } from "./PoolTable";
import { PoolDistributionBar } from "./PoolDistributionBar";
import { TableSkeleton } from "./TableSkeleton";
import { EmptyState } from "./EmptyState";

/** Client panel that loads liquidity pools and renders summary stats. */
export function PoolsPanel() {
  const load = useCallback((signal: AbortSignal) => fetchPools(signal), []);
  const { state, reload } = useAsync(load);
  const [query, setQuery] = useQueryState("q", "");
  const searchRef = useRef<HTMLInputElement>(null);
  useFocusShortcut("/", searchRef);

  if (state.status === "loading") {
    return (
      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Pools</h2>
        <TableSkeleton columns={3} />
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <p className="text-sm text-red-400">
          Could not reach the API: {state.message}
        </p>
        <button
          onClick={reload}
          className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
        >
          Retry
        </button>
      </Card>
    );
  }

  const totalLiquidity = useMemo(() => state.data.reduce((sum, p) => sum + p.total, 0), [state.data]);
  const positions = useMemo(() => state.data.reduce((sum, p) => sum + p.anchors, 0), [state.data]);
  const filteredPools = useMemo(() => state.data.filter((pool) => matchesQuery([pool.asset], query)), [state.data, query]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Assets" value={String(state.data.length)} />
        <StatCard
          label="Total liquidity"
          value={formatAmount(totalLiquidity)}
        />
        <StatCard
          label="Anchor positions"
          value={String(positions)}
          hint="across all assets"
        />
      </div>
      <Card>
        <div className="mb-4">
          <PoolDistributionBar pools={state.data} />
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-200">Pools</h2>
          <div
            role="search"
            aria-label="Pools search and refresh"
            className="flex items-center gap-2"
          >
            <input
              ref={searchRef}
              type="text"
              aria-label="Search pools"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pools…"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
            />
            <button
              onClick={reload}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700"
            >
              Refresh
            </button>
          </div>
        </div>
        {filteredPools.length === 0 && state.data.length > 0 ? (
          <EmptyState
            reason="no-results"
            message="No pools match your search."
            onClearFilters={() => setQuery("")}
          />
        ) : (
          <PoolTable pools={filteredPools} />
        )}
      </Card>
    </div>
  );
}
