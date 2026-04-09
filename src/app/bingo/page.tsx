import { Suspense } from "react";
import BingoPageClient from "./BingoPageClient";

export default function BingoPage() {
  return (
    <Suspense fallback={null}>
      <BingoPageClient key="bingo-4x4" />
    </Suspense>
  );
}
