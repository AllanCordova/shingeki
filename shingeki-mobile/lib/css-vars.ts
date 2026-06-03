import { vars } from "nativewind";

const tokens: Record<string, string> = {
  background: "10 10 10",
  foreground: "250 250 250",
  surface: "17 17 19",
  "surface-muted": "28 28 31",
  border: "39 39 42",
  input: "63 63 70",
  ring: "250 250 250",
  primary: "250 250 250",
  "primary-foreground": "10 10 10",
  "primary-hover": "228 228 231",
  "muted-foreground": "161 161 170",
  danger: "239 68 68",
  "danger-foreground": "250 250 250",
  "danger-surface": "31 19 21",
  success: "34 197 94",
  "success-foreground": "4 33 15",
  "success-surface": "12 31 20",
  warning: "245 158 11",
  "warning-surface": "32 24 3",
};

export const appRootVars = vars(
  Object.fromEntries(
    Object.entries(tokens).map(([key, value]) => [`--${key}`, value]),
  ),
);

export const appBackgroundColor = "rgb(10, 10, 10)";
export const appForegroundColor = "rgb(250, 250, 250)";
export const appPrimaryForegroundColor = "rgb(10, 10, 10)";
export const appMutedForegroundColor = "rgb(161, 161, 170)";

export const stackContentStyle = {
  flex: 1,
  backgroundColor: appBackgroundColor,
} as const;
