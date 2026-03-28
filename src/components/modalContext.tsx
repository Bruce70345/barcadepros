import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ModalContextType = {
  openCount: number;
  openModal: () => void;
  closeModal: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx)
    throw new Error("useModalContext must be used within ModalProvider");
  return ctx;
};

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [openCount, setOpenCount] = useState(0);

  const openModal = useCallback(() => setOpenCount((c) => c + 1), []);
  const closeModal = useCallback(
    () => setOpenCount((c) => Math.max(0, c - 1)),
    []
  );

  useEffect(() => {
    console.log("openCount", openCount);
    if (openCount > 0) {
      console.log("open modal");
      document.body.style.overflow = "hidden";
      // document.body.style.position = "fixed";
    } else {
      console.log("close modal");
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [openCount]);

  return (
    <ModalContext.Provider value={{ openCount, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};
