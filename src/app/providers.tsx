"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalProvider } from "@/components/modalContext";
import { GlobalProvider } from "@/components/globalContext";

const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalProvider>
        <ModalProvider>{children}</ModalProvider>
      </GlobalProvider>
    </QueryClientProvider>
  );
};

export default Providers;
