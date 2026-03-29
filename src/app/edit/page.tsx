"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function EditPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");
    if (!userId) {
      router.replace("/join");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-md px-5 py-8">
        {/* Settings / Edit Page
            - Event notifications
              - realtime on/off (receive_realtime)
              - digest on/off (receive_digest)
              - quiet hours note (22:00-08:00)
              - digest time note (12:00 Asia/Taipei)

            - Profile
              - update display name

            - Other related settings (all belong here)
        */}
      </div>
    </main>
  );
}
