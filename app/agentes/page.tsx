import { AgentCard } from "@/components/agents/AgentCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { agents } from "@/lib/data";

export default function AgentesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Agentes"
        description="Equipo de agentes de IA disponibles para ANAI."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
