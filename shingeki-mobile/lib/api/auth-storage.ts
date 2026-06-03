import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "shingeki_token";

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return;
  }
}

export async function hasToken(): Promise<boolean> {
  const token = await getToken();
  return Boolean(token);
}
