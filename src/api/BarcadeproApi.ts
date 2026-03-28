import { CustomError } from "@/utils/utils";

type DeviceInfo = {
  type?: "phone" | "tablet" | "desktop" | "unknown";
  device?: string;
  os?: string;
  osVersion?: string;
  browser?: string;
  browserVersion?: string;
  version?: string;
  mobile?: string;
};

type PushTokenResponse = {
  id: string;
  token: string;
  platform?: string;
  deviceInfo?: DeviceInfo;
  createdAt?: string;
  updatedAt?: string;
};

const API_BASE = "/api/v1";

async function request<T>(
  path: string,
  options: RequestInit & { apiToken?: string } = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.apiToken) {
    headers.set("Authorization", `Bearer ${options.apiToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new CustomError(res.status, data?.message || res.statusText, data);
  }

  return data as T;
}

async function SendFCMToken(
  token: string,
  platform: string,
  deviceInfo: DeviceInfo,
  apiToken: string
): Promise<PushTokenResponse> {
  return request<PushTokenResponse>("/auth/pushTokens", {
    method: "POST",
    body: JSON.stringify({ token, platform, deviceInfo }),
    apiToken,
  });
}

async function UpdateFCMToken(
  id: string,
  token: string,
  platform: string,
  deviceInfo: DeviceInfo,
  apiToken: string
): Promise<PushTokenResponse> {
  return request<PushTokenResponse>(`/auth/pushTokens/${id}`, {
    method: "PUT",
    body: JSON.stringify({ token, platform, deviceInfo }),
    apiToken,
  });
}

async function DeleteFCMToken(
  id: string,
  apiToken: string
): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/auth/pushTokens/${id}`, {
    method: "DELETE",
    apiToken,
  });
}

const BarcadeproApi = {
  SendFCMToken,
  UpdateFCMToken,
  DeleteFCMToken,
};

export default BarcadeproApi;
