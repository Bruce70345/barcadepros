"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalProvider } from "@/components/modalContext";

const queryClient = new QueryClient();

const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ModalProvider>{children}</ModalProvider>
    </QueryClientProvider>
  );
};

export default Providers;
