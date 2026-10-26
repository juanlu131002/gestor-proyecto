/* ============================================================
   PROJECTFLOW — TASKS.JS
============================================================ */


/* ============================================================
   ESTADO
============================================================ */

let globalTasks = [];
let subtasks = [];
let assignments = [];
let profiles = [];

let selectedGlobalTaskId = null;
let selectedGlobalColor = "#c96a4a";

/*
   Cuando estos valores son null,
   estamos creando.

   Cuando contienen un UUID,
   estamos editando.
*/

let editingGlobalTaskId = null;
let editingSubtaskId = null;


/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  try {

    await ProjectFlow.init();

    setupTaskEvents();

    await loadTasksPage();

  } catch (error) {

    console.error(
      "Error cargando tareas:",
      error
    );

    ProjectFlow.showToast(
      "No se han podido cargar las tareas",
      "error"
    );

  }

});


/* ============================================================
   CARGAR DATOS
============================================================ */

async function loadTasksPage() {

  try {

    const [
      globalTasksData,
      subtasksData,
      assignmentsData,
      profilesData
    ] = await Promise.all([

      ProjectFlow.fetchGlobalTasks(),

      ProjectFlow.fetchSubtasks(),

      ProjectFlow.fetchAssignments(),

      ProjectFlow.fetchProfiles()
        .catch(error => {

          console.warn(
            "No se han podido cargar todos los perfiles:",
            error
          );

          return [];

        })

    ]);


    globalTasks = globalTasksData || [];
    subtasks = subtasksData || [];
    assignments = assignmentsData || [];
    profiles = profilesData || [];


    const selectedStillExists =
      globalTasks.some(
        task =>
          String(task.id) ===
          String(selectedGlobalTaskId)
      );


    if (!selectedStillExists) {

      selectedGlobalTaskId =
        globalTasks.length > 0
          ? globalTasks[0].id
          : null;

    }


    renderAll();

  } catch (error) {

    console.error(
      "Error obteniendo los datos:",
      error
    );

    throw error;

  }

}


/* ============================================================
   RENDER GENERAL
============================================================ */

function renderAll() {

  renderSummary();

  renderGlobalTasks();

  renderPeopleSelector();

  renderSelectedGlobalHeader();

  renderSubtasks();

  ProjectFlow.refreshIcons();

}


/* ============================================================
   RESUMEN
============================================================ */

function renderSummary() {

  const total =
    subtasks.length;


  const completed =
    subtasks.filter(
      task =>
        task.status === "terminada"
    ).length;


  const open =
    total - completed;


  setText(
    "tasksTotal",
    total
  );


  setText(
    "tasksOpen",
    open
  );


  setText(
    "tasksCompleted",
    completed
  );

}


/* ============================================================
   TAREAS GLOBALES
============================================================ */

function renderGlobalTasks() {

  const container =
    document.getElementById(
      "globalTaskList"
    );


  if (!container) {
    return;
  }


  if (globalTasks.length === 0) {

    container.innerHTML = `

      <div class="tasks-empty compact">

        <i data-lucide="folder-plus"></i>

        <strong>
          No hay tareas globales
        </strong>

        <span>
          Crea la primera para organizar el proyecto.
        </span>

      </div>

    `;

    ProjectFlow.refreshIcons();

    return;

  }


  container.innerHTML =
    globalTasks
      .map(task => {

        const children =
          subtasks.filter(
            subtask =>
              String(
                subtask.global_task_id
              ) ===
              String(
                task.id
              )
          );


        const completed =
          children.filter(
            subtask =>
              subtask.status ===
              "terminada"
          ).length;


        const selected =
          String(task.id) ===
          String(selectedGlobalTaskId);


        return `

          <button
            type="button"
            class="global-panel-item ${selected ? "active" : ""}"
            data-global-task="${task.id}"
          >

            <span
              class="global-panel-color"
              style="background:${ProjectFlow.safeColor(task.color)}"
            ></span>

            <span class="global-panel-copy">

              <strong>
                ${ProjectFlow.escapeHTML(task.title)}
              </strong>

              <small>
                ${completed}/${children.length} completadas
              </small>

            </span>

            <i data-lucide="chevron-right"></i>

          </button>

        `;

      })
      .join("");


  ProjectFlow.refreshIcons();

}


/* ============================================================
   SELECCIONAR TAREA GLOBAL
============================================================ */

function selectGlobalTask(id) {

  const task =
    globalTasks.find(
      item =>
        String(item.id) ===
        String(id)
    );


  if (!task) {

    console.error(
      "No se ha encontrado la tarea global:",
      id
    );

    return;

  }


  selectedGlobalTaskId =
    task.id;


  renderGlobalTasks();

  renderSelectedGlobalHeader();

  renderSubtasks();

  ProjectFlow.refreshIcons();

}


/* ============================================================
   CABECERA TAREA GLOBAL
============================================================ */

