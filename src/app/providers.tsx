"use client";

import { ModalProvider } from "@/components/modalContext";

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <ModalProvider>{children}</ModalProvider>;
};

export default Providers;
