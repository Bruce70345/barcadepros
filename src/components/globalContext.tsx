"use client";

import { Spinner } from "@/components/ui/spinner";
import {
  FC,
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

// 載入狀態管理
export const useLoadingDrop = () => {
  const [loadingConfig, setLoadingConfig] = useState({
    isLoading: false,
    loadingText: "Loading...",
  });

  const loadingStart = useCallback(({ loadingText = "Loading..." } = {}) => {
    setLoadingConfig({
      isLoading: true,
      loadingText,
    });
  }, []);

  const loadingEnd = useCallback(() => {
    setLoadingConfig({
      isLoading: false,
      loadingText: "Loading...",
    });
  }, []);

  return useMemo(
    () => ({ loadingConfig, loadingStart, loadingEnd }),
    [loadingConfig, loadingStart, loadingEnd],
  );
};

// 載入組件（使用 shadcn/ui Spinner）
export const LoadingDrop: FC<{ isLoading: boolean; loadingText: string }> = ({
  isLoading,
  loadingText,
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[11000]">
      <div className="flex flex-col items-center space-y-4 bg-card p-8 rounded-xl shadow-lg border border-border">
        <Spinner size="lg" className="text-pamex" />
        <div className="text-lg font-medium text-foreground">{loadingText}</div>
      </div>
    </div>
  );
};

// 提示訊息管理
export const useAlertToast = () => {
  const [toastField, setToastField] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
    autoHideDuration: 3000,
  });

  const showToast = (
    message: string,
    severity: "info" | "success" | "warning" | "error" = "info",
    autoHideDuration: number = 3000
  ) => {
    console.log(`[Toast ${severity.toUpperCase()}]: ${message}`);
    setToastField({
      open: true,
      message,
      severity,
      autoHideDuration,
    });
  };

  const hideToast = () => {
    setToastField((prev) => ({ ...prev, open: false }));
  };

  return { toastField, showToast, hideToast };
};