function renderSelectedGlobalHeader() {

  const container =
    document.getElementById(
      "selectedGlobalHeader"
    );


  if (!container) {
    return;
  }


  const task =
    globalTasks.find(
      item =>
        String(item.id) ===
        String(selectedGlobalTaskId)
    );


  if (!task) {

    container.innerHTML = `

      <div>

        <span class="section-kicker">
          SELECCIONA UNA TAREA
        </span>

        <h2>
          Subtareas
        </h2>

      </div>

    `;

    return;

  }


  const children =
    subtasks.filter(
      subtask =>
        String(
          subtask.global_task_id
        ) ===
        String(
          task.id
        )
    );


  const completed =
    children.filter(
      subtask =>
        subtask.status ===
        "terminada"
    ).length;


  container.innerHTML = `

    <div class="selected-global-title">

      <span
        class="selected-global-color"
        style="background:${ProjectFlow.safeColor(task.color)}"
      ></span>

      <div>

        <span class="section-kicker">
          TAREA GLOBAL
        </span>

        <h2>
          ${ProjectFlow.escapeHTML(task.title)}
        </h2>

        ${
          task.description
            ? `
              <p>
                ${ProjectFlow.escapeHTML(task.description)}
              </p>
            `
            : ""
        }

      </div>

    </div>


    <div class="selected-global-actions">

      <span class="task-counter">
        ${completed}/${children.length}
      </span>


      ${
        ProjectFlow.canManageTasks()
          ? `

            <button
              type="button"
              class="edit-task-button"
              data-edit-global-task="${task.id}"
              title="Editar tarea"
              aria-label="Editar tarea"
            >
              <i data-lucide="pencil"></i>
            </button>


            <button
              type="button"
              class="delete-task-button"
              data-delete-global-task="${task.id}"
              title="Eliminar tarea"
              aria-label="Eliminar tarea"
            >
              <i data-lucide="trash-2"></i>
            </button>

          `
          : ""
      }


      <button
        type="button"
        class="add-subtask-button"
        id="addSubtaskButton"
      >

        <i data-lucide="plus"></i>

        Añadir subtarea

      </button>

    </div>

  `;


  ProjectFlow.refreshIcons();

}


/* ============================================================
   SUBTAREAS
============================================================ */

function renderSubtasks() {

  const container =
    document.getElementById(
      "subtasksList"
    );


  if (!container) {
    return;
  }


  if (!selectedGlobalTaskId) {

    container.innerHTML = `

      <div class="tasks-empty">

        <i data-lucide="mouse-pointer-2"></i>

        <strong>
          Selecciona una tarea global
        </strong>

        <span>
          Aquí aparecerán sus subtareas.
        </span>

      </div>

    `;

    ProjectFlow.refreshIcons();

    return;

  }


  let children =
    subtasks.filter(
      task =>
        String(
          task.global_task_id
        ) ===
        String(
          selectedGlobalTaskId
        )
    );


  /* ==========================================================
     BUSCADOR
  ========================================================== */

  const search =
    document
      .getElementById(
        "taskSearch"
      )
      ?.value
      ?.trim()
      ?.toLowerCase()
    || "";


  if (search) {

    children =
      children.filter(task => {

        const title =
          (
            task.title || ""
          ).toLowerCase();


        const description =
          (
            task.description || ""
          ).toLowerCase();


        return (
          title.includes(search)
          ||
          description.includes(search)
        );

      });

  }


  /* ==========================================================
     FILTRO ESTADO
  ========================================================== */

  const status =
    document
      .getElementById(
        "statusFilter"
      )
      ?.value
    || "";


  if (status) {

    children =
      children.filter(
        task =>
          task.status === status
      );

  }


  /* ==========================================================
     FILTRO PRIORIDAD
  ========================================================== */

  const priority =
    document
      .getElementById(
        "priorityFilter"
      )
      ?.value
    || "";


  if (priority) {

    children =
      children.filter(
        task =>
          task.priority === priority
      );

  }


  children =
    [...children].sort(
      sortSubtasks
    );


  if (children.length === 0) {

    container.innerHTML = `

      <div class="tasks-empty">

        <i data-lucide="list-plus"></i>

        <strong>
          No hay subtareas
        </strong>

        <span>
          Añade una subtarea o cambia los filtros.
        </span>

      </div>

    `;


    ProjectFlow.refreshIcons();

    return;

  }


  container.innerHTML =
    children
      .map(
        task =>
          renderSubtaskCard(task)
      )
      .join("");


  ProjectFlow.refreshIcons();

}


/* ============================================================
   TARJETA SUBTAREA
============================================================ */

