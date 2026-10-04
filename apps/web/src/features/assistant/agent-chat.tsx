'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from 'react';

import type { Messages } from '@miluca/i18n';

import { focusRing, primaryButton, textButton, textField } from '@/components/ui-classes';

import { sendToAgent, undoAgentAction, type AgentReply } from './agent-actions';
import type { AgentAction } from './agent/entities';
import type { AgentMessage } from './agent/run';

export type AgentChatText = Messages['assistant']['agent'];

type ReceiptState = 'saved' | 'undoing' | 'undone' | 'failed';

type Entry =
  | {
      readonly id: number;
      readonly kind: 'advisor' | 'assistant' | 'notice';
      readonly text: string;
    }
  | {
      readonly id: number;
      readonly kind: 'action';
      readonly action: AgentAction;
      readonly state: ReceiptState;
    };

/** `Omit` que respeta cada variante de la unión. */
type NewEntry = Entry extends infer Variant
  ? Variant extends Entry
    ? Omit<Variant, 'id'>
    : never
  : never;

const chatIcon = (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    aria-hidden="true"
    className="size-5 shrink-0"
  >
    <path
      d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 0 1 2.5 12.5V6A1.5 1.5 0 0 1 4 4.5Z"
      strokeLinejoin="round"
    />
    <path d="M6.5 8.25h7M6.5 10.75h4.5" strokeLinecap="round" />
  </svg>
);

const closeIcon = (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    aria-hidden="true"
    className="size-5"
  >
    <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
  </svg>
);

/** Una cosa guardada por el agente: qué quedó, dónde verla y cómo deshacerla. */
function Receipt({
  text,
  action,
  state,
  onView,
  onUndo,
}: {
  text: AgentChatText;
  action: AgentAction;
  state: ReceiptState;
  onView: () => void;
  onUndo: () => void;
}) {
  const undone = state === 'undone';
  return (
    <li
      className={`flex flex-col gap-1 border-l-4 py-1 pl-3 ${undone ? 'border-border' : 'border-status-ok'}`}
    >
      <span className="text-sm font-medium">
        {undone ? text.undone : action.op === 'create' ? text.saved : text.updatedLabel}
      </span>
      <span className={`text-sm wrap-anywhere ${undone ? 'text-text-muted line-through' : ''}`}>
        {action.summary}
      </span>
      {state === 'failed' ? (
        <span role="alert" className="text-sm text-status-alert">
          {text.undoFailed}
        </span>
      ) : null}
      {undone ? null : (
        <span className="-ml-3 flex flex-wrap">
          <Link
            href={action.href}
            onClick={onView}
            className={`${textButton} inline-flex items-center`}
          >
            {text.view}
          </Link>
          <button
            type="button"
            onClick={onUndo}
            disabled={state === 'undoing'}
            className={`${textButton} disabled:opacity-70`}
          >
            {state === 'undoing' ? text.undoing : text.undo}
          </button>
        </span>
      )}
    </li>
  );
}

/**
 * Agente de captura del asesor (ADR 0017): un botón flotante abre el chat; el asesor escribe lo que
 * cuenta el cliente y el agente lo anota en el plan. Vive en el layout del caso, así que la
 * conversación sigue mientras el asesor se mueve entre las pantallas del cliente; no se guarda en
 * ningún otro lado.
 */
