import { Suspense } from "react";
import JoinPageClient from "./JoinPageClient";

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinPageClient />
    </Suspense>
  );
}
