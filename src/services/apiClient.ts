import { AppDataSourceMode } from "../types";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const MODE_STORAGE_KEY = "finverse_datasource_mode";

class ApiConfig {
  private mode: AppDataSourceMode = "backend";
  private modeListeners: Set<(mode: AppDataSourceMode) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem(MODE_STORAGE_KEY) as AppDataSourceMode | null;
    if (saved === "backend" || saved === "mock") {
      this.mode = saved;
    } else {
      this.mode = "backend";
    }
  }

  public getMode(): AppDataSourceMode {
    return this.mode;
  }

  public setMode(newMode: AppDataSourceMode) {
    this.mode = newMode;
    localStorage.setItem(MODE_STORAGE_KEY, newMode);
    this.modeListeners.forEach((l) => l(newMode));
  }

  public onModeChange(listener: (mode: AppDataSourceMode) => void): () => void {
    this.modeListeners.add(listener);
    return () => this.modeListeners.delete(listener);
  }
}

export const apiConfig = new ApiConfig();

export class ApiError extends Error {
  public status: number;
  public details?: any;
  public code?: string;

  constructor(message: string, status: number, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
    if (typeof details === "object" && details?.code) {
      this.code = details.code;
    }
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes("?") ? "&" : "?") + qs;
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      credentials: "include", // Essential for HttpOnly session cookies
      ...fetchOptions,
      headers,
    });

    if (!res.ok) {
      let errorBody = null;
      try {
        errorBody = await res.json();
      } catch {
        // non-JSON fallback
      }

      let errorMessage = `Request failed with status ${res.status}`;
      if (errorBody) {
        if (typeof errorBody.detail === "string") {
          errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
          // FastAPI 422 validation errors
          errorMessage = errorBody.detail
            .map((err: any) => err.msg || err.message || JSON.stringify(err))
            .join("; ");
        } else if (typeof errorBody.detail === "object" && errorBody.detail?.message) {
          errorMessage = errorBody.detail.message;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      }

      throw new ApiError(errorMessage, res.status, errorBody);
    }

    // 204 No Content
    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      `Could not connect to Finverse backend server at ${API_BASE_URL}. Ensure FastAPI is running or switch to Mock Simulation mode.`,
      0,
      err
    );
  }
}

export const apiClient = {
  get: <T>(url: string, params?: Record<string, any>, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "GET", params }),
  post: <T>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "POST",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "PATCH",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  put: <T>(url: string, data?: any, options?: RequestOptions) =>
    request<T>(url, {
      ...options,
      method: "PUT",
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, { ...options, method: "DELETE" }),
};
