import { useEffect, useRef, useState } from "react";

interface RefArea {
  left: string | number;
  right: string | number;
}

/**
 * Drag-to-zoom for recharts: drag horizontally to select a range, zoom to it
 * on release, double-click to reset.
 *
 * Spread `chartProps` onto the chart, render a `<ReferenceArea>` from
 * `refArea` while dragging, and plot `zoomedData` instead of `data`.
 */
export function useDragZoom<T>(
  data: T[],
  getKey: (d: T) => string | number,
) {
  const [range, setRange] = useState<[number, number] | null>(null);
  const [refArea, setRefArea] = useState<RefArea | null>(null);
  const dragging = useRef(false);

  // new data (e.g. bucket toggle) invalidates the zoomed indices
  useEffect(() => {
    setRange(null);
    setRefArea(null);
    dragging.current = false;
  }, [data]);

  const zoomedData = range ? data.slice(range[0], range[1] + 1) : data;

  function commit() {
    dragging.current = false;
    setRefArea(null);
    if (!refArea || refArea.left === refArea.right) {
      return;
    }
    let i = data.findIndex((d) => getKey(d) === refArea.left);
    let j = data.findIndex((d) => getKey(d) === refArea.right);
    if (i < 0 || j < 0) {
      return;
    }
    if (i > j) {
      [i, j] = [j, i];
    }
    setRange([i, j]);
  }

  const chartProps = {
    onMouseDown: (e: { activeLabel?: string | number } | null) => {
      if (e?.activeLabel == null) {
        return;
      }
      dragging.current = true;
      setRefArea({ left: e.activeLabel, right: e.activeLabel });
    },
    onMouseMove: (e: { activeLabel?: string | number } | null) => {
      if (!dragging.current || e?.activeLabel == null) {
        return;
      }
      const right = e.activeLabel;
      setRefArea((prev) => (prev ? { ...prev, right } : null));
    },
    onMouseUp: commit,
    onMouseLeave: () => {
      if (dragging.current) {
        commit();
      }
    },
    onDoubleClick: () => setRange(null),
    style: { userSelect: "none" as const },
  };

  return { zoomedData, refArea, isZoomed: range !== null, chartProps };
}
