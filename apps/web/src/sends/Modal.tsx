import { useEffect, useRef, type ReactNode } from "react";

/**
 * A native modal dialog. Escape and the close button call `onClose`; closing
 * returns focus to whatever opened it. The heading gets focus first so its
 * purpose is announced.
 */
export function Modal({
  open,
  onClose,
  titleId,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  className?: string;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      opener.current = document.activeElement as HTMLElement | null;
      element.showModal();
      element.querySelector<HTMLElement>(`#${CSS.escape(titleId)}`)?.focus();
    } else if (!open && element.open) {
      element.close();
      opener.current?.focus();
    }
  }, [open, titleId]);

  return (
    <dialog
      ref={dialog}
      className={`modal ${className ?? ""}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
