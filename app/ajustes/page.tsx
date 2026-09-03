import { SettingsForm } from "@/components/settings/SettingsForm";
import { SectionHeading } from "@/components/ui/SectionHeading";

export default function AjustesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Ajustes"
        description="Preferencias de ASTRID. Estos valores aún no se envían a ningún servicio."
      />
      <SettingsForm />
    </div>
  );
}
