"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "@/components/icons";
import { CreateRepoDialog } from "@/components/projects/CreateRepoDialog";
import { GithubRepoCard } from "@/components/projects/GithubRepoCard";
import { RegisteredProjectCard } from "@/components/projects/RegisteredProjectCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Select } from "@/components/ui/Select";
import type { GithubRepoSummary, ProjectVisibility, PublicProject } from "@/lib/types";

type VisibilityFilter = "all" | ProjectVisibility;

const VISIBILITY_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "public", label: "Públicos" },
  { value: "private", label: "Privados" },
];

export function ProjectsView() {
  const [projects, setProjects] = useState<PublicProject[]>([]);
  const [repos, setRepos] = useState<GithubRepoSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [pendingFullName, setPendingFullName] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Used by event handlers (register button, create-repo dialog) to
  // refresh both lists after an action — safe to setState freely there.
  async function loadAll() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [projectsRes, reposRes] = await Promise.all([fetch("/api/projects"), fetch("/api/repositories")]);
      const projectsData = await projectsRes.json();
      const reposData = await reposRes.json();
      if (!projectsRes.ok) throw new Error(projectsData.error ?? "No se pudieron cargar los proyectos.");
      if (!reposRes.ok) throw new Error(reposData.error ?? "No se pudieron cargar los repositorios de GitHub.");
      setProjects(projectsData.projects as PublicProject[]);
      setRepos(reposData.repos as GithubRepoSummary[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Error inesperado al cargar proyectos.");
    } finally {
      setIsLoading(false);
    }
  }

  // The initial load runs as a plain promise chain (matching
  // ChatShell.tsx's project-fetch effect) rather than calling `loadAll()`
  // by reference — calling a named async function directly from an effect
  // body trips react-hooks/set-state-in-effect regardless of where its
  // setState calls actually land relative to its `await`s.
  useEffect(() => {
    Promise.all([fetch("/api/projects"), fetch("/api/repositories")])
      .then(([projectsRes, reposRes]) =>
        Promise.all([projectsRes.json(), reposRes.json()]).then(([projectsData, reposData]) => {
          if (!projectsRes.ok) throw new Error(projectsData.error ?? "No se pudieron cargar los proyectos.");
          if (!reposRes.ok) throw new Error(reposData.error ?? "No se pudieron cargar los repositorios de GitHub.");
          setProjects(projectsData.projects as PublicProject[]);
          setRepos(reposData.repos as GithubRepoSummary[]);
        }),
      )
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : "Error inesperado al cargar proyectos.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function handleAddRepo(repo: GithubRepoSummary) {
    setPendingFullName(repo.fullName);
    setActionError(null);
    try {
      const response = await fetch("/api/projects/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: repo.fullName }),
      });
      const data = await response.json();
      if (!response.ok) {
        setActionError(data.error ?? "No se pudo registrar el repositorio.");
        return;
      }
      await loadAll();
    } catch {
      setActionError("No se pudo contactar al servidor.");
    } finally {
      setPendingFullName(null);
    }
  }

  const filteredRepos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return repos.filter((repo) => {
      const matchesQuery =
        !query || repo.repoName.toLowerCase().includes(query) || repo.fullName.toLowerCase().includes(query);
      const matchesVisibility = visibilityFilter === "all" || repo.visibility === visibilityFilter;
      return matchesQuery && matchesVisibility;
    });
  }, [repos, search, visibilityFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
      <SectionHeading
        title="Proyectos"
        description="Repositorios conectados y disponibles en tu cuenta de GitHub."
        action={
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-medium text-gold-foreground transition-opacity hover:opacity-90"
          >
            <PlusIcon className="h-4 w-4" />
            Crear repositorio
          </button>
        }
      />

      {loadError && (
        <div className="mb-5 rounded-xl border border-danger/30 bg-danger-dim px-4 py-3 text-sm text-danger">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="mb-5 rounded-xl border border-danger/30 bg-danger-dim px-4 py-3 text-sm text-danger">
          {actionError}
        </div>
      )}

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-2">
          Mis proyectos SANAI
        </h2>
        {isLoading ? (
          <p className="text-sm text-muted">Cargando...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay proyectos registrados.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <RegisteredProjectCard key={project.projectId} project={project} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-2">
            Repositorios de GitHub
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar repositorio..."
                className="w-56 rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-2 focus:border-gold/40 focus:outline-none"
              />
            </div>
            <Select
              value={visibilityFilter}
              options={VISIBILITY_OPTIONS}
              onChange={(value) => setVisibilityFilter(value as VisibilityFilter)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Cargando repositorios de GitHub...</p>
        ) : filteredRepos.length === 0 ? (
          <p className="text-sm text-muted">Ningún repositorio coincide con la búsqueda.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRepos.map((repo) => (
              <GithubRepoCard
                key={repo.fullName}
                repo={repo}
                onAdd={(target) => void handleAddRepo(target)}
                isBusy={pendingFullName === repo.fullName}
              />
            ))}
          </div>
        )}
      </section>

      {showCreateDialog && (
        <CreateRepoDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={() => {
            setShowCreateDialog(false);
            void loadAll();
          }}
        />
      )}
    </div>
  );
}
