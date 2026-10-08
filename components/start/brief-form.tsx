"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { site } from "@/content/site";
import { ui } from "@/content/ui";
import { T } from "@/components/t";
import { FORM_ENDPOINT } from "@/config/switches";
import { notebook } from "@/lib/notebook";

/**
 * /start — upit u 4 koraka (brief §5): vrsta projekta → proizvod ili brend → projekt → ime i e-mail.
 * Forma radi potpuno i bez lutke. Lutka (F8) samo sluša događaje (lib/notebook.ts); tekst iz forme ne odlazi nikamo zbog animacije.
 * Slanje: NEXT_PUBLIC_FORM_ENDPOINT [ODLUKA KRISTIANA]. Bez endpointa forma ne glumi slanje.
 */
type Data = { type: string; product: string; project: string; name: string; email: string };
type Errors = Partial<Record<keyof Data, string>>;
const STEPS = 4;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function BriefForm() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Data>({ type: "", product: "", project: "", name: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<"form" | "sending" | "sent" | "preview" | "error">("form");
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const uid = useId();

  const set = (k: keyof Data) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
    notebook.keystroke(k);
  };

  const validate = useCallback(
    (s: number): Errors => {
      const er: Errors = {};
      if (s === 1 && !data.type) er.type = ui.form.errType;
      if (s === 2 && data.product.trim().length < 2) er.product = ui.form.errProduct;
      if (s === 3 && data.project.trim().length < 3) er.project = ui.form.errProject;
      if (s === 4) {
        if (data.name.trim().length < 2) er.name = ui.form.errName;
        if (!EMAIL.test(data.email.trim())) er.email = ui.form.errEmail;
      }
      return er;
    },
    [data],
  );

  const focusFirst = (er: Errors) => {
    const k = Object.keys(er)[0];
    if (!k) return;
    const el = formRef.current?.querySelector<HTMLElement>(`[name="${k}"]`);
    el?.focus();
    notebook.error(k);
  };

  const next = async () => {
    const er = validate(step);
    setErrors(er);
    if (Object.keys(er).length) return focusFirst(er);
    if (step < STEPS) {
      setStep(step + 1);
      notebook.newField(step + 1);
      return;
    }
    await submit();
  };

  const back = () => {
    if (step > 1) {
      setStep(step - 1);
      notebook.newField(step - 1);
    }
  };

  async function submit() {
    setPhase("sending");
    if (!FORM_ENDPOINT) {
      // Iskreno: forma nije spojena. Lutka napravi révérence, ali ništa nije poslano.
      await notebook.sent();
      setPhase("preview");
      return;
    }
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      await notebook.sent();
      setPhase("sent");
    } catch {
      notebook.error("submit");
      setPhase("error");
    }
  }

  // fokus na naslov koraka nakon promjene (čitači zaslona čuju novi korak)
  useEffect(() => {
    if (step > 1) headingRef.current?.focus();
  }, [step]);

  // pažnja / odlazak: kursor ili fokus u formi
  useEffect(() => {
    const f = formRef.current;
    if (!f) return;
    const enter = () => notebook.attention(true);
    const leave = () => notebook.attention(false);
    f.addEventListener("pointerenter", enter);
    f.addEventListener("pointerleave", leave);
    f.addEventListener("focusin", enter);
    f.addEventListener("focusout", (e) => {
      if (!f.contains(e.relatedTarget as Node)) leave();
    });
    return () => {
      f.removeEventListener("pointerenter", enter);
      f.removeEventListener("pointerleave", leave);
      f.removeEventListener("focusin", enter);
    };
  }, []);

  if (phase === "sent" || phase === "preview" || phase === "error") {
    const title = phase === "sent" ? ui.form.sentTitle : phase === "preview" ? ui.form.previewTitle : ui.form.errorTitle;
    const body = phase === "sent" ? ui.form.sentBody : phase === "preview" ? ui.form.previewBody : ui.form.errorBody;
    return (
      <div role="status" aria-live="polite" className="brief-done" data-phase={phase}>
        <p className="statement" style={{ fontSize: "var(--fs-display-m)" }}>{title}</p>
        <p className="prose mt-6">{body}</p>
        {phase === "error" && (
          <button type="button" className="btn btn-ghost mt-10" onClick={() => setPhase("form")}>
            {ui.form.back}
          </button>
        )}
      </div>
    );
  }

  const stepTitle = [ui.form.typeLegend, ui.form.productLabel, ui.form.projectLabel, `${ui.form.nameLabel} · ${ui.form.emailLabel}`][step - 1];

  return (
    <form
      ref={formRef}
      noValidate
      aria-describedby={`${uid}-step`}
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="brief-form"
      data-step={step}
    >
      <div className="flex items-center justify-between">
        <p id={`${uid}-step`} className="label muted" aria-live="polite">
          {ui.form.step(step, STEPS)}
        </p>
        <div className="h-px w-32 overflow-hidden" style={{ background: "var(--line)" }} aria-hidden="true">
          <div className="h-full origin-left" style={{ background: "var(--fg)", transform: `scaleX(${step / STEPS})`, transition: "transform var(--mo-reveal) var(--mo-ease-out)" }} />
        </div>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="sr-only">
        {stepTitle}
      </h2>

      <div className="mt-10 min-h-[22rem]">
        {step === 1 && (
          <fieldset aria-invalid={!!errors.type} aria-describedby={errors.type ? `${uid}-err-type` : undefined}>
            <legend className="field-label mb-5">{ui.form.typeLegend}</legend>
            <div className="grid gap-3">
              {[...site.start.projectTypes.map((p) => ({ id: p.id, label: p.label })), { id: "unsure", label: null }].map((p) => (
                <label key={p.id} className="choice">
                  <input
                    type="radio"
                    name="type"
                    value={p.id}
                    checked={data.type === p.id}
                    onChange={(e) => {
                      setData((d) => ({ ...d, type: e.target.value }));
                      setErrors({});
                      notebook.keystroke("type");
                    }}
                  />
                  <span>{p.label ? <T s={p.label} /> : ui.form.typeOther}</span>
                  <span className="choice-dot" aria-hidden="true" />
                </label>
              ))}
            </div>
            {errors.type && (
              <p id={`${uid}-err-type`} className="field-error mt-4" role="alert">
                {errors.type}
              </p>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <div className="field">
            <label htmlFor={`${uid}-product`} className="field-label">
              {ui.form.productLabel}
            </label>
            <input
              id={`${uid}-product`}
              name="product"
              className="field-input"
              autoComplete="organization"
              value={data.product}
              onChange={set("product")}
              aria-invalid={!!errors.product}
              aria-describedby={`${uid}-product-hint${errors.product ? ` ${uid}-err-product` : ""}`}
              autoFocus
            />
            <p id={`${uid}-product-hint`} className="field-hint">
              {ui.form.productHint}
            </p>
            {errors.product && (
              <p id={`${uid}-err-product`} className="field-error" role="alert">
                {errors.product}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="field">
            <label htmlFor={`${uid}-project`} className="field-label">
              {ui.form.projectLabel}
            </label>
            <textarea
              id={`${uid}-project`}
              name="project"
              className="field-input"
              rows={5}
              value={data.project}
              onChange={set("project")}
              aria-invalid={!!errors.project}
              aria-describedby={`${uid}-project-hint${errors.project ? ` ${uid}-err-project` : ""}`}
              autoFocus
            />
            <p id={`${uid}-project-hint`} className="field-hint">
              {ui.form.projectHint}
            </p>
            {errors.project && (
              <p id={`${uid}-err-project`} className="field-error" role="alert">
                {errors.project}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-10">
            <div className="field">
              <label htmlFor={`${uid}-name`} className="field-label">
                {ui.form.nameLabel}
              </label>
              <input
                id={`${uid}-name`}
                name="name"
                className="field-input"
                autoComplete="name"
                value={data.name}
                onChange={set("name")}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? `${uid}-err-name` : undefined}
                autoFocus
              />
              {errors.name && (
                <p id={`${uid}-err-name`} className="field-error" role="alert">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="field">
              <label htmlFor={`${uid}-email`} className="field-label">
                {ui.form.emailLabel}
              </label>
              <input
                id={`${uid}-email`}
                name="email"
                type="email"
                inputMode="email"
                className="field-input"
                autoComplete="email"
                value={data.email}
                onChange={set("email")}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? `${uid}-err-email` : undefined}
              />
              {errors.email && (
                <p id={`${uid}-err-email`} className="field-error" role="alert">
                  {errors.email}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 flex items-center gap-4">
        {step > 1 && (
          <button type="button" className="btn btn-ghost" onClick={back}>
            {ui.form.back}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={phase === "sending"}>
          {phase === "sending" ? ui.form.sending : step < STEPS ? ui.form.next : ui.form.send}
        </button>
      </div>
    </form>
  );
}
