"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const container = (stagger: number, delayChildren: number) => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

const item = (y: number) => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
});

type StaggerContainerProps = {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delayChildren?: number;
  whenInView?: boolean;
  viewportOnce?: boolean;
};

export function StaggerContainer({
  children,
  className,
  stagger = 0.06,
  delayChildren = 0,
  whenInView = false,
  viewportOnce = true,
}: StaggerContainerProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={container(stagger, delayChildren)}
      initial="hidden"
      animate={whenInView ? undefined : "show"}
      whileInView={whenInView ? "show" : undefined}
      viewport={
        whenInView ? { once: viewportOnce, margin: "-48px" } : undefined
      }
    >
      {children}
    </motion.div>
  );
}

type StaggerItemProps = {
  children: ReactNode;
  className?: string;
  y?: number;
};

export function StaggerItem({ children, className, y = 10 }: StaggerItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div className={className} variants={item(y)}>
      {children}
    </motion.div>
  );
}
