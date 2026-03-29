"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// MVVM: this page is the View. Data and mutations should live in hooks (ViewModel).
export default function MainPage() {
  const router = useRouter();

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");
    if (!userId) {
      router.replace("/join");
    }
  }, [router]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-3xl px-5 py-8">
        {/* App Bar
            - App name
            - Today button / current date
            - Notification status icon
        */}

        {/* Tabs (SPA)
            tab1: Calendar view (monthly) + List view (day)
            tab2: All events
              - filter: only mine
              - default: hide past events
        */}

        {/* Tab1 Content
            - Calendar monthly grid
            - Day list view (events for selected date)
        */}

        {/* Tab2 Content
            - All events list
            - Filter controls (mine only, show past)
        */}

        {/* Floating Add Event Button (bottom)
            - opens Event Editor modal
        */}

        {/* Event Editor Modal
            - Create + Update in one modal
            - fields: title, date/time, category, description, realtime toggle, recurrence
        */}
      </div>
    </main>
  );
}