export function AgentChat({ clientId, text }: { clientId: string; text: AgentChatText }) {
  const router = useRouter();
  const pathname = usePathname();
  // En el celular el botón va justo encima de la barra de acciones fija de la pantalla
  // (ScreenActions), para no tapar la acción principal. Su alto cambia con cada pantalla y con su
  // contenido; se pasa por una variable de CSS, sin volver a pintar el componente.
  const liftRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const holder = liftRef.current;
    const bar = document.querySelector<HTMLElement>('[data-screen-actions]');
    if (!holder) return;
    if (!bar) {
      holder.style.removeProperty('--agent-lift');
      return;
    }
    const update = () =>
      holder.style.setProperty(
        '--agent-lift',
        `calc(${bar.getBoundingClientRect().height}px + 0.75rem)`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [pathname]);
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [history, setHistory] = useState<readonly AgentMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [emptyError, setEmptyError] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [pending, startTransition] = useTransition();
  const nextId = useRef(0);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const inputId = useId();

  const add = (...items: readonly NewEntry[]) =>
    setEntries((current) => [
      ...current,
      ...items.map((item) => ({ ...item, id: nextId.current++ }) as Entry),
    ]);

  // Al abrir, el foco va al campo; al cerrar, vuelve al botón que abrió el panel.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      launcherRef.current?.focus();
    }
  }, [open]);

  // Escape cierra el panel cuando el foco está dentro (o en ninguna parte).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      const focus = document.activeElement;
      if (
        event.key === 'Escape' &&
        (focus === document.body || panelRef.current?.contains(focus))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries.length, pending]);

  const close = () => setOpen(false);

  const send = () => {
    const message = draft.trim();
    if (pending) return;
    if (!message) {
      setEmptyError(true);
      inputRef.current?.focus();
      return;
    }
    setEmptyError(false);
    add({ kind: 'advisor', text: message });
    setDraft('');
    startTransition(async () => {
      let reply: AgentReply;
      try {
        reply = await sendToAgent(clientId, history, message);
      } catch {
        reply = { ok: false, error: 'failed' };
      }
      if (!reply.ok) {
        add({ kind: 'notice', text: text.errors[reply.error] });
        return;
      }
      setHistory(reply.history);
      add(
        ...reply.events.map((event) =>
          event.type === 'text'
            ? { kind: 'assistant' as const, text: event.text }
            : { kind: 'action' as const, action: event.action, state: 'saved' as const },
        ),
      );
      if (reply.warning) {
        add({
          kind: 'notice',
          text: reply.warning === 'refused' ? text.errors.refused : text.errors.truncated,
        });
      }
      if (reply.events.some((event) => event.type === 'action')) router.refresh();
    });
  };

  const setReceipt = (id: number, state: ReceiptState) =>
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id && entry.kind === 'action' ? { ...entry, state } : entry,
      ),
    );

  const undo = (id: number, action: AgentAction) => {
    setReceipt(id, 'undoing');
    startTransition(async () => {
      let done = false;
      try {
        done = await undoAgentAction(clientId, action);
      } catch {
        done = false;
      }
      setReceipt(id, done ? 'undone' : 'failed');
      // El botón de deshacer ya no está: el foco vuelve al campo para seguir escribiendo.
      inputRef.current?.focus();
      if (done) router.refresh();
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  const restart = () => {
    setEntries([]);
    setHistory([]);
    setConfirmRestart(false);
    inputRef.current?.focus();
  };

  // En el celular el panel cubre la pantalla; al ir a "Ver" se cierra para mostrar la pantalla.
  const viewed = () => {
    if (window.matchMedia('(max-width: 47.99rem)').matches) setOpen(false);
  };

  return (
    <>
      <div ref={liftRef} className="contents">
        {open ? null : (
          <button
            ref={launcherRef}
            type="button"
            aria-label={text.openLabel}
            aria-expanded={false}
            aria-controls={panelId}
            onClick={() => setOpen(true)}
            className={`fixed right-4 bottom-[var(--agent-lift,max(1rem,env(safe-area-inset-bottom)))] z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-5 font-medium text-on-primary shadow-md transition-colors hover:bg-primary/90 active:bg-primary/80 md:right-6 md:bottom-6 ${focusRing}`}
          >
            {chatIcon}
            {text.open}
          </button>
        )}
      </div>

      {open ? (
        <section
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex flex-col bg-bg pt-[env(safe-area-inset-top)] md:inset-auto md:right-6 md:bottom-6 md:h-[min(42rem,calc(100dvh-3rem))] md:w-[26rem] md:rounded-xl md:border md:border-border md:pt-0 md:shadow-lg"
        >
          <header className="flex items-center gap-2 border-b border-border px-4 py-2">
            <h2 id={titleId} className="flex-1 font-semibold">
              {text.title}
            </h2>
            {entries.length > 0 && !confirmRestart ? (
              <button
                type="button"
                onClick={() => setConfirmRestart(true)}
                disabled={pending}
                className={`${textButton} disabled:opacity-70`}
              >
                {text.newChat}
              </button>
            ) : null}
            {confirmRestart ? (
              <span className="flex items-center">
                <button type="button" onClick={restart} className={textButton}>
                  {text.newChatConfirm}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmRestart(false)}
                  className={textButton}
                >
                  {text.cancel}
                </button>
              </span>
            ) : null}
            <button
              type="button"
              onClick={close}
              aria-label={text.close}
              className={`inline-flex size-12 items-center justify-center rounded-xl hover:bg-surface ${focusRing}`}
            >
              {closeIcon}
            </button>
          </header>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-busy={pending}
            className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {entries.length === 0 ? <p className="text-sm text-text-muted">{text.intro}</p> : null}
            <ul className="flex flex-col gap-4">
              {entries.map((entry) => {
                if (entry.kind === 'action') {
                  return (
                    <Receipt
                      key={entry.id}
                      text={text}
                      action={entry.action}
                      state={entry.state}
                      onView={viewed}
                      onUndo={() => undo(entry.id, entry.action)}
                    />
                  );
                }
                if (entry.kind === 'advisor') {
                  return (
                    <li key={entry.id} className="ml-8 self-end rounded-xl bg-surface px-3 py-2">
                      <span className="sr-only">{text.you}: </span>
                      <span className="whitespace-pre-line wrap-anywhere">{entry.text}</span>
                    </li>
                  );
                }
                return (
                  <li
                    key={entry.id}
                    className={`whitespace-pre-line wrap-anywhere ${entry.kind === 'notice' ? 'text-status-alert' : ''}`}
                    {...(entry.kind === 'notice' ? { role: 'alert' } : {})}
                  >
                    <span className="sr-only">{text.assistant}: </span>
                    {entry.text}
                  </li>
                );
              })}
            </ul>
            {pending ? <p className="text-sm text-text-muted">{text.sending}</p> : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="flex flex-col gap-2 border-t border-border px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <label htmlFor={inputId} className="text-sm font-medium">
              {text.message}
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              name="message"
              rows={3}
              autoComplete="off"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (emptyError) setEmptyError(false);
              }}
              onKeyDown={onKeyDown}
              placeholder={text.placeholder}
              aria-invalid={emptyError}
              aria-describedby={`${inputId}-hint ${inputId}-error`}
              className={`${textField} min-h-24 resize-none py-3`}
            />
            <p id={`${inputId}-error`} aria-live="polite" className="text-sm text-status-alert">
              {emptyError ? text.errors.emptyMessage : null}
            </p>
            <div className="flex items-center justify-between gap-3">
              <p id={`${inputId}-hint`} className="hidden text-xs text-text-muted md:block">
                {text.sendHint}
              </p>
              <button type="submit" disabled={pending} className={`ml-auto ${primaryButton}`}>
                {pending ? text.sending : text.send}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
