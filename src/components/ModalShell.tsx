"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useModalContext } from "@/components/modalContext";

type ModalShellProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function ModalShell({
  open,
  title,
  description,
  onClose,
  children,
}: ModalShellProps) {
  const { openModal, closeModal } = useModalContext();

  useEffect(() => {
    if (open) {
      openModal();
    } else {
      closeModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-5">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm">
        {title && (
          <div className="mb-3">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h3>
            {description && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
