'use client';

import { useActionState, useEffect, useId, useRef, useState } from 'react';

import type { Messages } from '@miluca/i18n';

import { primaryButton, secondaryButton, textField } from '@/components/ui-classes';

import type { InviteState, RevokeState } from './advisor-actions';
import { EMAIL_MAX } from './validation';

type InviteText = Messages['clientProfile']['invite'];

/**
 * P-A03, bloque de invitación: crear el enlace, copiarlo y anularlo. Mientras no haya correos
 * (Resend), el asesor envía el enlace por el medio que use con la persona.
 */
export function InvitationPanel({
  text,
  openInvitation,
  createAction,
  revokeAction,
}: {
  text: InviteText;
  /** Invitación abierta ya descrita ("Invitación abierta para… Vence el…"), o null si no hay. */
  openInvitation: {
    /** Vencimiento en ISO: distingue una invitación de la siguiente. */
    readonly expiresAt: string;
    readonly description: string;
    readonly email: string | null;
  } | null;
  createAction: (previous: InviteState | null, formData: FormData) => Promise<InviteState>;
  revokeAction: (previous: RevokeState | null) => Promise<RevokeState>;
}) {
  const [state, formAction, pending] = useActionState(createAction, null);
  const [revokeState, revokeFormAction, revoking] = useActionState(revokeAction, null);
  // Resultado de copiar, atado al enlace copiado: con un enlace nuevo deja de mostrarse solo.
  const [copied, setCopied] = useState<{ link: string; ok: boolean } | null>(null);
  // Anular pide confirmación. Se guarda qué invitación se iba a anular: con otra, la pregunta no sigue.
  const [confirmingFor, setConfirmingFor] = useState<string | null>(null);
  const confirming = openInvitation !== null && confirmingFor === openInvitation.expiresAt;
  const emailId = useId();
  const emailHintId = useId();
  const emailErrorId = useId();
  const linkId = useId();
  const linkHintId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const revokeRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // El enlace se muestra solo mientras su invitación siga abierta (la página se vuelve a pedir al
  // crear o anular, y `openInvitation` llega actualizado del servidor).
  const link = openInvitation ? (state?.link ?? null) : null;
  const emailError =
    state?.error === 'missingEmail' || state?.error === 'invalidEmail' ? state.error : null;
  const formError =
    state?.error === 'notAllowed' || state?.error === 'unavailable' ? state.error : null;

  // Tras crear el enlace, el foco va al enlace para copiarlo; tras un error, al correo.
  useEffect(() => {
    if (!state) return;
    if (state.link) linkRef.current?.focus();
    else if (state.error === 'missingEmail' || state.error === 'invalidEmail')
      emailRef.current?.focus();
  }, [state]);

  // Tras anular, el botón desaparece: el foco va al correo, desde donde se crea otro enlace.
  useEffect(() => {
    if (revokeState?.revoked) emailRef.current?.focus();
  }, [revokeState]);

  // Al abrir la pregunta, el foco va a confirmar; al cancelar, vuelve a "Anular invitación".
  const returnFocusRef = useRef(false);
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (returnFocusRef.current) revokeRef.current?.focus();
    returnFocusRef.current = false;
  }, [confirming]);

  function cancelRevoke() {
    returnFocusRef.current = true;
    setConfirmingFor(null);
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied({ link, ok: true });
    } catch {
      linkRef.current?.select();
      setCopied({ link, ok: false });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {openInvitation ? <p className="wrap-anywhere">{openInvitation.description}</p> : null}

      {link ? (
        <div className="flex flex-col gap-2 rounded-xl border border-primary p-3">
          <label htmlFor={linkId} className="font-medium">
            {text.link}
          </label>
          <p id={linkHintId} className="text-sm text-text-muted">
            {text.linkHint}
          </p>
          <input
            ref={linkRef}
            id={linkId}
            type="text"
            readOnly
            value={link}
            onFocus={(event) => event.currentTarget.select()}
            aria-describedby={linkHintId}
            translate="no"
            spellCheck={false}
            className={`${textField} text-sm`}
          />
          <button type="button" onClick={copyLink} className={primaryButton}>
            {text.copy}
          </button>
          <p aria-live="polite" className="text-sm">
            {copied?.link === link ? (copied.ok ? text.copied : text.copyFailed) : null}
          </p>
        </div>
      ) : null}

      <form action={formAction} noValidate className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={emailId} className="font-medium">
            {text.email}
          </label>
          <p id={emailHintId} className="text-sm text-text-muted">
            {text.emailHint}
          </p>
          <input
            ref={emailRef}
            id={emailId}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={EMAIL_MAX}
            required
            defaultValue={state?.email ?? openInvitation?.email ?? ''}
            aria-invalid={emailError ? true : false}
            aria-describedby={`${emailHintId} ${emailErrorId}`}
            className={textField}
          />
          {/* Siempre presente y vacía hasta que haya un error: así los lectores de pantalla lo anuncian. */}
          <p id={emailErrorId} aria-live="polite" className="text-sm text-status-alert">
            {emailError ? text.errors[emailError] : null}
          </p>
        </div>
        {formError ? (
          <p role="alert" className="text-sm text-status-alert">
            {text.errors[formError]}
          </p>
        ) : null}
        {openInvitation ? <p className="text-sm text-text-muted">{text.replaceHint}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className={openInvitation ? secondaryButton : primaryButton}
        >
          {pending ? text.creating : openInvitation ? text.createAnother : text.create}
        </button>
      </form>

      {openInvitation && confirming ? (
        <form
          action={revokeFormAction}
          className="flex flex-col gap-3 rounded-xl border border-status-alert p-3"
        >
          <p>{text.revokeConfirm}</p>
          <button
            ref={confirmRef}
            type="submit"
            disabled={revoking}
            className={`w-full ${secondaryButton}`}
          >
            {revoking ? text.revoking : text.revokeConfirmYes}
          </button>
          <button type="button" onClick={cancelRevoke} className={`w-full ${secondaryButton}`}>
            {text.revokeCancel}
          </button>
        </form>
      ) : null}
      {openInvitation && !confirming ? (
        <button
          ref={revokeRef}
          type="button"
          onClick={() => setConfirmingFor(openInvitation.expiresAt)}
          className={`w-full ${secondaryButton}`}
        >
          {text.revoke}
        </button>
      ) : null}
      <p aria-live="polite" className="text-sm">
        {revokeState?.error
          ? text.revokeFailed
          : revokeState?.revoked && !openInvitation
            ? text.revoked
            : null}
      </p>
    </div>
  );
}
