'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './ConfirmDialog.module.css';

interface Request {
  message: string;
  confirmLabel: string;
  resolve: (ok: boolean) => void;
}

// A styled stand-in for window.confirm: same question, the same two outcomes.
// Usage: const [confirm, dialog] = useConfirm(); … if (!(await confirm(q, 'Delete'))) return;
export function useConfirm(): [
  (message: string, confirmLabel: string) => Promise<boolean>,
  ReactNode,
] {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback(
    (message: string, confirmLabel: string) =>
      new Promise<boolean>((resolve) =>
        setRequest({ message, confirmLabel, resolve }),
      ),
    [],
  );

  const settle = useCallback(
    (ok: boolean) => {
      request?.resolve(ok);
      setRequest(null);
    },
    [request],
  );

  return [
    confirm,
    request ? (
      <ConfirmDialog
        message={request.message}
        confirmLabel={request.confirmLabel}
        onSettle={settle}
      />
    ) : null,
  ];
}

function ConfirmDialog({
  message,
  confirmLabel,
  onSettle,
}: {
  message: string;
  confirmLabel: string;
  onSettle: (ok: boolean) => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus starts on Cancel, the safe choice; Esc cancels; Tab stays inside;
  // focus goes back to whatever opened the dialog.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onSettle(false);
      if (event.key === 'Tab') {
        event.preventDefault();
        const next =
          document.activeElement === cancelRef.current
            ? confirmRef.current
            : cancelRef.current;
        next?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onSettle]);

  return createPortal(
    <div className={styles.scrim} onClick={() => onSettle(false)}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-describedby="confirm-message"
        onClick={(event) => event.stopPropagation()}
      >
        <span className={styles.diamond} aria-hidden="true" />
        <p id="confirm-message" className={`serif ${styles.message}`}>
          {message}
        </p>
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancel}
            onClick={() => onSettle(false)}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.confirm}
            onClick={() => onSettle(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
