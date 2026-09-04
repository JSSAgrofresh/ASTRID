"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { CreateRepositoryRequest, ProjectVisibility, PublicProject } from "@/lib/types";

const GITIGNORE_OPTIONS = [
  { value: "", label: "Ninguno" },
  { value: "Node", label: "Node" },
  { value: "Python", label: "Python" },
];

const LICENSE_OPTIONS = [
  { value: "", label: "Ninguna" },
  { value: "mit", label: "MIT" },
  { value: "apache-2.0", label: "Apache 2.0" },
];

interface CreateRepoDialogProps {
  onClose: () => void;
  onCreated: (project: PublicProject) => void;
}

const NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;

/**
 * Two-step, explicit-approval flow for creating a brand-new GitHub repo —
 * this is the ONLY UI surface that can send `confirm: true` to
 * `POST /api/repositories/create`. Step 1 is a plain form; step 2 restates
 * every value as plain text and requires a distinct second click. There is
 * no way to reach the create action from a single click or a typed
 * sentence.
 */
export function CreateRepoDialog({ onClose, onCreated }: CreateRepoDialogProps) {
  const [step, setStep] = useState<"form" | "summary">("form");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [addReadme, setAddReadme] = useState(true);
  const [gitignoreTemplate, setGitignoreTemplate] = useState("");
  const [license, setLicense] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameError = name.trim().length > 0 && !NAME_PATTERN.test(name.trim());

  async function handleConfirmCreate() {
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateRepositoryRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        addReadme,
        gitignoreTemplate: gitignoreTemplate || undefined,
        license: license || undefined,
        confirm: true,
      };
      const response = await fetch("/api/repositories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo crear el repositorio.");
        return;
      }
      onCreated(data.project as PublicProject);
    } catch {
      setError("No se pudo contactar al servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--card-shadow)]">
        {step === "form" ? (
          <>
            <h2 className="text-lg font-semibold text-foreground">Crear repositorio</h2>
            <p className="mt-1 text-sm text-muted">
              Se creará en GitHub y se clonará automáticamente a ASTRID.
            </p>

            <div className="mt-5 space-y-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">Nombre</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="mi-nuevo-proyecto"
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-2 focus:border-gold/40 focus:outline-none"
                />
                {nameError && (
                  <span className="text-xs text-danger">
                    Solo letras, números, puntos, guiones y guiones bajos.
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-2">
                  Descripción (opcional)
                </span>
                <input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-foreground focus:border-gold/40 focus:outline-none"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Visibilidad"
                  value={visibility}
                  options={[
                    { value: "private", label: "Privado" },
                    { value: "public", label: "Público" },
                  ]}
                  onChange={(value) => setVisibility(value as ProjectVisibility)}
                />
                <Select
                  label="Licencia"
                  value={license}
                  options={LICENSE_OPTIONS}
                  onChange={setLicense}
                />
              </div>

              <Select
                label="Archivo .gitignore"
                value={gitignoreTemplate}
                options={GITIGNORE_OPTIONS}
                onChange={setGitignoreTemplate}
              />

              <Toggle checked={addReadme} onChange={setAddReadme} label="Crear README inicial" />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-border-strong"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!name.trim() || nameError}
                onClick={() => setStep("summary")}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Revisar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-foreground">Confirmar creación</h2>
            <p className="mt-1 text-sm text-muted">
              ASTRID va a ejecutar exactamente esto — revisa antes de continuar.
            </p>

            <dl className="mt-5 space-y-2 rounded-xl border border-border bg-surface-2 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Nombre</dt>
                <dd className="font-mono text-foreground">{name.trim()}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Visibilidad</dt>
                <dd className="text-foreground">{visibility === "private" ? "Privado" : "Público"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">README inicial</dt>
                <dd className="text-foreground">{addReadme ? "Sí" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">.gitignore</dt>
                <dd className="text-foreground">{gitignoreTemplate || "Ninguno"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Licencia</dt>
                <dd className="text-foreground">{license || "Ninguna"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Se clonará en</dt>
                <dd className="text-foreground">/home/kokes/astrid/projects/{name.trim()}</dd>
              </div>
            </dl>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep("form")}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-border-strong disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleConfirmCreate()}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Creando..." : "Crear repositorio"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
