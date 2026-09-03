"use client";

import { useState } from "react";
import { ThemeSelect } from "@/components/theme/ThemeSelect";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { projects } from "@/lib/data";

const modelOptions = [
  { value: "automatico", label: "Automático" },
  { value: "claude", label: "Claude" },
  { value: "copilot", label: "GitHub Copilot" },
];

const escalationOptions = [
  { value: "conservadora", label: "Conservadora — pedir confirmación siempre" },
  { value: "equilibrada", label: "Equilibrada — escalar solo en bloqueos" },
  { value: "autonoma", label: "Autónoma — resolver sin intervención" },
];

const defaultProjectOptions = projects.map((project) => ({
  value: project.id,
  label: project.name,
}));

export function SettingsForm() {
  const [model, setModel] = useState(modelOptions[0].value);
  const [escalation, setEscalation] = useState(escalationOptions[1].value);
  const [defaultProject, setDefaultProject] = useState(defaultProjectOptions[0].value);
  const [confirmCritical, setConfirmCritical] = useState(true);
  const [autoRunTests, setAutoRunTests] = useState(true);
  const [notifyOnPr, setNotifyOnPr] = useState(false);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Apariencia</h2>
        <p className="mt-1 text-xs text-muted">Elige cómo se ve ASTRID en este dispositivo.</p>
        <div className="mt-4">
          <ThemeSelect />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Modelo y proyecto</h2>
        <p className="mt-1 text-xs text-muted">
          Preferencias generales de orquestación para ASTRID.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Select label="Modelo preferido" value={model} options={modelOptions} onChange={setModel} />
          <Select
            label="Proyecto por defecto"
            value={defaultProject}
            options={defaultProjectOptions}
            onChange={setDefaultProject}
          />
        </div>
        <div className="mt-4">
          <Select
            label="Política de escalamiento"
            value={escalation}
            options={escalationOptions}
            onChange={setEscalation}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Confirmaciones y automatización</h2>
        <p className="mt-1 text-xs text-muted">
          Controla cuándo ASTRID debe pedirte aprobación antes de actuar.
        </p>
        <div className="mt-4 divide-y divide-border">
          <Toggle
            checked={confirmCritical}
            onChange={setConfirmCritical}
            label="Confirmaciones para acciones críticas"
            description="Pide aprobación antes de hacer push, abrir PRs o modificar producción."
          />
          <Toggle
            checked={autoRunTests}
            onChange={setAutoRunTests}
            label="Ejecutar tests automáticamente"
            description="Corre la suite de pruebas antes de marcar una tarea como completada."
          />
          <Toggle
            checked={notifyOnPr}
            onChange={setNotifyOnPr}
            label="Notificarme al abrir un Pull Request"
            description="Recibe un aviso cuando ASTRID crea un PR en tu nombre."
          />
        </div>
      </Card>
    </div>
  );
}
