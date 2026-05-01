"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

export type SlideDirection = "up" | "down" | "left" | "right";

const offset = (direction: SlideDirection, distance: number) => {
  switch (direction) {
    case "up":
      return { x: 0, y: distance };
    case "down":
      return { x: 0, y: -distance };
    case "left":
      return { x: distance, y: 0 };
    case "right":
      return { x: -distance, y: 0 };
    default:
      return { x: 0, y: distance };
  }
};

type SlideInProps = {
  children: ReactNode;
  className?: string;
  direction?: SlideDirection;
  distance?: number;
  delay?: number;
  duration?: number;
  whenInView?: boolean;
  viewportOnce?: boolean;
};

export function SlideIn({
  children,
  className,
  direction = "up",
  distance = 24,
  delay = 0,
  duration = 0.5,
  whenInView = false,
  viewportOnce = true,
}: SlideInProps) {
  const reduceMotion = useReducedMotion();
  const from = { opacity: 0, ...offset(direction, distance) };

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={from}
      animate={whenInView ? undefined : { opacity: 1, x: 0, y: 0 }}
      whileInView={whenInView ? { opacity: 1, x: 0, y: 0 } : undefined}
      viewport={whenInView ? { once: viewportOnce, margin: "-64px" } : undefined}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {children}
    </motion.div>
  );
}
