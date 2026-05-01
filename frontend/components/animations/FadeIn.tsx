"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  y?: number;
  whenInView?: boolean;
  viewportOnce?: boolean;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.45,
  y = 8,
  whenInView = false,
  viewportOnce = true,
}: FadeInProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={whenInView ? undefined : { opacity: 1, y: 0 }}
      whileInView={whenInView ? { opacity: 1, y: 0 } : undefined}
      viewport={
        whenInView ? { once: viewportOnce, margin: "-48px" } : undefined
      }
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] as const }}
    >
      {children}
    </motion.div>
  );
}
