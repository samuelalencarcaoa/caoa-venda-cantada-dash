"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";

type HorizontalDragState = {
  pointerId: number | null;
  isDragging: boolean;
  startX: number;
  startScrollLeft: number;
};

export function useHorizontalDragScroll<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const dragStateRef = useRef<HorizontalDragState>({
    pointerId: null,
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const resetDragState = (pointerId: number) => {
    const container = ref.current;
    const dragState = dragStateRef.current;

    dragStateRef.current = {
      pointerId: null,
      isDragging: false,
      startX: 0,
      startScrollLeft: 0,
    };

    if (container && dragState.pointerId === pointerId && container.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }
  };

  const onPointerDown = (event: ReactPointerEvent<T>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const container = ref.current;
    if (!container || container.scrollWidth <= container.clientWidth) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
    };

    container.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: ReactPointerEvent<T>) => {
    const container = ref.current;
    const dragState = dragStateRef.current;

    if (
      !container ||
      !dragState.isDragging ||
      dragState.pointerId !== event.pointerId ||
      event.pointerType !== "mouse"
    ) {
      return;
    }

    const delta = event.clientX - dragState.startX;
    container.scrollLeft = dragState.startScrollLeft - delta;
  };

  const onPointerUp = (event: ReactPointerEvent<T>) => {
    if (dragStateRef.current.pointerId === event.pointerId) {
      resetDragState(event.pointerId);
    }
  };

  const onPointerCancel = (event: ReactPointerEvent<T>) => {
    if (dragStateRef.current.pointerId === event.pointerId) {
      resetDragState(event.pointerId);
    }
  };

  return {
    ref,
    onPointerCancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
