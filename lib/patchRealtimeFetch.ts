"use client";

let patched = false;

export function patchRealtimeFetch() {
  if (patched) return;

  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  patched = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;

      if (url.includes("/v1/realtime/calls")) {
        const headers = new Headers(init?.headers || {});

        if (!headers.has("OpenAI-Beta")) {
          headers.set("OpenAI-Beta", "realtime=v1");
        }

        init = { ...(init || {}), headers };
      }

      return originalFetch(input as any, init);
    } catch (e) {
      // на всякий случай не ломаем fetch, если что-то пошло не так
      return originalFetch(input as any, init);
    }
  };
}

