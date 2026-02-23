import { computed, ref, watch } from "vue";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";
export type TooltipAlignment = "start" | "center" | "end";

interface SmartTooltipPosition {
  placement: TooltipPlacement;
  alignment: TooltipAlignment;
  style: Record<string, string>;
}

interface UseSmartTooltipOptions {
  triggerElement: HTMLElement | null;
  tooltipElement: HTMLElement | null;
  tooltipWidth?: number;
  tooltipHeight?: number;
  gap?: number;
  padding?: number;
}

const VIEWPORT_PADDING = 8;
const TOOLTIP_GAP = 8;
const DEFAULT_TOOLTIP_WIDTH = 600;
const DEFAULT_TOOLTIP_HEIGHT = 100;

export function useSmartTooltip(options: UseSmartTooltipOptions) {
  const position = ref<SmartTooltipPosition>({
    placement: "bottom",
    alignment: "center",
    style: {}
  });

  const computePosition = () => {
    if (!options.triggerElement) return;

    const triggerRect = options.triggerElement.getBoundingClientRect();
    const tooltipWidth = options.tooltipWidth || DEFAULT_TOOLTIP_WIDTH;
    const tooltipHeight = options.tooltipHeight || DEFAULT_TOOLTIP_HEIGHT;
    const gap = options.gap || TOOLTIP_GAP;
    const padding = options.padding || VIEWPORT_PADDING;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate available space in each direction
    const spaceTop = triggerRect.top - gap;
    const spaceBottom = viewportHeight - triggerRect.bottom - gap;
    const spaceLeft = triggerRect.left - gap;
    const spaceRight = viewportWidth - triggerRect.right - gap;

    let placement: TooltipPlacement = "bottom";
    let alignment: TooltipAlignment = "center";

    // Determine best vertical placement
    if (spaceBottom >= tooltipHeight + padding) {
      placement = "bottom";
    } else if (spaceTop >= tooltipHeight + padding) {
      placement = "top";
    } else if (spaceRight >= tooltipWidth + padding) {
      placement = "right";
    } else if (spaceLeft >= tooltipWidth + padding) {
      placement = "left";
    } else {
      // Fallback: use the direction with most space
      if (spaceBottom > spaceTop) {
        placement = "bottom";
      } else {
        placement = "top";
      }
    }

    // Calculate tooltip position based on placement
    const style: Record<string, string> = {
      pointerEvents: "none",
      position: "absolute",
      zIndex: "20"
    };

    switch (placement) {
      case "top":
        style.bottom = `calc(100% + ${gap}px)`;
        style.left = "50%";
        style.transform = "translateX(-50%)";
        break;
      case "bottom":
        style.top = `calc(100% + ${gap}px)`;
        style.left = "50%";
        style.transform = "translateX(-50%)";
        break;
      case "left":
        style.right = `calc(100% + ${gap}px)`;
        style.top = "50%";
        style.transform = "translateY(-50%)";
        break;
      case "right":
        style.left = `calc(100% + ${gap}px)`;
        style.top = "50%";
        style.transform = "translateY(-50%)";
        break;
    }

    // Ensure tooltip stays within viewport bounds
    if (placement === "top" || placement === "bottom") {
      const maxWidth = Math.min(tooltipWidth, viewportWidth - padding * 2);
      style.maxWidth = `${maxWidth}px`;
    } else {
      style.maxHeight = `${Math.min(tooltipHeight, viewportHeight - padding * 2)}px`;
    }

    position.value = {
      placement,
      alignment,
      style
    };
  };

  // Recompute on window resize
  const handleResize = () => {
    computePosition();
  };

  watch(
    () => options.triggerElement,
    () => {
      if (typeof window !== "undefined") {
        computePosition();
        window.addEventListener("resize", handleResize);
        return () => {
          window.removeEventListener("resize", handleResize);
        };
      }
    }
  );

  return {
    position: computed(() => position.value),
    recompute: computePosition
  };
}