function renderSubtaskCard(task) {

  const assigned =
    assignments.filter(
      assignment =>
        String(
          assignment.subtask_id
        ) ===
        String(
          task.id
        )
    );


  const assignedProfiles =
    assigned
      .map(
        assignment =>
          profiles.find(
            profile =>
              String(profile.id) ===
              String(
                assignment.user_id
              )
          )
      )
      .filter(Boolean);


  return `

    <article
      class="subtask-card"
      data-subtask-id="${task.id}"
    >

      <div class="subtask-main">

        <div class="subtask-topline">

          <span
            class="status-badge status-${task.status}"
          >
            ${ProjectFlow.formatTaskStatus(task.status)}
          </span>


          <span
            class="priority-badge priority-${task.priority}"
          >
            ${ProjectFlow.formatTaskPriority(task.priority)}
          </span>

        </div>


        <h3>
          ${ProjectFlow.escapeHTML(task.title)}
        </h3>


        ${
          task.description
            ? `
              <p class="subtask-description">
                ${ProjectFlow.escapeHTML(task.description)}
              </p>
            `
            : ""
        }


        <div class="subtask-meta">

          ${
            task.start_date
              ? `

                <span>

                  <i data-lucide="play"></i>

                  ${ProjectFlow.formatShortDate(task.start_date)}

                </span>

              `
              : ""
          }


          ${
            task.due_date
              ? `

                <span>

                  <i data-lucide="calendar"></i>

                  ${ProjectFlow.formatShortDate(task.due_date)}

                </span>

              `
              : `

                <span>

                  <i data-lucide="calendar-off"></i>

                  Sin fecha

                </span>

              `
          }

        </div>

      </div>


      <div class="subtask-side">

        <div class="subtask-actions">

          <select
            class="inline-status-select"
            data-status-task="${task.id}"
          >

            ${createStatusOptions(task.status)}

          </select>


          ${
            ProjectFlow.canManageTasks()
              ? `

                <button
                  type="button"
                  class="edit-subtask-button"
                  data-edit-subtask="${task.id}"
                  title="Editar subtarea"
                  aria-label="Editar subtarea"
                >
                  <i data-lucide="pencil"></i>
                </button>


                <button
                  type="button"
                  class="delete-subtask-button"
                  data-delete-subtask="${task.id}"
                  title="Eliminar subtarea"
                  aria-label="Eliminar subtarea"
                >
                  <i data-lucide="trash-2"></i>
                </button>

              `
              : ""
          }

        </div>


        <div class="subtask-assignees">

          ${
            assignedProfiles.length > 0

              ? assignedProfiles
                  .slice(0, 3)
                  .map(profile => {

                    const name =
                      profile.full_name
                      ||
                      profile.email
                      ||
                      "Usuario";


                    return `

                      <span
                        class="assignee-avatar"
                        title="${ProjectFlow.escapeHTML(name)}"
                      >
                        ${ProjectFlow.getInitials(name)}
                      </span>

                    `;

                  })
                  .join("")

              : `
                <span class="unassigned-label">
                  Sin asignar
                </span>
              `
          }


          ${
            assignedProfiles.length > 3
              ? `

                <span
                  class="assignee-avatar"
                  title="${assignedProfiles.length - 3} personas más"
                >
                  +${assignedProfiles.length - 3}
                </span>

              `
              : ""
          }

        </div>

      </div>

    </article>

  `;

}


/* ============================================================
   OPCIONES ESTADO
============================================================ */

function createStatusOptions(
  currentStatus
) {

  const statuses = [

    [
      "sin_asignar",
      "Sin asignar"
    ],

    [
      "en_proceso",
      "En proceso"
    ],

    [
      "pendiente_evaluacion",
      "Pendiente de evaluación"
    ],

    [
      "terminada",
      "Terminada"
    ]

  ];


  return statuses
    .map(
      ([value, label]) => `

        <option
          value="${value}"
          ${value === currentStatus ? "selected" : ""}
        >
          ${label}
        </option>

      `
    )
    .join("");

}


/* ============================================================
   PERSONAS
============================================================ */

function renderPeopleSelector() {

  const container =
    document.getElementById(
      "peopleSelector"
    );


  if (!container) {
    return;
  }


  if (!ProjectFlow.canManageTasks()) {

    container.innerHTML = "";

    return;

  }


  if (profiles.length === 0) {

    container.innerHTML = `

      <div style="padding:12px;">
        No hay usuarios disponibles.
      </div>

    `;

    return;

  }


  container.innerHTML =
    profiles
      .map(profile => {

        const name =
          profile.full_name
          ||
          profile.email
          ||
          "Usuario";


        return `

          <label class="person-option">

            <input
              type="checkbox"
              value="${profile.id}"
              name="assignedUsers"
            >

            <span class="person-avatar">
              ${ProjectFlow.getInitials(name)}
            </span>


            <span>

              <strong>
                ${ProjectFlow.escapeHTML(name)}
              </strong>

              <small>
                ${ProjectFlow.escapeHTML(profile.email || "")}
              </small>

            </span>

          </label>

        `;

      })
      .join("");

}


/* ============================================================
   EVENTOS
============================================================ */

