"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type RevealOptions = {
  delay?: number;
  duration?: number;
  direction?: "up" | "left" | "right" | "none";
  scale?: number;
  once?: boolean;
};

type RevealState = "visible" | "pending" | "hidden";

type RevealSubscription = {
  once: boolean;
  setVisible: (visible: boolean) => void;
};

const ENTER_THRESHOLD = 0.14;
const EXIT_THRESHOLD = 0.04;
const subscribers = new Map<Element, RevealSubscription>();
let observer: IntersectionObserver | null = null;

function observeReveal(element: Element, subscription: RevealSubscription): () => void {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const current = subscribers.get(entry.target);
          if (!current) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= ENTER_THRESHOLD) {
            current.setVisible(true);
            if (current.once) {
              subscribers.delete(entry.target);
              observer?.unobserve(entry.target);
            }
          } else if (!current.once && (!entry.isIntersecting || entry.intersectionRatio <= EXIT_THRESHOLD)) {
            current.setVisible(false);
          }
        }
      },
      {
        threshold: [0, EXIT_THRESHOLD, ENTER_THRESHOLD],
        rootMargin: "-8% 0px -10% 0px",
      },
    );
  }

  subscribers.set(element, subscription);
  observer.observe(element);
  return () => {
    subscribers.delete(element);
    observer?.unobserve(element);
  };
}

export function useScrollReveal({
  delay = 0,
  duration = 650,
  direction = "up",
  scale = 1,
  once = true,
}: RevealOptions = {}) {
  const elementRef = useRef<HTMLElement | null>(null);
  const hasRevealedRef = useRef(false);
  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);
  const [state, setState] = useState<RevealState>("pending");

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      setState("visible");
      return;
    }

    return observeReveal(element, {
      once,
      setVisible(visible) {
        if (visible) {
          hasRevealedRef.current = true;
          setState("visible");
        } else if (hasRevealedRef.current) {
          setState("hidden");
        }
      },
    });
  }, [once]);

  const offset = direction === "left" ? ["-20px", "0px"] : direction === "right" ? ["20px", "0px"] : direction === "up" ? ["0px", "24px"] : ["0px", "0px"];
  const style = {
    "--reveal-x": offset[0],
    "--reveal-y": offset[1],
    "--reveal-scale": scale,
    "--reveal-delay": `${delay}ms`,
    "--reveal-duration": `${duration}ms`,
  } as CSSProperties;

  return {
    ref,
    style,
    "data-scroll-reveal": "",
    "data-reveal-state": state,
  } as const;
}
