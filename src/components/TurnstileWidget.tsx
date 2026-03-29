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
  className?: string;
  size?: TurnstileOptions["size"];
  theme?: TurnstileOptions["theme"];
  appearance?: TurnstileOptions["appearance"];
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: TurnstileOptions & { callback: (token: string) => void; "error-callback"?: () => void; "expired-callback"?: () => void; }) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const isDev = process.env.NODE_ENV !== "production";

export default function TurnstileWidget({
  siteKey,
  onVerify,
  onError,
  onExpire,
  className,
  size = "normal",
  theme = "auto",
  appearance = "always",
}: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (isDev) {
      onVerify("dev-turnstile-token");
      return;
    }

    const key = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!key) {
      console.error("Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY");
      return;
    }

    if (!ref.current || !window.turnstile) {
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

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, onVerify, onError, onExpire, size, theme, appearance]);

  return <div className={className} ref={ref} />;
}
