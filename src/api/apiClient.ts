export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return data?.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export async function postJson<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await parseErrorMessage(res);
    throw new ApiError(message, res.status);
  }

  return res.json();
}
