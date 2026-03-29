"use client";

import { useEffect } from "react";
import { useModalContext } from "@/components/modalContext";

type ModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  actionLabel?: string;
};

export default function Modal({
  open,
  title,
  description,
  onClose,
  actionLabel = "Close",
}: ModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl">
        {title && <h3 className="text-base font-semibold">{title}</h3>}
        {description && (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {description}
          </p>
        )}
        <button
          type="button"
          className="mt-5 w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--background)]"
          onClick={onClose}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
