import { Suspense } from "react";
import MainPageClient from "./MainPageClient";

export default function MainPage() {
  return (
    <Suspense fallback={null}>
      <MainPageClient />
    </Suspense>
  );
}
