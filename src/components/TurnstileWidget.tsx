"use client";

import { useEffect, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  theme?: "light" | "dark" | "auto";
  size?: "normal" | "compact" | "invisible";
  appearance?: "always" | "execute";
  tabindex?: number;
  "refresh-expired"?: "auto" | "manual";
  "refresh-timeout"?: "auto" | "manual";
  "response-field"?: boolean;
  "response-field-name"?: string;
};

type TurnstileWidgetProps = {
  siteKey?: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  onWidgetId?: (id: string) => void;
  className?: string;
  size?: TurnstileOptions["size"];
  theme?: TurnstileOptions["theme"];
  appearance?: TurnstileOptions["appearance"];
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions & { callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void; }) => string;
      reset?: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  onWidgetId,
  className,
  size = "invisible",
  theme = "auto",
  appearance = "always",
}: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isDev = process.env.NODE_ENV !== "production";

  useEffect(() => {
    const testKey = "1x00000000000000000000AA";
    const key =
      siteKey ||
      (isDev ? testKey : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
    if (!key) {
      console.error("Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let warned = false;

    const tryRender = () => {
      if (cancelled || widgetIdRef.current) return;
      if (!ref.current) return;
      if (!window.turnstile) {
        if (!warned) {
          console.warn("Turnstile script not ready yet.");
          warned = true;
        }
        timer = setTimeout(tryRender, 300);
        return;
      }

      const id = window.turnstile.render(ref.current, {
        sitekey: key,
        size,
        theme,
        appearance,
        callback: onVerify,
        "error-callback": onError,
        "expired-callback": onExpire,
      });
      widgetIdRef.current = id;
      onWidgetId?.(id);
    };

    tryRender();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError, onExpire, size, theme, appearance]);

  return <div className={className} ref={ref} />;
}
