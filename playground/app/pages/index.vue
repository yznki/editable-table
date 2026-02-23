<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section class="mx-auto max-w-[1600px] px-6 py-10 md:px-10">
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

            <div class="mt-4 text-xs text-slate-500">
              Updated {{ formatDateTime(project.updatedAt) }}
            </div>

            <div class="mt-auto pt-5 flex flex-wrap gap-2">
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

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="isProjectModalOpen" class="fixed inset-0 z-50 bg-slate-900/55 backdrop-blur-sm" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]">
      <div v-if="isProjectModalOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div ref="projectModalPanelEl" class="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-bold">{{ isEditMode ? "Edit Project" : "Create Project" }}</h3>
              <p class="mt-1 text-sm text-slate-600">
                {{ isEditMode ? "Update project metadata." : "Define the project metadata. Requirement sets start with one default sheet." }}
              </p>
            </div>
            <button
              type="button"
              @click="closeProjectModal"
              aria-label="Close modal"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:border-[#0A8276]/40 hover:bg-[#0A8276]/5">
              <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <form class="mt-5 space-y-3" @submit.prevent="submitProjectModal">
            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Name</span>
              <input
                v-model="projectForm.name"
                required
                type="text"
                placeholder="Powertrain Controller"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0A8276] focus:ring-2 focus:ring-[#0A8276]/15" />
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Description</span>
              <textarea
                v-model="projectForm.description"
                rows="4"
                placeholder="Scope, stakeholders, and engineering context"
                class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[#0A8276] focus:ring-2 focus:ring-[#0A8276]/15" />
            </label>

            <button
              type="submit"
              class="w-full rounded-xl bg-[#0A8276] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#086d63]">
              {{ isEditMode ? "Save Changes" : "Create Project" }}
            </button>
          </form>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0">
      <div v-if="projectDeleteDialog" class="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-sm" @click="closeProjectDeleteDialog" />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 translate-y-2 scale-[0.98]">
      <div v-if="projectDeleteDialog" class="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
          <h3 class="text-lg font-bold text-slate-900">Delete Project</h3>
          <p class="mt-2 text-sm text-slate-600">
            Are you sure you want to delete
            <span class="font-semibold text-slate-800">"{{ projectDeleteDialog.name }}"</span>?
            This removes all requirement sets in it.
          </p>

          <div class="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              @click="closeProjectDeleteDialog"
              class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              No
            </button>
            <button
              type="button"
              @click="confirmDeleteProject"
              class="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-500">
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from "vue";
  import { onClickOutside } from "@vueuse/core";
  import { createProject, useRequirementsManagerStorage } from "~/composables/useRequirementsManager";

  const storage = useRequirementsManagerStorage();

  const isProjectModalOpen = ref(false);
  const projectForm = reactive({
    name: "",
    description: ""
  });
  const projectModalPanelEl = ref<HTMLElement | null>(null);
  const editProjectId = ref<string | null>(null);
  const projectDeleteDialog = ref<{ id: string; name: string } | null>(null);
  const isEditMode = computed(() => editProjectId.value !== null);

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
    projectForm.name = "";
    projectForm.description = "";
    isProjectModalOpen.value = true;
  };

  const openEditModal = (projectId: string) => {
    const project = storage.value.projects.find((item) => item.id === projectId);
    if (!project) return;

    editProjectId.value = project.id;
    projectForm.name = project.name;
    projectForm.description = project.description;
    isProjectModalOpen.value = true;
  };

  const closeProjectModal = () => {
    isProjectModalOpen.value = false;
    editProjectId.value = null;
    projectForm.name = "";
    projectForm.description = "";
  };

  onClickOutside(projectModalPanelEl, () => {
    if (!isProjectModalOpen.value) return;
    closeProjectModal();
  });

  const submitProjectModal = () => {
    const name = projectForm.name.trim();

    if (!name) return;

    if (editProjectId.value) {
      const project = storage.value.projects.find((item) => item.id === editProjectId.value);
      if (!project) return;
      project.name = name;
      project.description = projectForm.description.trim();
      project.updatedAt = new Date().toISOString();
      closeProjectModal();
      return;
    }

    const project = createProject(name, projectForm.description.trim());
    storage.value.projects.unshift(project);
    closeProjectModal();
  };

  const requestDeleteProject = (projectId: string) => {
    const project = storage.value.projects.find((item) => item.id === projectId);
    if (!project) return;
    projectDeleteDialog.value = { id: project.id, name: project.name };
  };

  const closeProjectDeleteDialog = () => {
    projectDeleteDialog.value = null;
  };

  const confirmDeleteProject = () => {
    if (!projectDeleteDialog.value) return;
    const projectId = projectDeleteDialog.value.id;

    storage.value.projects = storage.value.projects.filter((item) => item.id !== projectId);
    if (editProjectId.value === projectId) {
      closeProjectModal();
    }
    closeProjectDeleteDialog();
  };
</script>