// 提示組件（使用 shadcn/ui 風格）
export const AlertToast: FC<{
  open: boolean;
  message: string;
  severity: "info" | "success" | "warning" | "error";
  autoHideDuration: number;
  onClose?: () => void;
}> = ({ open, message, severity, autoHideDuration, onClose }) => {
  // 🔧 新增自動關閉功能
  useEffect(() => {
    if (open && autoHideDuration > 0 && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [open, autoHideDuration, onClose]);
  if (!open) return null;

  const severityStyles = {
    info: {
      backgroundColor:
        "color-mix(in oklab, var(--accent) 12%, var(--surface))",
      borderColor: "var(--accent)",
      color: "var(--text-primary)",
    },
    success: {
      backgroundColor:
        "color-mix(in oklab, var(--success) 12%, var(--surface))",
      borderColor: "var(--success)",
      color: "var(--text-primary)",
    },
    warning: {
      backgroundColor:
        "color-mix(in oklab, var(--highlight) 12%, var(--surface))",
      borderColor: "var(--highlight)",
      color: "var(--text-primary)",
    },
    error: {
      backgroundColor:
        "color-mix(in oklab, var(--danger) 12%, var(--surface))",
      borderColor: "var(--danger)",
      color: "var(--text-primary)",
    },
  };

  return (
    <div className="fixed bottom-4 right-4 z-[10500]">
      <div
        className="rounded-lg border-l-4 p-4 shadow-lg"
        style={severityStyles[severity]}
      >
        <div className="flex items-center justify-between">
          <span>{message}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// 確認對話框管理 (使用 count 控制顯示)
export const useConfirmDialog = () => {
  const [confirmField, setConfirmField] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    onCancel: () => {},
    onConfirmWithCheckbox: undefined as ((checked: boolean) => void) | undefined,
    checkboxLabel: "",
    checkboxDefault: false,
    count: 0, // 🆕 添加 count 控制
  });

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => {
    console.log(
      "🔔 [GlobalContext] showConfirm called, current count:",
      confirmField.count
    );

    setConfirmField((prev) => {
      const newCount = prev.count + 1;
      console.log("🔔 [GlobalContext] Incrementing count to:", newCount);

      return {
        isOpen: newCount > 0, // count > 0 就顯示
        title,
        message,
        onConfirm: () => {
          onConfirm();
          decrementCount();
        },
        onCancel: () => {
          if (onCancel) {
            onCancel();
          }
          decrementCount();
        },
        onConfirmWithCheckbox: undefined,
        checkboxLabel: "",
        checkboxDefault: false,
        count: newCount,
      };
    });
  };

  const showConfirmWithCheckbox = (
    title: string,
    message: string,
    checkboxLabel: string,
    onConfirm: (checked: boolean) => void,
    onCancel?: () => void,
    checkboxDefault = false
  ) => {
    setConfirmField((prev) => {
      const newCount = prev.count + 1;
      return {
        isOpen: newCount > 0,
        title,
        message,
        onConfirm: () => {},
        onConfirmWithCheckbox: (checked: boolean) => {
          onConfirm(checked);
          decrementCount();
        },
        onCancel: () => {
          if (onCancel) {
            onCancel();
          }
          decrementCount();
        },
        checkboxLabel,
        checkboxDefault,
        count: newCount,
      };
    });
  };

  const decrementCount = () => {
    setConfirmField((prev) => {
      const newCount = Math.max(0, prev.count - 1);
      console.log("🔻 [GlobalContext] Decrementing count to:", newCount);

      return {
        ...prev,
        isOpen: newCount > 0, // count = 0 就關閉
        count: newCount,
      };
    });
  };

  const hideConfirm = () => {
    console.log("🔒 [GlobalContext] hideConfirm called, resetting count to 0");
    setConfirmField((prev) => ({
      ...prev,
      isOpen: false,
      count: 0, // 強制重置 count
    }));
  };

  return {
    confirmField,
    showConfirm,
    showConfirmWithCheckbox,
    hideConfirm,
    decrementCount,
  };
};

// 確認對話框組件（使用 count 控制顯示）
const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export const ConfirmDialog: FC<{
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onConfirmWithCheckbox?: (checked: boolean) => void;
  onCancel: () => void;
  checkboxLabel?: string;
  checkboxDefault?: boolean;
  count?: number; // 🆕 添加 count 屬性用於調試
}> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onConfirmWithCheckbox,
  onCancel,
  checkboxLabel,
  checkboxDefault,
  count,
}) => {
  const isClient = useIsClient();
  const [checkboxValue, setCheckboxValue] = useState(Boolean(checkboxDefault));

  // console.log("🎭 [ConfirmDialog] Render - isOpen:", isOpen, "count:", count);

  if (!isOpen || !isClient) {
    // console.log(
    //   "🎭 [ConfirmDialog] Not rendering because isOpen is false or not mounted"
    // );
    return null;
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onConfirmWithCheckbox) {
      onConfirmWithCheckbox(checkboxValue);
      return;
    }
    onConfirm();
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // console.log("🎭 [ConfirmDialog] Cancel button clicked");
    onCancel();
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[10100] flex items-center justify-center bg-black/60"
      onClick={(e) => {
        e.stopPropagation();
      }}
      onPointerDownCapture={(e) => {
        e.stopPropagation();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
      }}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDownCapture={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        {/* 對話框標題 */}
        <div className="mb-3">
          <div className="mb-2 h-1.5 w-12 rounded-full bg-[color-mix(in oklab, var(--primary) 55%, transparent)]" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h3>
        </div>
        {/* 確認訊息 */}
        <p className="mb-4 max-w-full break-words overflow-wrap-anywhere whitespace-pre-line text-sm text-[var(--text-secondary)]">
          {message}
        </p>
        {checkboxLabel && (
          <label className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-sm text-[var(--text-primary)]">
            <span>{checkboxLabel}</span>
            <input
              type="checkbox"
              checked={checkboxValue}
              onChange={(event) => setCheckboxValue(event.target.checked)}
              className="h-5 w-5 accent-[var(--primary)]"
            />
          </label>
        )}
        {/* 操作按鈕組 */}
        <div className="flex gap-3 justify-end">
          {/* 取消按鈕 */}
          <button
            className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[color-mix(in oklab, var(--surface-2) 80%, var(--surface))]"
            onClick={handleCancel}
          >
            Cancel
          </button>
          {/* 確認按鈕 */}
          <button
            className="rounded-full border border-[color-mix(in oklab, var(--danger) 40%, var(--border))] bg-[color-mix(in oklab, var(--danger) 20%, var(--surface))] px-4 py-2 text-sm text-[var(--danger)] transition-colors hover:bg-[color-mix(in oklab, var(--danger) 32%, var(--surface))]"
            onClick={handleConfirm}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// 全域狀態介面
interface IGlobalContext {
  SystemToast: ReturnType<typeof useAlertToast>;
  SystemConfirm: ReturnType<typeof useConfirmDialog>;
  SystemLoading: ReturnType<typeof useLoadingDrop>;
}

export const GlobalContext = createContext<IGlobalContext | undefined>(
  undefined
);

interface GlobalProviderProps {
  children: ReactNode;
}

export const GlobalProvider: FC<GlobalProviderProps> = ({ children }) => {
  const isClient = useIsClient();
  const SystemToast = useAlertToast();
  const SystemConfirm = useConfirmDialog();
  const SystemLoading = useLoadingDrop();

  // 🔧 SSR 安全：在服務端提供靜態的默認值
  if (!isClient) {
    const ssrValue: IGlobalContext = {
      SystemToast: {
        toastField: {
          open: false,
          message: "",
          severity: "info" as "info" | "success" | "warning" | "error",
          autoHideDuration: 6000,
        },
        showToast: () => {},
        hideToast: () => {},
      },
      SystemConfirm: {
        confirmField: {
          isOpen: false,
          title: "",
          message: "",
          onConfirm: () => {},
          onCancel: () => {},
          onConfirmWithCheckbox: undefined,
          checkboxLabel: "",
          checkboxDefault: false,
          count: 0,
        },
        showConfirm: () => {},
        showConfirmWithCheckbox: () => {},
        hideConfirm: () => {},
        decrementCount: () => {},
      },
      SystemLoading: {
        loadingConfig: { isLoading: false, loadingText: "Loading..." },
        loadingStart: () => {},
        loadingEnd: () => {},
      },
    };

    return (
      <GlobalContext.Provider value={ssrValue}>
        {children}
      </GlobalContext.Provider>
    );
  }

  return (
    <GlobalContext.Provider
      value={{ SystemToast, SystemConfirm, SystemLoading }}
    >
      <AlertToast {...SystemToast.toastField} onClose={SystemToast.hideToast} />
      <ConfirmDialog
        key={SystemConfirm.confirmField.count}
        {...SystemConfirm.confirmField}
        count={SystemConfirm.confirmField.count}
      />
      <LoadingDrop {...SystemLoading.loadingConfig} />
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = (): IGlobalContext => {
  const context = useContext(GlobalContext);

  // 🔧 SSR 安全：在服務端渲染時提供安全的默認值
  if (typeof window === "undefined") {
    return {
      SystemToast: {
        toastField: {
          open: false,
          message: "",
          severity: "info" as "info" | "success" | "warning" | "error",
          autoHideDuration: 6000,
        },
        showToast: () => {},
        hideToast: () => {},
      },
      SystemConfirm: {
        confirmField: {
          isOpen: false,
          title: "",
          message: "",
          onConfirm: () => {},
          onCancel: () => {},
          onConfirmWithCheckbox: undefined,
          checkboxLabel: "",
          checkboxDefault: false,
          count: 0,
        },
        showConfirm: () => {},
        showConfirmWithCheckbox: () => {},
        hideConfirm: () => {},
        decrementCount: () => {},
      },
      SystemLoading: {
        loadingConfig: { isLoading: false, loadingText: "Loading..." },
        loadingStart: () => {},
        loadingEnd: () => {},
      },
    };
  }

  if (context === undefined) {
    throw new Error("useGlobalContext must be used within a GlobalProvider");
  }

  return context;
};
