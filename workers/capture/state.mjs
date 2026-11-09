export function originOf(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return url.origin;
  } catch {
    return "";
  }
}

export function mergeSessionStorage(state, origin, items) {
  if (!origin || !Array.isArray(items) || items.length === 0) {
    return state;
  }

  const origins = Array.isArray(state.origins) ? [...state.origins] : [];
  const index = origins.findIndex((row) => row && row.origin === origin);
  const sessionStorage = items.filter(
    (item) =>
      item &&
      typeof item.name === "string" &&
      item.name !== "" &&
      typeof item.value === "string",
  );
  if (sessionStorage.length === 0) {
    return state;
  }

  if (index === -1) {
    origins.push({ origin, localStorage: [], sessionStorage });
  } else {
    origins[index] = { ...origins[index], sessionStorage };
  }

  return { ...state, origins };
}
