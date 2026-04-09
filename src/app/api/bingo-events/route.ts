import { getSheetValues } from "@/server/googleSheets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const getHeaderIndex = (headers: string[], name: string) => {
  const target = name.trim().toLowerCase();
  return headers.findIndex((h) => h.trim().toLowerCase() === target);
};

export async function GET() {
  const { headers, rows } = await getSheetValues("bingoEvents");
  const eventIdx = getHeaderIndex(headers, "event");
  if (eventIdx < 0) {
    return Response.json(
      { message: "Missing 'event' column in bingoEvents sheet." },
      { status: 500 },
    );
  }

  const events = rows
    .map((row) => String(row[eventIdx] ?? "").trim())
    .filter(Boolean);

  return Response.json({ events }, { status: 200 });
}

