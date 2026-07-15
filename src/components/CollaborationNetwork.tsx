"use client";

import { useMemo, useState } from "react";

export interface CollaborationInstitution {
  id: string;
  name: string;
  works: number;
}

export interface CollaborationAuthor {
  id: string;
  name: string;
  works: number;
  affiliations: Array<{ id: string; name: string; works: number }>;
}

export interface CollaborationEdge {
  source: string;
  target: string;
  works: number;
}

export interface CollaborationData {
  metadata: {
    frame_works: number;
    year_from: number;
    year_to: number;
    works_with_named_canadian_institutions: number;
    institutions: number;
    institution_team_cap: number;
    institution_cap_exclusions: number;
    author_works: number;
    authors: number;
    author_team_cap: number;
    author_cap_exclusions: number;
    edge_limit: number;
    author_network_status: string;
  };
  authors: CollaborationAuthor[];
  author_edges: CollaborationEdge[];
  institutions: CollaborationInstitution[];
  institution_edges: CollaborationEdge[];
}

interface PositionedInstitution extends CollaborationInstitution {
  x: number;
  y: number;
  rank: number;
}

const WIDTH = 900;
const HEIGHT = 560;

function layoutNetwork(
  allNodes: CollaborationInstitution[],
  allEdges: CollaborationEdge[],
  limit: number,
): { nodes: PositionedInstitution[]; edges: CollaborationEdge[] } {
  const strength = new Map<string, number>();
  for (const edge of allEdges) {
    strength.set(edge.source, (strength.get(edge.source) ?? 0) + edge.works);
    strength.set(edge.target, (strength.get(edge.target) ?? 0) + edge.works);
  }
  const selected = [...allNodes]
    .sort(
      (a, b) =>
        (strength.get(b.id) ?? 0) - (strength.get(a.id) ?? 0) ||
        b.works - a.works ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);
  const selectedIds = new Set(selected.map((node) => node.id));
  const edges = allEdges.filter(
    (edge) => selectedIds.has(edge.source) && selectedIds.has(edge.target),
  );
  const state = selected.map((node, index) => {
    const angle = (index / Math.max(selected.length, 1)) * Math.PI * 2;
    const radius = index % 2 === 0 ? 190 : 235;
    return {
      ...node,
      x: WIDTH / 2 + Math.cos(angle) * radius,
      y: HEIGHT / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      rank: index + 1,
    };
  });
  const byId = new Map(state.map((node) => [node.id, node]));
  for (let iteration = 0; iteration < 220; iteration += 1) {
    for (let i = 0; i < state.length; i += 1) {
      const a = state[i];
      if (!a) continue;
      for (let j = i + 1; j < state.length; j += 1) {
        const b = state[j];
        if (!b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distanceSquared = Math.max(dx * dx + dy * dy, 64);
        const force = 11_000 / distanceSquared;
        const distance = Math.sqrt(distanceSquared);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;
      }
    }
    for (const edge of edges) {
      const source = byId.get(edge.source);
      const target = byId.get(edge.target);
      if (!source || !target) continue;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const force =
        (distance - 120) * (0.0018 + Math.log1p(edge.works) * 0.00035);
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }
    for (const node of state) {
      node.vx += (WIDTH / 2 - node.x) * 0.0015;
      node.vy += (HEIGHT / 2 - node.y) * 0.0015;
      node.vx *= 0.78;
      node.vy *= 0.78;
      node.x = Math.min(WIDTH - 32, Math.max(32, node.x + node.vx));
      node.y = Math.min(HEIGHT - 32, Math.max(32, node.y + node.vy));
    }
  }
  return {
    nodes: state.map(({ vx: _vx, vy: _vy, ...node }) => node),
    edges,
  };
}

export function CollaborationNetwork({
  data,
  lang,
  worksPath,
  copy,
}: {
  data: CollaborationData;
  lang: "en" | "fr";
  worksPath: string;
  copy: {
    ariaLabel: string;
    authorAriaLabel: string;
    institutionMode: string;
    authorMode: string;
    institutionsShown: string;
    authorsShown: string;
    legendTitle: string;
    authorLegendTitle: string;
    strongestPairs: string;
    works: string;
    filterHint: string;
    authorHint: string;
    sharedWorks: string;
  };
}) {
  const hasAuthors = data.authors.length > 0;
  const [mode, setMode] = useState<"institutions" | "authors">(
    "institutions",
  );
  const [limit, setLimit] = useState(30);
  const sourceNodes =
    mode === "authors" && hasAuthors ? data.authors : data.institutions;
  const sourceEdges =
    mode === "authors" && hasAuthors
      ? data.author_edges
      : data.institution_edges;
  const graph = useMemo(
    () => layoutNetwork(sourceNodes, sourceEdges, limit),
    [sourceNodes, sourceEdges, limit],
  );
  const number = useMemo(
    () => new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA"),
    [lang],
  );
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const strongestEdges = [...graph.edges]
    .sort((a, b) => b.works - a.works)
    .slice(0, 12);
  const maxNodeWorks = Math.max(...graph.nodes.map((node) => node.works), 1);
  const maxEdgeWorks = Math.max(...graph.edges.map((edge) => edge.works), 1);
  const hrefFor = (node: { id: string; name: string }) =>
    mode === "authors"
      ? `https://openalex.org/${node.id}`
      : `${worksPath}?institution=${encodeURIComponent(node.name)}`;
  const nodeHint =
    mode === "authors" ? copy.authorHint : copy.filterHint;

  return (
    <div>
      {hasAuthors && (
        <div className="mb-3 inline-flex rounded-md border p-1" role="group">
          {(
            [
              ["institutions", copy.institutionMode],
              ["authors", copy.authorMode],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className="rounded px-3 py-1.5 text-sm"
              style={
                mode === value
                  ? { background: "var(--mc)", color: "var(--on-mc)" }
                  : { color: "var(--ink-3)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <label className="mb-3 flex max-w-xs items-center gap-3 text-sm">
        <span style={{ color: "var(--ink-4)" }}>
          {mode === "authors" ? copy.authorsShown : copy.institutionsShown}
        </span>
        <select
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
          className="rounded-md border px-2 py-1.5"
          style={{ background: "var(--surface-2)", color: "var(--ink)" }}
        >
          {[20, 30, 40].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="collaboration-plot rounded-md border">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="group"
          aria-label={
            mode === "authors" ? copy.authorAriaLabel : copy.ariaLabel
          }
        >
          <g>
            {graph.edges.map((edge) => {
              const source = nodeById.get(edge.source);
              const target = nodeById.get(edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={`${edge.source}:${edge.target}`}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="var(--ink-3)"
                  strokeOpacity={0.65 + (edge.works / maxEdgeWorks) * 0.35}
                  strokeWidth={0.8 + Math.log1p(edge.works) * 0.45}
                >
                  <title>
                    {source.name} · {target.name}: {number.format(edge.works)}{" "}
                    {copy.sharedWorks}
                  </title>
                </line>
              );
            })}
          </g>
          <g>
            {graph.nodes.map((node) => {
              const radius = 7 + Math.sqrt(node.works / maxNodeWorks) * 16;
              return (
                <a
                  key={node.id}
                  className="network-node"
                  href={hrefFor(node)}
                  target={mode === "authors" ? "_blank" : undefined}
                  rel={mode === "authors" ? "noreferrer" : undefined}
                  aria-label={`${node.rank}. ${node.name}: ${number.format(node.works)} ${copy.works}. ${nodeHint}`}
                >
                  <title>
                    {node.name}: {number.format(node.works)} {copy.works}
                  </title>
                  <circle
                    className="network-node-hit"
                    cx={node.x}
                    cy={node.y}
                    r={Math.max(radius, 28)}
                    style={{
                      fill: "transparent",
                      fillOpacity: 0,
                      stroke: "none",
                      pointerEvents: "all",
                    }}
                  />
                  <circle cx={node.x} cy={node.y} r={radius} />
                  {node.rank <= 12 && (
                    <text x={node.x} y={node.y} dy="0.35em">
                      {node.rank}
                    </text>
                  )}
                </a>
              );
            })}
          </g>
        </svg>
      </div>

      <div className="mt-5">
        <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
          {mode === "authors" ? copy.authorLegendTitle : copy.legendTitle}
        </h3>
        <ol className="collaboration-legend mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {graph.nodes.slice(0, 12).map((node) => (
            <li key={node.id} className="flex min-w-0 items-baseline gap-2">
              <span className="tabular shrink-0 text-xs" style={{ color: "var(--mc)" }}>
                {node.rank}
              </span>
              <a
                className="link min-w-0 flex-1 truncate"
                href={hrefFor(node)}
                target={mode === "authors" ? "_blank" : undefined}
                rel={mode === "authors" ? "noreferrer" : undefined}
                title={nodeHint}
              >
                {node.name}
              </a>
              <span className="tabular shrink-0 text-xs" style={{ color: "var(--ink-4)" }}>
                {number.format(node.works)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {strongestEdges.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-4)" }}>
            {copy.strongestPairs}
          </h3>
          <ol className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {strongestEdges.map((edge) => {
              const source = nodeById.get(edge.source);
              const target = nodeById.get(edge.target);
              if (!source || !target) return null;
              return (
                <li key={`${edge.source}:${edge.target}`} className="flex items-baseline justify-between gap-3">
                  <span>{source.name} ↔ {target.name}</span>
                  <span className="tabular shrink-0 text-xs" style={{ color: "var(--ink-4)" }}>
                    {number.format(edge.works)} {copy.sharedWorks}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
