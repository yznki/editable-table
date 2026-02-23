<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section v-if="isPageLoading" class="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
      <div class="animate-pulse space-y-8">
        <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div class="h-3 w-40 rounded bg-slate-200" />
          <div class="mt-4 h-10 w-80 max-w-full rounded bg-slate-200" />
          <div class="mt-3 h-4 w-full max-w-3xl rounded bg-slate-200" />
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="h-6 w-32 rounded bg-slate-200" />
            <div class="h-4 w-16 rounded bg-slate-200" />
          </div>

          <div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="index in 4"
              :key="index"
              class="min-h-[210px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:min-h-[220px]">
              <div class="h-6 w-2/3 rounded bg-slate-200" />
              <div class="mt-3 h-4 w-full rounded bg-slate-200" />
              <div class="mt-6 h-4 w-1/2 rounded bg-slate-200" />
              <div class="mt-8 flex gap-2">
                <div class="h-7 w-16 rounded bg-slate-200" />
                <div class="h-7 w-14 rounded bg-slate-200" />
                <div class="h-7 w-16 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
      <div class="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p class="text-sm uppercase tracking-[0.24em] text-[#0A8276]">Requirements Manager</p>
        <h1 class="mt-4 text-3xl font-black text-slate-900 md:text-5xl">Projects Dashboard</h1>
        <p class="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
          Create and manage requirements projects. Each project contains reorderable requirement sets and spreadsheet editing.
        </p>
      </div>

      <section class="mt-8 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">All Projects</h2>
          <p class="text-sm text-slate-600">{{ storage.projects.length }} total</p>
        </div>

        <div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="project in storage.projects"
            :key="project.id"
            role="button"
            tabindex="0"
            @click="openProject(project.id)"
            @keydown.enter.prevent="openProject(project.id)"
            @keydown.space.prevent="openProject(project.id)"
            class="flex min-h-[210px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#0A8276]/25 md:min-h-[220px]">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h3 class="text-lg font-semibold">{{ project.name }}</h3>
                <p class="mt-1 text-sm text-slate-600">{{ project.description || "No description" }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {{ project.sheets.length }} sets
              </span>
            </div>

            <div class="mt-4 text-xs text-slate-500">Updated {{ formatDateTime(project.updatedAt) }}</div>

            <div class="mt-auto flex flex-wrap gap-2 pt-5">
              <button
                type="button"
                @click.stop="openProject(project.id)"
                class="rounded-lg bg-[#0A8276] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#086d63]">
                Open
              </button>
              <button
                type="button"
                @click.stop="openEditModal(project.id)"
                class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
                Edit
              </button>
              <button
                type="button"
                @click.stop="requestDeleteProject(project.id)"
                class="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50">
                Delete
              </button>
            </div>
          </article>

          <button
            type="button"
            @click="openCreateModal"
            :class="createCardClass"
            class="group relative flex min-h-[210px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-8 text-center backdrop-blur-sm transition md:min-h-[220px]">
            <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-current text-3xl leading-none">+</span>
            <h3 class="text-lg font-semibold">New Project</h3>
            <p class="mt-2 text-sm opacity-80">Create a project with name and description in a modal.</p>
          </button>
        </div>
      </section>
    </section>

    <ProjectFormDialog
      v-model="isProjectModalOpen"
      :is-edit-mode="isEditMode"
      :initial-name="projectFormInitial.name"
      :initial-description="projectFormInitial.description"
      @submit="submitProjectModal" />

    <ConfirmDialog
      v-model="isProjectDeleteDialogOpen"
      title="Delete Project"
      :message="projectDeleteMessage"
      confirm-label="Yes, delete"
      cancel-label="No"
      confirm-tone="danger"
      @confirm="confirmDeleteProject" />
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from "vue";
  import { createProject, useRequirementsManagerStorage } from "~/composables/useRequirementsManager";

  interface ProjectFormPayload {
    name: string;
    description: string;
  }

  const storage = useRequirementsManagerStorage();
  const isPageLoading = ref(true);

  const isProjectModalOpen = ref(false);
  const editProjectId = ref<string | null>(null);
  const projectFormInitial = ref({
    name: "",
    description: ""
  });

  const projectDeleteDialog = ref<{ id: string; name: string } | null>(null);

  const isEditMode = computed(() => editProjectId.value !== null);
  const isProjectDeleteDialogOpen = computed({
    get: () => projectDeleteDialog.value !== null,
    set: (value: boolean) => {
      if (!value) projectDeleteDialog.value = null;
    }
  });

  const projectDeleteMessage = computed(() => {
    if (!projectDeleteDialog.value) return "";
    return `Are you sure you want to delete "${projectDeleteDialog.value.name}"? This removes all requirement sets in it.`;
  });

  const createCardClass = computed(() => {
    if (!storage.value.projects.length) {
      return "md:col-span-2 xl:col-span-4 border-[#0A8276]/35 bg-[#0A8276]/8 text-[#0A8276] hover:bg-[#0A8276]/12";
    }

    return "border-slate-300 bg-white/50 text-slate-700 hover:border-[#0A8276]/40 hover:bg-[#0A8276]/8 hover:text-[#0A8276]";
  });

  const formatDateTime = (value: string) => new Date(value).toLocaleString();

  const openProject = (projectId: string) => {
    navigateTo(`/projects/${projectId}`);
  };

  const openCreateModal = () => {
    editProjectId.value = null;
    projectFormInitial.value = {
      name: "",
      description: ""
    };
    isProjectModalOpen.value = true;
  };

  const openEditModal = (projectId: string) => {
    const project = storage.value.projects.find((item) => item.id === projectId);
    if (!project) return;

    editProjectId.value = project.id;
    projectFormInitial.value = {
      name: project.name,
      description: project.description
    };
    isProjectModalOpen.value = true;
  };

  const closeProjectModal = () => {
    isProjectModalOpen.value = false;
    editProjectId.value = null;
    projectFormInitial.value = {
      name: "",
      description: ""
    };
  };

  const submitProjectModal = (payload: ProjectFormPayload) => {
    if (editProjectId.value) {
      const project = storage.value.projects.find((item) => item.id === editProjectId.value);
      if (!project) return;

      project.name = payload.name;
      project.description = payload.description;
      project.updatedAt = new Date().toISOString();
      closeProjectModal();
      return;
    }

    const project = createProject(payload.name, payload.description);
    storage.value.projects.unshift(project);
    closeProjectModal();
  };

  const requestDeleteProject = (projectId: string) => {
    const project = storage.value.projects.find((item) => item.id === projectId);
    if (!project) return;
    projectDeleteDialog.value = { id: project.id, name: project.name };
  };

  const confirmDeleteProject = () => {
    if (!projectDeleteDialog.value) return;
    const projectId = projectDeleteDialog.value.id;

    storage.value.projects = storage.value.projects.filter((item) => item.id !== projectId);
    if (editProjectId.value === projectId) {
      closeProjectModal();
    }

    projectDeleteDialog.value = null;
  };

  onMounted(() => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        isPageLoading.value = false;
      });
      return;
    }
    isPageLoading.value = false;
  });
</script>
