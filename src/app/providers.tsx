"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalProvider } from "@/components/modalContext";
import { GlobalProvider } from "@/components/globalContext";
import { TurnstileProvider } from "@/components/turnstileContext";

const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalProvider>
        <TurnstileProvider>
          <ModalProvider>{children}</ModalProvider>
        </TurnstileProvider>
      </GlobalProvider>
    </QueryClientProvider>
  );
};

export default Providers;