function setupTaskEvents() {

  /* ==========================================================
     CREAR TAREA GLOBAL
  ========================================================== */

  document
    .getElementById(
      "newGlobalTaskButton"
    )
    ?.addEventListener(
      "click",
      () => openGlobalTaskModal()
    );


  document
    .getElementById(
      "globalTaskAddButton"
    )
    ?.addEventListener(
      "click",
      () => openGlobalTaskModal()
    );


  /* ==========================================================
     FILTROS
  ========================================================== */

  document
    .getElementById(
      "taskSearch"
    )
    ?.addEventListener(
      "input",
      renderSubtasks
    );


  document
    .getElementById(
      "statusFilter"
    )
    ?.addEventListener(
      "change",
      renderSubtasks
    );


  document
    .getElementById(
      "priorityFilter"
    )
    ?.addEventListener(
      "change",
      renderSubtasks
    );


  /* ==========================================================
     FORMULARIOS
  ========================================================== */

  document
    .getElementById(
      "globalTaskForm"
    )
    ?.addEventListener(
      "submit",
      saveGlobalTask
    );


  document
    .getElementById(
      "subtaskForm"
    )
    ?.addEventListener(
      "submit",
      saveSubtask
    );


  /* ==========================================================
     CLICKS DELEGADOS
  ========================================================== */

  document.addEventListener(
    "click",
    async event => {


      /* --------------------------------------------------------
         EDITAR SUBTAREA
      -------------------------------------------------------- */

      const editSubtaskButton =
        event.target.closest(
          "[data-edit-subtask]"
        );


      if (editSubtaskButton) {

        const taskId =
          editSubtaskButton.getAttribute(
            "data-edit-subtask"
          );


        if (taskId) {

          openEditSubtaskModal(
            taskId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         BORRAR SUBTAREA
      -------------------------------------------------------- */

      const deleteSubtaskButton =
        event.target.closest(
          "[data-delete-subtask]"
        );


      if (deleteSubtaskButton) {

        const taskId =
          deleteSubtaskButton.getAttribute(
            "data-delete-subtask"
          );


        if (taskId) {

          await deleteSubtask(
            taskId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         EDITAR TAREA GLOBAL
      -------------------------------------------------------- */

      const editGlobalTaskButton =
        event.target.closest(
          "[data-edit-global-task]"
        );


      if (editGlobalTaskButton) {

        const taskId =
          editGlobalTaskButton.getAttribute(
            "data-edit-global-task"
          );


        if (taskId) {

          openEditGlobalTaskModal(
            taskId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         BORRAR TAREA GLOBAL
      -------------------------------------------------------- */

      const deleteGlobalTaskButton =
        event.target.closest(
          "[data-delete-global-task]"
        );


      if (deleteGlobalTaskButton) {

        const taskId =
          deleteGlobalTaskButton.getAttribute(
            "data-delete-global-task"
          );


        if (taskId) {

          await deleteGlobalTask(
            taskId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         SELECCIONAR TAREA GLOBAL
      -------------------------------------------------------- */

      const globalButton =
        event.target.closest(
          "[data-global-task]"
        );


      if (globalButton) {

        const taskId =
          globalButton.getAttribute(
            "data-global-task"
          );


        if (taskId) {

          selectGlobalTask(
            taskId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         AÑADIR SUBTAREA
      -------------------------------------------------------- */

      const addSubtask =
        event.target.closest(
          "#addSubtaskButton"
        );


      if (addSubtask) {

        openSubtaskModal();

        return;

      }


      /* --------------------------------------------------------
         CERRAR MODAL
      -------------------------------------------------------- */

      const close =
        event.target.closest(
          "[data-close-modal]"
        );


      if (close) {

        const modalId =
          close.getAttribute(
            "data-close-modal"
          );


        if (modalId) {

          ProjectFlow.closeModal(
            modalId
          );

        }

        return;

      }


      /* --------------------------------------------------------
         COLOR
      -------------------------------------------------------- */

      const color =
        event.target.closest(
          "[data-color]"
        );


      if (color) {

        selectColor(
          color
        );

      }

    }
  );


  /* ==========================================================
     CAMBIAR ESTADO
  ========================================================== */

  document.addEventListener(
    "change",
    async event => {

      const select =
        event.target.closest(
          "[data-status-task]"
        );


      if (!select) {
        return;
      }


      const taskId =
        select.getAttribute(
          "data-status-task"
        );


      if (!taskId) {
        return;
      }


      await updateTaskStatus(
        taskId,
        select.value
      );

    }
  );

}


/* ============================================================
   MODAL TAREA GLOBAL — CREAR
============================================================ */

function openGlobalTaskModal() {

  editingGlobalTaskId = null;


  const form =
    document.getElementById(
      "globalTaskForm"
    );


  if (form) {
    form.reset();
  }


  selectedGlobalColor =
    "#c96a4a";


  updateColorSelector();


  /*
     Cambiamos textos del modal
     si existen en el HTML.
  */

  const modal =
    document.getElementById(
      "globalTaskModal"
    );


  if (modal) {

    const title =
      modal.querySelector(
        ".modal-header h2"
      );


    if (title) {
      title.textContent =
        "Nueva tarea global";
    }


    const submitButton =
      modal.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {
      submitButton.textContent =
        "Crear tarea";
    }

  }


  ProjectFlow.openModal(
    "globalTaskModal"
  );

}


/* ============================================================
   MODAL TAREA GLOBAL — EDITAR
============================================================ */

function openEditGlobalTaskModal(
  taskId
) {

  if (!ProjectFlow.canManageTasks()) {
    return;
  }


  const task =
    globalTasks.find(
      item =>
        String(item.id) ===
        String(taskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la tarea",
      "error"
    );

    return;

  }


  editingGlobalTaskId =
    task.id;


  const titleInput =
    document.getElementById(
      "globalTaskTitle"
    );


  const descriptionInput =
    document.getElementById(
      "globalTaskDescription"
    );


  if (titleInput) {

    titleInput.value =
      task.title || "";

  }


  if (descriptionInput) {

    descriptionInput.value =
      task.description || "";

  }


  selectedGlobalColor =
    task.color || "#c96a4a";


  updateColorSelector();


  const modal =
    document.getElementById(
      "globalTaskModal"
    );


  if (modal) {

    const title =
      modal.querySelector(
        ".modal-header h2"
      );


    if (title) {
      title.textContent =
        "Editar tarea global";
    }


    const submitButton =
      modal.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {
      submitButton.textContent =
        "Guardar cambios";
    }

  }


  ProjectFlow.openModal(
    "globalTaskModal"
  );

}


/* ============================================================
   MODAL SUBTAREA — CREAR
============================================================ */

function openSubtaskModal() {

  if (!selectedGlobalTaskId) {

    ProjectFlow.showToast(
      "Selecciona primero una tarea global",
      "error"
    );

    return;

  }


  editingSubtaskId = null;


  const form =
    document.getElementById(
      "subtaskForm"
    );


  if (form) {
    form.reset();
  }


  const priority =
    document.getElementById(
      "subtaskPriority"
    );


  const status =
    document.getElementById(
      "subtaskStatus"
    );


  if (priority) {
    priority.value = "media";
  }


  if (status) {
    status.value = "sin_asignar";
  }


  document
    .querySelectorAll(
      'input[name="assignedUsers"]'
    )
    .forEach(
      input => {
        input.checked = false;
      }
    );


  const modal =
    document.getElementById(
      "subtaskModal"
    );


  if (modal) {

    const title =
      modal.querySelector(
        ".modal-header h2"
      );


    if (title) {
      title.textContent =
        "Nueva subtarea";
    }


    const submitButton =
      modal.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {
      submitButton.textContent =
        "Crear subtarea";
    }

  }


  ProjectFlow.openModal(
    "subtaskModal"
  );

}


/* ============================================================
   MODAL SUBTAREA — EDITAR
============================================================ */

function openEditSubtaskModal(
  taskId
) {

  if (!ProjectFlow.canManageTasks()) {
    return;
  }


  const task =
    subtasks.find(
      item =>
        String(item.id) ===
        String(taskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la subtarea",
      "error"
    );

    return;

  }


  editingSubtaskId =
    task.id;


  /*
     Es importante seleccionar también
     su tarea global.
  */

  selectedGlobalTaskId =
    task.global_task_id;


  const titleInput =
    document.getElementById(
      "subtaskTitle"
    );


  const descriptionInput =
    document.getElementById(
      "subtaskDescription"
    );


  const startInput =
    document.getElementById(
      "subtaskStartDate"
    );


  const dueInput =
    document.getElementById(
      "subtaskDueDate"
    );


  const priorityInput =
    document.getElementById(
      "subtaskPriority"
    );


  const statusInput =
    document.getElementById(
      "subtaskStatus"
    );


  if (titleInput) {
    titleInput.value =
      task.title || "";
  }


  if (descriptionInput) {
    descriptionInput.value =
      task.description || "";
  }


  if (startInput) {
    startInput.value =
      task.start_date || "";
  }


  if (dueInput) {
    dueInput.value =
      task.due_date || "";
  }


  if (priorityInput) {
    priorityInput.value =
      task.priority || "media";
  }


  if (statusInput) {
    statusInput.value =
      task.status || "sin_asignar";
  }


  /*
     Primero desmarcamos todos.
  */

  document
    .querySelectorAll(
      'input[name="assignedUsers"]'
    )
    .forEach(input => {

      input.checked = false;

    });


  /*
     Obtenemos las asignaciones actuales.
  */

  const currentAssignments =
    assignments.filter(
      assignment =>
        String(
          assignment.subtask_id
        ) ===
        String(
          task.id
        )
    );


  const assignedUserIds =
    currentAssignments.map(
      assignment =>
        String(
          assignment.user_id
        )
    );


  /*
     Marcamos las personas asignadas.
  */

  document
    .querySelectorAll(
      'input[name="assignedUsers"]'
    )
    .forEach(input => {

      input.checked =
        assignedUserIds.includes(
          String(input.value)
        );

    });


  const modal =
    document.getElementById(
      "subtaskModal"
    );


  if (modal) {

    const title =
      modal.querySelector(
        ".modal-header h2"
      );


    if (title) {
      title.textContent =
        "Editar subtarea";
    }


    const submitButton =
      modal.querySelector(
        'button[type="submit"]'
      );


    if (submitButton) {
      submitButton.textContent =
        "Guardar cambios";
    }

  }


  ProjectFlow.openModal(
    "subtaskModal"
  );

}


/* ============================================================
   COLOR
============================================================ */

function selectColor(button) {

  const color =
    button.getAttribute(
      "data-color"
    );


  if (!color) {
    return;
  }


  selectedGlobalColor =
    color;


  updateColorSelector();

}


/* ============================================================
   ACTUALIZAR SELECTOR DE COLOR
============================================================ */

function updateColorSelector() {

  document
    .querySelectorAll(
      ".color-option"
    )
    .forEach(option => {

      option.classList.toggle(
        "selected",
        String(
          option.dataset.color
        ).toLowerCase() ===
        String(
          selectedGlobalColor
        ).toLowerCase()
      );

    });

}


/* ============================================================
   GUARDAR TAREA GLOBAL
============================================================ */

async function saveGlobalTask(
  event
) {

  event.preventDefault();


  if (editingGlobalTaskId) {

    await updateGlobalTask(
      event
    );

  } else {

    await createGlobalTask(
      event
    );

  }

}


/* ============================================================
   CREAR TAREA GLOBAL
============================================================ */

async function createGlobalTask(
  event
) {

  if (event) {
    event.preventDefault();
  }


  const title =
    document
      .getElementById(
        "globalTaskTitle"
      )
      ?.value
      .trim()
    || "";


  const description =
    document
      .getElementById(
        "globalTaskDescription"
      )
      ?.value
      .trim()
    || "";


  if (!title) {

    ProjectFlow.showToast(
      "Escribe un nombre para la tarea",
      "error"
    );

    return;

  }


  const user =
    ProjectFlow.getUser();


  if (!user) {

    ProjectFlow.showToast(
      "No se ha encontrado tu sesión",
      "error"
    );

    return;

  }


  const {
    data,
    error
  } = await supabaseClient

    .from("global_tasks")

    .insert({

      title,

      description:
        description || null,

      color:
        selectedGlobalColor,

      created_by:
        user.id

    })

    .select()

    .single();


  if (error) {

    console.error(
      "Error creando tarea global:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido crear la tarea",
      "error"
    );

    return;

  }


  globalTasks.push(
    data
  );


  selectedGlobalTaskId =
    data.id;


  editingGlobalTaskId =
    null;


  ProjectFlow.closeModal(
    "globalTaskModal"
  );


  renderAll();


  ProjectFlow.showToast(
    "Tarea global creada",
    "success"
  );

}


/* ============================================================
   ACTUALIZAR TAREA GLOBAL
============================================================ */

async function updateGlobalTask(
  event
) {

  if (event) {
    event.preventDefault();
  }


  if (!ProjectFlow.canManageTasks()) {

    ProjectFlow.showToast(
      "No tienes permisos para editar tareas",
      "error"
    );

    return;

  }


  const task =
    globalTasks.find(
      item =>
        String(item.id) ===
        String(editingGlobalTaskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la tarea",
      "error"
    );

    return;

  }


  const title =
    document
      .getElementById(
        "globalTaskTitle"
      )
      ?.value
      .trim()
    || "";


  const description =
    document
      .getElementById(
        "globalTaskDescription"
      )
      ?.value
      .trim()
    || "";


  if (!title) {

    ProjectFlow.showToast(
      "Escribe un nombre para la tarea",
      "error"
    );

    return;

  }


  const {
    data,
    error
  } = await supabaseClient

    .from("global_tasks")

    .update({

      title,

      description:
        description || null,

      color:
        selectedGlobalColor,

      updated_at:
        new Date()
          .toISOString()

    })

    .eq(
      "id",
      task.id
    )

    .select()

    .single();


  if (error) {

    console.error(
      "Error actualizando tarea global:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido actualizar la tarea",
      "error"
    );

    return;

  }


  const index =
    globalTasks.findIndex(
      item =>
        String(item.id) ===
        String(task.id)
    );


  if (index !== -1) {

    globalTasks[index] =
      data;

  }


  editingGlobalTaskId =
    null;


  selectedGlobalTaskId =
    data.id;


  ProjectFlow.closeModal(
    "globalTaskModal"
  );


  renderAll();


  ProjectFlow.showToast(
    "Tarea actualizada",
    "success"
  );

}


/* ============================================================
   GUARDAR SUBTAREA
============================================================ */

async function saveSubtask(
  event
) {

  event.preventDefault();


  if (editingSubtaskId) {

    await updateSubtask(
      event
    );

  } else {

    await createSubtask(
      event
    );

  }

}


/* ============================================================
   CREAR SUBTAREA
============================================================ */

async function createSubtask(
  event
) {

  if (event) {
    event.preventDefault();
  }


  if (!selectedGlobalTaskId) {

    ProjectFlow.showToast(
      "Selecciona una tarea global",
      "error"
    );

    return;

  }


  const title =
    document
      .getElementById(
        "subtaskTitle"
      )
      ?.value
      .trim()
    || "";


  const description =
    document
      .getElementById(
        "subtaskDescription"
      )
      ?.value
      .trim()
    || "";


  const startDate =
    document
      .getElementById(
        "subtaskStartDate"
      )
      ?.value
    || "";


  const dueDate =
    document
      .getElementById(
        "subtaskDueDate"
      )
      ?.value
    || "";


  const priority =
    document
      .getElementById(
        "subtaskPriority"
      )
      ?.value
    || "media";


  const status =
    document
      .getElementById(
        "subtaskStatus"
      )
      ?.value
    || "sin_asignar";


  if (!title) {

    ProjectFlow.showToast(
      "Escribe un nombre para la subtarea",
      "error"
    );

    return;

  }


  if (
    startDate
    &&
    dueDate
    &&
    dueDate < startDate
  ) {

    ProjectFlow.showToast(
      "La fecha límite no puede ser anterior al inicio",
      "error"
    );

    return;

  }


  const user =
    ProjectFlow.getUser();


  if (!user) {

    ProjectFlow.showToast(
      "No se ha encontrado tu sesión",
      "error"
    );

    return;

  }


  const {
    data: task,
    error
  } = await supabaseClient

    .from("subtasks")

    .insert({

      global_task_id:
        selectedGlobalTaskId,

      title,

      description:
        description || null,

      start_date:
        startDate || null,

      due_date:
        dueDate || null,

      priority,

      status,

      created_by:
        user.id

    })

    .select()

    .single();


  if (error) {

    console.error(
      "Error creando subtarea:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido crear la subtarea",
      "error"
    );

    return;

  }


  /* ==========================================================
     ASIGNACIONES
  ========================================================== */

  if (ProjectFlow.canManageTasks()) {

    const selectedUsers =
      getSelectedUserIds();


    if (selectedUsers.length > 0) {

      const rows =
        selectedUsers.map(
          userId => ({

            subtask_id:
              task.id,

            user_id:
              userId,

            assigned_by:
              user.id

          })
        );


      const {
        data: createdAssignments,
        error: assignmentError
      } = await supabaseClient

        .from(
          "task_assignments"
        )

        .insert(rows)

        .select();


      if (assignmentError) {

        console.error(
          "Error asignando usuarios:",
          assignmentError
        );


        ProjectFlow.showToast(
          "Subtarea creada, pero hubo un problema con las asignaciones",
          "error"
        );

      } else if (
        createdAssignments
      ) {

        assignments.push(
          ...createdAssignments
        );

      }

    }

  }


  subtasks.push(
    task
  );


  editingSubtaskId =
    null;


  ProjectFlow.closeModal(
    "subtaskModal"
  );


  renderAll();


  ProjectFlow.showToast(
    "Subtarea creada",
    "success"
  );

}


/* ============================================================
   ACTUALIZAR SUBTAREA
============================================================ */

async function updateSubtask(
  event
) {

  if (event) {
    event.preventDefault();
  }


  if (!ProjectFlow.canManageTasks()) {

    ProjectFlow.showToast(
      "No tienes permisos para editar subtareas",
      "error"
    );

    return;

  }


  const task =
    subtasks.find(
      item =>
        String(item.id) ===
        String(editingSubtaskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la subtarea",
      "error"
    );

    return;

  }


  const title =
    document
      .getElementById(
        "subtaskTitle"
      )
      ?.value
      .trim()
    || "";


  const description =
    document
      .getElementById(
        "subtaskDescription"
      )
      ?.value
      .trim()
    || "";


  const startDate =
    document
      .getElementById(
        "subtaskStartDate"
      )
      ?.value
    || "";


  const dueDate =
    document
      .getElementById(
        "subtaskDueDate"
      )
      ?.value
    || "";


  const priority =
    document
      .getElementById(
        "subtaskPriority"
      )
      ?.value
    || "media";


  const status =
    document
      .getElementById(
        "subtaskStatus"
      )
      ?.value
    || "sin_asignar";


  if (!title) {

    ProjectFlow.showToast(
      "Escribe un nombre para la subtarea",
      "error"
    );

    return;

  }


  if (
    startDate
    &&
    dueDate
    &&
    dueDate < startDate
  ) {

    ProjectFlow.showToast(
      "La fecha límite no puede ser anterior al inicio",
      "error"
    );

    return;

  }


  const {
    data: updatedTask,
    error
  } = await supabaseClient

    .from("subtasks")

    .update({

      title,

      description:
        description || null,

      start_date:
        startDate || null,

      due_date:
        dueDate || null,

      priority,

      status,

      updated_at:
        new Date()
          .toISOString()

    })

    .eq(
      "id",
      task.id
    )

    .select()

    .single();


  if (error) {

    console.error(
      "Error actualizando subtarea:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido actualizar la subtarea",
      "error"
    );

    return;

  }


  /*
     Actualizamos asignaciones.
  */

  const assignmentsUpdated =
    await updateSubtaskAssignments(
      task.id
    );


  if (!assignmentsUpdated) {

    ProjectFlow.showToast(
      "La subtarea se actualizó, pero hubo un problema con las personas asignadas",
      "error"
    );

  }


  const index =
    subtasks.findIndex(
      item =>
        String(item.id) ===
        String(task.id)
    );


  if (index !== -1) {

    subtasks[index] =
      updatedTask;

  }


  editingSubtaskId =
    null;


  ProjectFlow.closeModal(
    "subtaskModal"
  );


  renderAll();


  if (assignmentsUpdated) {

    ProjectFlow.showToast(
      "Subtarea actualizada",
      "success"
    );

  }

}


/* ============================================================
   ACTUALIZAR ASIGNACIONES
============================================================ */

async function updateSubtaskAssignments(
  taskId
) {

  const user =
    ProjectFlow.getUser();


  if (!user) {
    return false;
  }


  const selectedUserIds =
    getSelectedUserIds();


  const currentAssignments =
    assignments.filter(
      assignment =>
        String(
          assignment.subtask_id
        ) ===
        String(
          taskId
        )
    );


  const currentUserIds =
    currentAssignments.map(
      assignment =>
        String(
          assignment.user_id
        )
    );


  /*
     Personas nuevas.
  */

  const usersToAdd =
    selectedUserIds.filter(
      userId =>
        !currentUserIds.includes(
          String(userId)
        )
    );


  /*
     Personas eliminadas.
  */

  const usersToRemove =
    currentUserIds.filter(
      userId =>
        !selectedUserIds.includes(
          String(userId)
        )
    );


  /* ==========================================================
     BORRAR ASIGNACIONES
  ========================================================== */

  if (usersToRemove.length > 0) {

    const {
      error
    } = await supabaseClient

      .from(
        "task_assignments"
      )

      .delete()

      .eq(
        "subtask_id",
        taskId
      )

      .in(
        "user_id",
        usersToRemove
      );


    if (error) {

      console.error(
        "Error eliminando asignaciones:",
        error
      );

      return false;

    }


    assignments =
      assignments.filter(
        assignment => {

          if (
            String(
              assignment.subtask_id
            ) !==
            String(
              taskId
            )
          ) {

            return true;

          }


          return !usersToRemove.includes(
            String(
              assignment.user_id
            )
          );

        }
      );

  }


  /* ==========================================================
     CREAR NUEVAS ASIGNACIONES
  ========================================================== */

  if (usersToAdd.length > 0) {

    const rows =
      usersToAdd.map(
        userId => ({

          subtask_id:
            taskId,

          user_id:
            userId,

          assigned_by:
            user.id

        })
      );


    const {
      data,
      error
    } = await supabaseClient

      .from(
        "task_assignments"
      )

      .insert(rows)

      .select();


    if (error) {

      console.error(
        "Error creando asignaciones:",
        error
      );

      return false;

    }


    if (data) {

      assignments.push(
        ...data
      );

    }

  }


  return true;

}


/* ============================================================
   OBTENER USUARIOS SELECCIONADOS
============================================================ */

function getSelectedUserIds() {

  return Array.from(
    document.querySelectorAll(
      'input[name="assignedUsers"]:checked'
    )
  )
    .map(
      input =>
        String(
          input.value
        )
    );

}


/* ============================================================
   CAMBIAR ESTADO
============================================================ */

async function updateTaskStatus(
  taskId,
  newStatus
) {

  const task =
    subtasks.find(
      item =>
        String(item.id) ===
        String(taskId)
    );


  if (!task) {
    return;
  }


  const oldStatus =
    task.status;


  task.status =
    newStatus;


  renderSummary();

  renderGlobalTasks();

  renderSelectedGlobalHeader();


  const {
    error
  } = await supabaseClient

    .from("subtasks")

    .update({

      status:
        newStatus,

      updated_at:
        new Date()
          .toISOString()

    })

    .eq(
      "id",
      task.id
    );


  if (error) {

    console.error(
      "Error actualizando estado:",
      error
    );


    task.status =
      oldStatus;


    renderSummary();

    renderGlobalTasks();

    renderSelectedGlobalHeader();

    renderSubtasks();


    ProjectFlow.showToast(
      "No se ha podido actualizar el estado",
      "error"
    );

    return;

  }


  renderSubtasks();


  ProjectFlow.showToast(
    "Estado actualizado",
    "success"
  );

}


/* ============================================================
   BORRAR SUBTAREA
============================================================ */

async function deleteSubtask(
  taskId
) {

  if (!ProjectFlow.canManageTasks()) {

    ProjectFlow.showToast(
      "No tienes permisos para eliminar subtareas",
      "error"
    );

    return;

  }


  const task =
    subtasks.find(
      item =>
        String(item.id) ===
        String(taskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la subtarea",
      "error"
    );

    return;

  }


  const confirmed =
    window.confirm(
      `¿Seguro que quieres eliminar la subtarea "${task.title}"?\n\nEsta acción no se puede deshacer.`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } = await supabaseClient

    .from("subtasks")

    .delete()

    .eq(
      "id",
      task.id
    );


  if (error) {

    console.error(
      "Error eliminando subtarea:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido eliminar la subtarea",
      "error"
    );

    return;

  }


  subtasks =
    subtasks.filter(
      item =>
        String(item.id) !==
        String(task.id)
    );


  assignments =
    assignments.filter(
      assignment =>
        String(
          assignment.subtask_id
        ) !==
        String(
          task.id
        )
    );


  renderAll();


  ProjectFlow.showToast(
    "Subtarea eliminada",
    "success"
  );

}


/* ============================================================
   BORRAR TAREA GLOBAL
============================================================ */

async function deleteGlobalTask(
  taskId
) {

  if (!ProjectFlow.canManageTasks()) {

    ProjectFlow.showToast(
      "No tienes permisos para eliminar tareas",
      "error"
    );

    return;

  }


  const task =
    globalTasks.find(
      item =>
        String(item.id) ===
        String(taskId)
    );


  if (!task) {

    ProjectFlow.showToast(
      "No se ha encontrado la tarea",
      "error"
    );

    return;

  }


  const taskSubtasks =
    subtasks.filter(
      subtask =>
        String(
          subtask.global_task_id
        ) ===
        String(
          task.id
        )
    );


  let message =
    `¿Seguro que quieres eliminar la tarea "${task.title}"?`;


  if (taskSubtasks.length > 0) {

    message +=
      `\n\nTambién se eliminarán ${taskSubtasks.length} ` +
      (
        taskSubtasks.length === 1
          ? "subtarea"
          : "subtareas"
      ) +
      ".";

  }


  message +=
    "\n\nEsta acción no se puede deshacer.";


  const confirmed =
    window.confirm(
      message
    );


  if (!confirmed) {
    return;
  }


  const deletedSubtaskIds =
    taskSubtasks.map(
      subtask =>
        String(
          subtask.id
        )
    );


  const {
    error
  } = await supabaseClient

    .from("global_tasks")

    .delete()

    .eq(
      "id",
      task.id
    );


  if (error) {

    console.error(
      "Error eliminando tarea global:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido eliminar la tarea",
      "error"
    );

    return;

  }


  globalTasks =
    globalTasks.filter(
      item =>
        String(item.id) !==
        String(task.id)
    );


  subtasks =
    subtasks.filter(
      subtask =>
        String(
          subtask.global_task_id
        ) !==
        String(
          task.id
        )
    );


  assignments =
    assignments.filter(
      assignment =>
        !deletedSubtaskIds.includes(
          String(
            assignment.subtask_id
          )
        )
    );


  selectedGlobalTaskId =
    globalTasks.length > 0
      ? globalTasks[0].id
      : null;


  editingGlobalTaskId =
    null;


  editingSubtaskId =
    null;


  renderAll();


  ProjectFlow.showToast(
    "Tarea eliminada",
    "success"
  );

}


/* ============================================================
   ORDENAR SUBTAREAS
============================================================ */

function sortSubtasks(
  a,
  b
) {

  if (
    a.status === "terminada"
    &&
    b.status !== "terminada"
  ) {

    return 1;

  }


  if (
    b.status === "terminada"
    &&
    a.status !== "terminada"
  ) {

    return -1;

  }


  if (
    !a.due_date
    &&
    !b.due_date
  ) {

    return 0;

  }


  if (!a.due_date) {
    return 1;
  }


  if (!b.due_date) {
    return -1;
  }


  return (

    ProjectFlow.parseDateOnly(
      a.due_date
    )

    -

    ProjectFlow.parseDateOnly(
      b.due_date
    )

  );

}


/* ============================================================
   HELPER
============================================================ */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value;

  }

}