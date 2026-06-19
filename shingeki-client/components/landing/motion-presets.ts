export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

export const VIEWPORT_ONCE = { once: true, margin: "-60px" as const };
