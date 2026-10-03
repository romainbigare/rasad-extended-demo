import { useEffect, useRef } from "react";
import { cx } from "@/components/ui/cx";
import { formatPercent } from "@/lib/format";
import { useT } from "@/lib/i18n/createDict";

import { STRINGS } from "../data/translations";
import { type CheckState, checkState, leafKeys, type ThematicKey, type ThematicNode } from "../map/thematicLegend";
import { useBulkLegendCounts, useRowCount } from "../map/useLegendCounts";

const count = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A checkbox that can show the half-ticked state. */
function TriCheckbox({ state, label, onToggle }: { state: CheckState; label: string; onToggle: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "some";
  }, [state]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === "all"}
      onChange={onToggle}
      aria-label={label}
      className="h-3.5 w-3.5 flex-none cursor-pointer accent-[#2f7d32] touch:h-5 touch:w-5"
    />
  );
}

function Row({
  node,
  wmsLayer,
  bulkCounts,
  checked,
  expanded,
  onToggle,
  onToggleExpand,
  shares,
}: {
  node: ThematicNode;
  wmsLayer: string;
  /** Counts for the whole layer when it's counted in one go; undefined = count this row on its own. */
  bulkCounts: Map<string, number> | undefined | null;
  checked: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  onToggle: (node: ThematicNode) => void;
  onToggleExpand: (node: ThematicNode) => void;
  /** Area share (%) per top-level row - shown right after the class name. */
  shares?: ReadonlyMap<string, number | null>;
}) {
  const t = useT(STRINGS);
  const open = expanded.has(node.key);
  const share = node.depth === 1 ? shares?.get(node.key) : undefined;
  const setOpen = () => onToggleExpand(node);
  const perRow = useRowCount(wmsLayer, node, bulkCounts === undefined);
  const records = bulkCounts ? bulkCounts.get(node.key) : perRow.data;
  const hasChildren = node.children.length > 0;

  if (records === 0) return null;

  return (
    <li>
      <div className="flex items-center gap-1.5 py-[3px] touch:py-1.5" style={{ paddingInlineStart: (node.depth - 1) * 14 }}>
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={t(open ? "thematicCollapse" : "thematicExpand").replace("{name}", node.name)}
            onClick={setOpen}
            className="grid h-4 w-4 flex-none place-items-center rounded text-[11px] text-muted hover:bg-[#eef1f0] touch:h-8 touch:w-8"
          >
            <span className={cx("inline-block transition-transform rtl:-scale-x-100", open && "rotate-90")}>▶</span>
          </button>
        ) : (
          <span className="w-4 flex-none" />
        )}
        <TriCheckbox state={checkState(node, checked)} label={node.name} onToggle={() => onToggle(node)} />
        <i aria-hidden className="inline-block h-3 w-3 flex-none rounded-[2px] border border-black/10" style={{ background: node.color }} />
        <button
          type="button"
          onClick={() => (hasChildren ? setOpen() : onToggle(node))}
          className={cx("flex min-w-0 flex-1 items-center gap-1.5 text-start", node.depth === 1 ? "font-semibold" : "")}
          title={node.name}
        >
          <span className="truncate max-lg:line-clamp-2 max-lg:whitespace-normal max-lg:break-words">{node.name}</span>
          {share !== undefined && share !== null && (
            <b className="flex-none text-[11px] tabular-nums text-green-d">{formatPercent(share)}</b>
          )}
        </button>
        <span className="flex-none text-[11px] tabular-nums text-muted">{records === undefined ? "" : count.format(records)}</span>
      </div>
      {hasChildren && open && (
        <ul className="m-0 list-none p-0">
          {node.children.map((child) => (
            <Row
              key={child.key}
              node={child}
              wmsLayer={wmsLayer}
              bulkCounts={bulkCounts}
              checked={checked}
              expanded={expanded}
              onToggle={onToggle}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ThematicLegendTree({
  title,
  layerKey,
  tree,
  wmsLayer,
  checked,
  onChange,
  expanded,
  onExpandedChange,
  shares,
}: {
  title: string;
  layerKey: ThematicKey;
  tree: ThematicNode[];
  wmsLayer: string;
  checked: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Open rows - an open row is split into its children's colours on the map. */
  expanded: ReadonlySet<string>;
  onExpandedChange: (next: Set<string>) => void;
  /** Area share (%) per top-level row, from useThematicShares. */
  shares?: ReadonlyMap<string, number | null>;
}) {
  const t = useT(STRINGS);
  const allLeaves = tree.flatMap(leafKeys);
  const bulk = useBulkLegendCounts(layerKey, tree);
  // Bulk layers: the map once loaded (null while loading, so rows don't each count themselves).
  const bulkCounts = bulk.isIdle ? undefined : bulk.data ?? null;

  const toggle = (node: ThematicNode) => {
    const next = new Set(checked);
    const on = checkState(node, checked) !== "all";
    leafKeys(node).forEach((k) => (on ? next.add(k) : next.delete(k)));
    onChange(next);
  };

  const toggleExpand = (node: ThematicNode) => {
    const next = new Set(expanded);
    if (next.has(node.key)) {
      // Closing a row also closes everything under it.
      [...next].filter((k) => k === node.key || k.startsWith(`${node.key} / `)).forEach((k) => next.delete(k));
    } else next.add(node.key);
    onExpandedChange(next);
  };

  return (
    <div className="text-xs" data-testid="thematic-legend-tree">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-muted">
        <span className="min-w-0 truncate">{title}</span>
        <span className="flex flex-none items-center gap-1.5">
          <button type="button" onClick={() => onChange(new Set(allLeaves))} className="hover:text-ink hover:underline touch:px-1.5 touch:py-2">
            {t("thematicSelectAll")}
          </button>
          <span aria-hidden>·</span>
          <button type="button" onClick={() => onChange(new Set())} className="hover:text-ink hover:underline touch:px-1.5 touch:py-2">
            {t("thematicSelectNone")}
          </button>
        </span>
      </div>
      <ul className="m-0 list-none p-0">
        {tree.map((node) => (
          <Row
            key={node.key}
            node={node}
            wmsLayer={wmsLayer}
            bulkCounts={bulkCounts}
            checked={checked}
            expanded={expanded}
            onToggle={toggle}
            onToggleExpand={toggleExpand}
            shares={shares}
          />
        ))}
      </ul>
    </div>
  );
}
