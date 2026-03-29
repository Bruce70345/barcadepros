type TurnstileVerifyResult = {
  success: boolean;
  "error-codes"?: string[];
};

const isDev = process.env.NODE_ENV !== "production";

export async function verifyTurnstile(token?: string) {
  if (isDev) {
    return { success: true } as TurnstileVerifyResult;
  }

  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  if (!secret) {
    return { success: false, "error-codes": ["missing-secret"] };
  }

  if (!token) {
    return { success: false, "error-codes": ["missing-input-response"] };
  }

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      secret,
      response: token,
    }).toString(),
  });

  if (!res.ok) {
    return { success: false, "error-codes": ["verify-failed"] };
  }

  return (await res.json()) as TurnstileVerifyResult;
}

export async function requireTurnstile(token?: string) {
  const result = await verifyTurnstile(token);
  if (!result.success) {
    const codes = result["error-codes"] || [];
    return Response.json(
      { message: "turnstile_failed", codes },
      { status: 403 }
    );
  }
  return null;
}
