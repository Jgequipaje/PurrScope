"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme, tokens } from "@/lib/theme";
import { useQACenterStore } from "../store/useQACenterStore";

const EDGE_MARGIN = 12;       // px from viewport edge
const BTN_SIZE    = 42;       // button diameter
const DRAG_THRESHOLD = 5;     // px movement before drag is recognised
const STORAGE_KEY = "qa-btn-pos";

type Pos = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToEdge(x: number, y: number): Pos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Snap to nearest horizontal edge
  const snapX = x + BTN_SIZE / 2 < vw / 2
    ? EDGE_MARGIN
    : vw - BTN_SIZE - EDGE_MARGIN;

  // Clamp Y within viewport
  const snapY = clamp(y, EDGE_MARGIN, vh - BTN_SIZE - EDGE_MARGIN);

  return { x: snapX, y: snapY };
}

function loadPos(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
  } catch { /* ignore */ }
  return null;
}

function savePos(pos: Pos) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
}

function defaultPos(): Pos {
  return {
    x: window.innerWidth - BTN_SIZE - EDGE_MARGIN,
    y: 16,
  };
}

export default function QAFloatingButton() {
  const { theme } = useTheme();
  const t = tokens[theme];
  const { isDrawerOpen, openDrawer, closeDrawer, issues, loadIssues } = useQACenterStore();

  const openCount = issues.filter((i) => i.status === "open" || i.status === "in_progress").length;

  const [pos, setPos] = useState<Pos | null>(null); // null until mounted
  const dragging   = useRef(false);
  const didDrag    = useRef(false);
  const pointerId  = useRef<number | null>(null);
  const startPtr   = useRef<Pos>({ x: 0, y: 0 });
  const startPos   = useRef<Pos>({ x: 0, y: 0 });
  const btnRef     = useRef<HTMLButtonElement>(null);

  // Restore position after mount (avoids SSR mismatch)
  useEffect(() => {
    setPos(loadPos() ?? defaultPos());
  }, []);

  // Re-clamp on window resize
  useEffect(() => {
    function onResize() {
      setPos((prev) => {
        if (!prev) return prev;
        const snapped = snapToEdge(prev.x, prev.y);
        savePos(snapped);
        return snapped;
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;

    const dx = e.clientX - startPtr.current.x;
    const dy = e.clientY - startPtr.current.y;

    if (!didDrag.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    didDrag.current = true;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const newX = clamp(startPos.current.x + dx, EDGE_MARGIN, vw - BTN_SIZE - EDGE_MARGIN);
    const newY = clamp(startPos.current.y + dy, EDGE_MARGIN, vh - BTN_SIZE - EDGE_MARGIN);

    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    if (pointerId.current !== null) {
      try { btnRef.current?.releasePointerCapture(pointerId.current); } catch { /* already released */ }
      pointerId.current = null;
    }

    setPos((prev) => {
      if (!prev) return prev;
      const snapped = snapToEdge(prev.x, prev.y);
      savePos(snapped);
      return snapped;
    });

    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Only primary button / touch
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();

    dragging.current = true;
    didDrag.current  = false;
    pointerId.current = e.pointerId;
    startPtr.current = { x: e.clientX, y: e.clientY };
    startPos.current = pos ?? defaultPos();

    btnRef.current?.setPointerCapture(e.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function handleClick() {
    // Suppress click if the pointer moved (drag)
    if (didDrag.current) return;
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
      loadIssues();
    }
  }

  // Don't render until position is known (prevents flash at wrong position)
  if (!pos) return null;

  return (
    <button
      ref={btnRef}
      onPointerDown={onPointerDown}
      onClick={handleClick}
      title="PurrScope QA Center"
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 998,
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: "50%",
        background: isDrawerOpen ? t.bgMuted : t.btnActive,
        color: isDrawerOpen ? t.textMuted : t.btnActiveTxt,
        border: `1px solid ${t.border}`,
        cursor: dragging.current ? "grabbing" : "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        transition: "background 0.15s, box-shadow 0.15s",
        fontFamily: "inherit",
        userSelect: "none",
        touchAction: "none",
      }}
    >
      {isDrawerOpen ? "✕" : "QA"}
      {!isDrawerOpen && openCount > 0 && (
        <span style={{
          position: "absolute", top: -4, right: -4,
          background: t.failText, color: "#fff",
          borderRadius: "50%", width: 16, height: 16,
          fontSize: 9, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          border: `1px solid ${t.bg}`,
          pointerEvents: "none",
        }}>
          {openCount > 9 ? "9+" : openCount}
        </span>
      )}
    </button>
  );
}
