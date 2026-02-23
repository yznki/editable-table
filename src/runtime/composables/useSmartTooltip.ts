import { computed, onBeforeUnmount, ref, watch, type Ref } from "vue";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface SmartTooltipPosition {
  placement: TooltipPlacement;
  style: Record<string, string>;
}

interface UseSmartTooltipOptions {
  triggerElement: Ref<HTMLElement | null>;
  tooltipElement: Ref<HTMLElement | null>;
  boundaryElement?: Ref<HTMLElement | null>;
  isOpen?: Ref<boolean>;
  preferredPlacement?: TooltipPlacement;
  gap?: number;
  padding?: number;
  maxWidth?: number;
  minWidth?: number;
}

const VIEWPORT_PADDING = 8;
const TOOLTIP_GAP = 8;
const DEFAULT_MAX_WIDTH = 360;
const DEFAULT_MIN_WIDTH = 180;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useSmartTooltip(options: UseSmartTooltipOptions) {
  const position = ref<SmartTooltipPosition>({
    placement: options.preferredPlacement ?? "top",
    style: {
      position: "fixed",
      top: "0px",
      left: "0px",
      visibility: "hidden",
      pointerEvents: "none",
      zIndex: "60"
    }
  });

  let stopObservers: (() => void) | null = null;
  let rafId: number | null = null;

  function queueComputePosition() {
    if (typeof window === "undefined" || typeof requestAnimationFrame !== "function") {
      computePosition();
      return;
    }
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      rafId = null;
      computePosition();
    });
  }

  function resolveBoundaryRect() {
    const boundary = options.boundaryElement?.value;
    const viewportRect = {
      top: VIEWPORT_PADDING,
      left: VIEWPORT_PADDING,
      right: window.innerWidth - VIEWPORT_PADDING,
      bottom: window.innerHeight - VIEWPORT_PADDING
    };

    if (!boundary) return viewportRect;
    const rect = boundary.getBoundingClientRect();

    return {
      top: Math.max(viewportRect.top, rect.top + VIEWPORT_PADDING),
      left: Math.max(viewportRect.left, rect.left + VIEWPORT_PADDING),
      right: Math.min(viewportRect.right, rect.right - VIEWPORT_PADDING),
      bottom: Math.min(viewportRect.bottom, rect.bottom - VIEWPORT_PADDING)
    };
  }

  function computePosition() {
    const trigger = options.triggerElement.value;
    const tooltip = options.tooltipElement.value;
    const isOpen = options.isOpen?.value ?? true;

    if (!trigger || !tooltip || !isOpen) {
      position.value = {
        placement: options.preferredPlacement ?? "top",
        style: {
          ...position.value.style,
          visibility: "hidden"
        }
      };
      return;
    }

    const gap = options.gap ?? TOOLTIP_GAP;
    const padding = options.padding ?? VIEWPORT_PADDING;
    const minWidth = options.minWidth ?? DEFAULT_MIN_WIDTH;
    const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
    const triggerRect = trigger.getBoundingClientRect();
    const boundaryRect = resolveBoundaryRect();

    const availableBoundaryWidth = Math.max(0, boundaryRect.right - boundaryRect.left - padding * 2);
    const resolvedMaxWidth = clamp(Math.min(maxWidth, availableBoundaryWidth), 0, Math.max(0, maxWidth));
    const resolvedMinWidth = Math.min(minWidth, resolvedMaxWidth);

    Object.assign(tooltip.style, {
      maxWidth: `${resolvedMaxWidth}px`,
      minWidth: `${resolvedMinWidth}px`
    });

    const tooltipRect = tooltip.getBoundingClientRect();

    const placementCandidates: TooltipPlacement[] =
      options.preferredPlacement === "bottom" ? ["bottom", "top", "right", "left"]
      : options.preferredPlacement === "left" ? ["left", "right", "top", "bottom"]
      : options.preferredPlacement === "right" ? ["right", "left", "top", "bottom"]
      : ["top", "bottom", "right", "left"];

    const spaceByPlacement: Record<TooltipPlacement, number> = {
      top: triggerRect.top - boundaryRect.top - gap,
      bottom: boundaryRect.bottom - triggerRect.bottom - gap,
      left: triggerRect.left - boundaryRect.left - gap,
      right: boundaryRect.right - triggerRect.right - gap
    };

    const idealPlacement =
      placementCandidates.find((candidate) => {
        const requiredSize = candidate === "top" || candidate === "bottom" ? tooltipRect.height : tooltipRect.width;
        return spaceByPlacement[candidate] >= requiredSize;
      }) ?? placementCandidates.reduce((best, current) => (spaceByPlacement[current] > spaceByPlacement[best] ? current : best), "top");

    let nextLeft = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    let nextTop = triggerRect.top - tooltipRect.height - gap;

    if (idealPlacement === "bottom") {
      nextTop = triggerRect.bottom + gap;
    } else if (idealPlacement === "left") {
      nextLeft = triggerRect.left - tooltipRect.width - gap;
      nextTop = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    } else if (idealPlacement === "right") {
      nextLeft = triggerRect.right + gap;
      nextTop = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
    }

    const minLeft = boundaryRect.left + padding;
    const maxLeft = Math.max(minLeft, boundaryRect.right - tooltipRect.width - padding);
    const minTop = boundaryRect.top + padding;
    const maxTop = Math.max(minTop, boundaryRect.bottom - tooltipRect.height - padding);

    nextLeft = clamp(nextLeft, minLeft, maxLeft);
    nextTop = clamp(nextTop, minTop, maxTop);

    position.value = {
      placement: idealPlacement,
      style: {
        position: "fixed",
        top: `${Math.round(nextTop)}px`,
        left: `${Math.round(nextLeft)}px`,
        visibility: "visible",
        pointerEvents: "none",
        zIndex: "60",
        maxWidth: `${resolvedMaxWidth}px`,
        minWidth: `${resolvedMinWidth}px`
      }
    };
  }

  function attachObservers() {
    if (typeof window === "undefined") return;
    const trigger = options.triggerElement.value;
    const tooltip = options.tooltipElement.value;
    if (!trigger || !tooltip) return;

    const boundary = options.boundaryElement?.value ?? null;

    window.addEventListener("resize", queueComputePosition, { passive: true });
    window.addEventListener("scroll", queueComputePosition, { passive: true, capture: true });

    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => queueComputePosition()) : null;
    resizeObserver?.observe(trigger);
    resizeObserver?.observe(tooltip);
    if (boundary) {
      resizeObserver?.observe(boundary);
    }

    stopObservers = () => {
      window.removeEventListener("resize", queueComputePosition);
      window.removeEventListener("scroll", queueComputePosition, true);
      resizeObserver?.disconnect();
      stopObservers = null;
    };
  }

  function detachObservers() {
    stopObservers?.();
    stopObservers = null;
  }

  watch(
    [options.triggerElement, options.tooltipElement, options.boundaryElement ?? ref(null), options.isOpen ?? ref(true)],
    ([trigger, tooltip, boundary, isOpen]) => {
      detachObservers();
      if (!trigger || !tooltip || !isOpen) {
        computePosition();
        return;
      }
      attachObservers();
      queueComputePosition();
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    detachObservers();
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  return {
    position: computed(() => position.value),
    recompute: queueComputePosition
  };
}
