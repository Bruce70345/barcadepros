export function validateLength(value: string, max: number) {
  return value.length <= max;
}

export function validateIsoDate(value: string) {
  const t = Date.parse(value);
  if (Number.isNaN(t)) return false;
  // Basic ISO format check (must contain 'T')
  return value.includes("T");
}

export function requireLength(value: string, max: number, field: string) {
  if (!validateLength(value, max)) {
    return Response.json(
      { message: `${field} is too long`, max },
      { status: 400 }
    );
  }
  return null;
}

export function requireIsoDate(value: string, field: string) {
  if (!validateIsoDate(value)) {
    return Response.json(
      { message: `${field} must be ISO datetime` },
      { status: 400 }
    );
  }
  return null;
}
