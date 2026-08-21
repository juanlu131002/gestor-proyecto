/* ============================================================
   PROJECTFLOW — KANBAN.JS
============================================================ */


/* ============================================================
   ESTADO
============================================================ */

let kanbanSubtasks = [];
let kanbanGlobalTasks = [];
let kanbanAssignments = [];
let kanbanProfiles = [];

let draggedTaskId = null;

let updatingTaskIds =
  new Set();


/* ============================================================
   INIT
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await ProjectFlow.init();

      setupKanbanEvents();

      await loadKanbanData();

    } catch (error) {

      console.error(
        "Error cargando Kanban:",
        error
      );


      ProjectFlow.showToast(
        "No se ha podido cargar el Kanban",
        "error"
      );

    }

  }
);


/* ============================================================
   CARGAR DATOS
============================================================ */

async function loadKanbanData() {

  try {

    const [
      subtasksData,
      globalTasksData,
      assignmentsData,
      profilesData
    ] = await Promise.all([

      ProjectFlow.fetchSubtasks(),

      ProjectFlow.fetchGlobalTasks(),

      ProjectFlow.fetchAssignments(),

      ProjectFlow.fetchProfiles()
        .catch(
          error => {

            console.warn(
              "No se pudieron cargar todos los perfiles:",
              error
            );

            return [];

          }
        )

    ]);


    kanbanSubtasks =
      subtasksData || [];


    kanbanGlobalTasks =
      globalTasksData || [];


    kanbanAssignments =
      assignmentsData || [];


    kanbanProfiles =
      profilesData || [];


    renderGlobalTaskFilter();

    renderLegend();

    renderKanban();

  } catch (error) {

    console.error(
      "Error obteniendo datos del Kanban:",
      error
    );

    throw error;

  }

}


/* ============================================================
   RENDER GENERAL
============================================================ */

function renderKanban() {

  const filteredTasks =
    getFilteredTasks();


  renderSummary(
    filteredTasks
  );


  renderColumn(
    "sin_asignar",
    filteredTasks
  );


  renderColumn(
    "en_proceso",
    filteredTasks
  );


  renderColumn(
    "pendiente_evaluacion",
    filteredTasks
  );


  renderColumn(
    "terminada",
    filteredTasks
  );


  ProjectFlow.refreshIcons();

}


/* ============================================================
   SUMMARY
============================================================ */

function renderSummary(
  tasks
) {

  setKanbanText(
    "kanbanTotal",
    tasks.length
  );


  setKanbanText(
    "kanbanInProgress",

    tasks.filter(
      task =>
        task.status ===
        "en_proceso"
    ).length
  );


  setKanbanText(
    "kanbanCompleted",

    tasks.filter(
      task =>
        task.status ===
        "terminada"
    ).length
  );

}


/* ============================================================
   FILTROS
============================================================ */

function getFilteredTasks() {

  let tasks =
    [...kanbanSubtasks];


  /* ----------------------------------------------------------
     BUSCADOR
  ---------------------------------------------------------- */

  const search =
    document
      .getElementById(
        "kanbanSearch"
      )
      ?.value
      .trim()
      .toLowerCase()
    ||
    "";


  if (search) {

    tasks =
      tasks.filter(
        task => {

          const title =
            (
              task.title || ""
            ).toLowerCase();


          const description =
            (
              task.description || ""
            ).toLowerCase();


          return (
            title.includes(
              search
            )

            ||

            description.includes(
              search
            )
          );

        }
      );

  }


  /* ----------------------------------------------------------
     TAREA GLOBAL
  ---------------------------------------------------------- */

  const globalTaskId =
    document
      .getElementById(
        "kanbanGlobalFilter"
      )
      ?.value
    ||
    "";


  if (globalTaskId) {

    tasks =
      tasks.filter(
        task =>
          String(
            task.global_task_id
          ) ===
          String(
            globalTaskId
          )
      );

  }


  /* ----------------------------------------------------------
     PRIORIDAD
  ---------------------------------------------------------- */

  const priority =
    document
      .getElementById(
        "kanbanPriorityFilter"
      )
      ?.value
    ||
    "";


  if (priority) {

    tasks =
      tasks.filter(
        task =>
          task.priority ===
          priority
      );

  }


  return tasks;

}


/* ============================================================
   FILTRO DE TAREAS GLOBALES
============================================================ */

function renderGlobalTaskFilter() {

  const select =
    document.getElementById(
      "kanbanGlobalFilter"
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  select.innerHTML = `

    <option value="">
      Todas las tareas globales
    </option>

    ${kanbanGlobalTasks
      .map(
        task => `

          <option value="${task.id}">

            ${ProjectFlow.escapeHTML(
              task.title
            )}

          </option>

        `
      )
      .join("")}

  `;


  /*
     Conservamos selección
     si sigue existiendo.
  */

  const exists =
    kanbanGlobalTasks.some(
      task =>
        String(task.id) ===
        String(currentValue)
    );


  if (exists) {

    select.value =
      currentValue;

  }

}


/* ============================================================
   LEYENDA
============================================================ */

function renderLegend() {

  const container =
    document.getElementById(
      "kanbanLegend"
    );


  if (!container) {
    return;
  }


  if (
    kanbanGlobalTasks.length === 0
  ) {

    container.innerHTML = `
      <span class="kanban-legend-item">
        No hay tareas globales.
      </span>
    `;

    return;

  }


  container.innerHTML =
    kanbanGlobalTasks
      .map(
        task => `

          <span class="kanban-legend-item">

            <i
              class="kanban-legend-color"
              style="
                background:
                ${ProjectFlow.safeColor(
                  task.color
                )}
              "
            ></i>

            ${ProjectFlow.escapeHTML(
              task.title
            )}

          </span>

        `
      )
      .join("");

}


/* ============================================================
   COLUMNA
============================================================ */

function renderColumn(
  status,
  filteredTasks
) {

  const container =
    document.getElementById(
      `column-${status}`
    );


  if (!container) {
    return;
  }


  const tasks =
    filteredTasks
      .filter(
        task =>
          task.status ===
          status
      )
      .sort(
        sortKanbanTasks
      );


  setKanbanText(
    `count-${status}`,
    tasks.length
  );


  if (
    tasks.length === 0
  ) {

    container.innerHTML = `

      <div class="kanban-empty">

        <i data-lucide="inbox"></i>

        <strong>
          Sin subtareas
        </strong>

        <span>
          Arrastra una tarjeta hasta aquí.
        </span>

      </div>

    `;


    return;

  }


  container.innerHTML =
    tasks
      .map(
        task =>
          renderKanbanCard(
            task
          )
      )
      .join("");

}


/* ============================================================
   TARJETA
============================================================ */

function renderKanbanCard(
  task
) {

  const globalTask =
    kanbanGlobalTasks.find(
      item =>
        String(
          item.id
        ) ===
        String(
          task.global_task_id
        )
    );


  const color =
    ProjectFlow.safeColor(
      globalTask?.color
    );


  const globalTitle =
    globalTask?.title
    ||
    "Sin tarea global";


  /* ----------------------------------------------------------
     ASIGNACIONES
  ---------------------------------------------------------- */

  const assigned =
    kanbanAssignments.filter(
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
          kanbanProfiles.find(
            profile =>
              String(
                profile.id
              ) ===
              String(
                assignment.user_id
              )
          )
      )
      .filter(Boolean);


  const isSaving =
    updatingTaskIds.has(
      String(
        task.id
      )
    );


  return `

    <article
      class="
        kanban-card
        ${isSaving ? "kanban-saving" : ""}
      "
      draggable="${isSaving ? "false" : "true"}"
      data-kanban-task="${task.id}"
    >

      <!-- ================================================
           TOP
      ================================================= -->

      <div class="kanban-card-top">

        <div class="kanban-parent">

          <span
            class="kanban-parent-color"
            style="
              background:
              ${color}
            "
          ></span>


          <span title="${ProjectFlow.escapeHTML(globalTitle)}">

            ${ProjectFlow.escapeHTML(
              globalTitle
            )}

          </span>

        </div>


        <span
          class="
            kanban-priority
            ${task.priority}
          "
        >

          ${ProjectFlow.formatTaskPriority(
            task.priority
          )}

        </span>

      </div>


      <!-- ================================================
           TITLE
      ================================================= -->

      <h3>
        ${ProjectFlow.escapeHTML(
          task.title
        )}
      </h3>


      ${
        task.description

          ? `
            <p class="kanban-card-description">

              ${ProjectFlow.escapeHTML(
                task.description
              )}

            </p>
          `

          : ""
      }


      <!-- ================================================
           META
      ================================================= -->

      <div class="kanban-card-meta">

        <span class="kanban-due-date">

          ${
            task.due_date

              ? `

                <i data-lucide="calendar"></i>

                ${ProjectFlow.formatShortDate(
                  task.due_date
                )}

              `

              : `

                <i data-lucide="calendar-off"></i>

                Sin fecha

              `
          }

        </span>


        <div class="kanban-assignees">

          ${
            assignedProfiles.length > 0

              ? assignedProfiles
                  .slice(
                    0,
                    3
                  )
                  .map(
                    profile => {

                      const name =
                        profile.full_name
                        ||
                        profile.email
                        ||
                        "Usuario";


                      return `

                        <span
                          class="kanban-avatar"
                          title="${ProjectFlow.escapeHTML(name)}"
                        >

                          ${ProjectFlow.getInitials(
                            name
                          )}

                        </span>

                      `;

                    }
                  )
                  .join("")

              : `

                <span class="kanban-unassigned">
                  Sin asignar
                </span>

              `
          }


          ${
            assignedProfiles.length > 3

              ? `

                <span
                  class="kanban-avatar"
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
   EVENTOS
============================================================ */

function setupKanbanEvents() {

  /* ----------------------------------------------------------
     FILTROS
  ---------------------------------------------------------- */

  document
    .getElementById(
      "kanbanSearch"
    )
    ?.addEventListener(
      "input",
      renderKanban
    );


  document
    .getElementById(
      "kanbanGlobalFilter"
    )
    ?.addEventListener(
      "change",
      renderKanban
    );


  document
    .getElementById(
      "kanbanPriorityFilter"
    )
    ?.addEventListener(
      "change",
      renderKanban
    );


  /* ----------------------------------------------------------
     DRAG START
  ---------------------------------------------------------- */

  document.addEventListener(
    "dragstart",
    event => {

      const card =
        event.target.closest(
          "[data-kanban-task]"
        );


      if (!card) {
        return;
      }


      draggedTaskId =
        card.getAttribute(
          "data-kanban-task"
        );


      card.classList.add(
        "dragging"
      );


      if (
        event.dataTransfer
      ) {

        event.dataTransfer.effectAllowed =
          "move";


        event.dataTransfer.setData(
          "text/plain",
          draggedTaskId
        );

      }

    }
  );


  /* ----------------------------------------------------------
     DRAG END
  ---------------------------------------------------------- */

  document.addEventListener(
    "dragend",
    event => {

      const card =
        event.target.closest(
          "[data-kanban-task]"
        );


      if (card) {

        card.classList.remove(
          "dragging"
        );

      }


      draggedTaskId =
        null;


      clearDropZones();

    }
  );


  /* ----------------------------------------------------------
     DRAG OVER
  ---------------------------------------------------------- */

  document.addEventListener(
    "dragover",
    event => {

      const dropZone =
        event.target.closest(
          "[data-drop-zone]"
        );


      if (!dropZone) {
        return;
      }


      event.preventDefault();


      if (
        event.dataTransfer
      ) {

        event.dataTransfer.dropEffect =
          "move";

      }


      clearDropZones();


      dropZone.classList.add(
        "drag-over"
      );

    }
  );


  /* ----------------------------------------------------------
     DRAG LEAVE
  ---------------------------------------------------------- */

  document.addEventListener(
    "dragleave",
    event => {

      const dropZone =
        event.target.closest(
          "[data-drop-zone]"
        );


      if (!dropZone) {
        return;
      }


      /*
         Solo quitamos highlight si realmente
         hemos salido de la zona.
      */

      if (
        event.relatedTarget
        &&
        dropZone.contains(
          event.relatedTarget
        )
      ) {

        return;

      }


      dropZone.classList.remove(
        "drag-over"
      );

    }
  );


  /* ----------------------------------------------------------
     DROP
  ---------------------------------------------------------- */

  document.addEventListener(
    "drop",
    async event => {

      const dropZone =
        event.target.closest(
          "[data-drop-zone]"
        );


      if (!dropZone) {
        return;
      }


      event.preventDefault();


      const newStatus =
        dropZone.getAttribute(
          "data-drop-zone"
        );


      const taskId =
        draggedTaskId
        ||
        event.dataTransfer
          ?.getData(
            "text/plain"
          );


      clearDropZones();


      if (
        !taskId
        ||
        !newStatus
      ) {

        return;

      }


      await moveTaskToStatus(
        taskId,
        newStatus
      );

    }
  );

}


/* ============================================================
   CAMBIAR ESTADO
============================================================ */

async function moveTaskToStatus(
  taskId,
  newStatus
) {

  const validStatuses = [

    "sin_asignar",

    "en_proceso",

    "pendiente_evaluacion",

    "terminada"

  ];


  if (
    !validStatuses.includes(
      newStatus
    )
  ) {

    return;

  }


  const task =
    kanbanSubtasks.find(
      item =>
        String(
          item.id
        ) ===
        String(
          taskId
        )
    );


  if (!task) {

    console.error(
      "No se encuentra la subtarea:",
      taskId
    );

    return;

  }


  /*
     Si la sueltas en su propia columna
     no hacemos nada.
  */

  if (
    task.status ===
    newStatus
  ) {

    return;

  }


  /*
     Evitamos dobles updates.
  */

  if (
    updatingTaskIds.has(
      String(
        task.id
      )
    )
  ) {

    return;

  }


  const oldStatus =
    task.status;


  updatingTaskIds.add(
    String(
      task.id
    )
  );


  /*
     UI OPTIMISTA
  */

  task.status =
    newStatus;


  renderKanban();


  /* ==========================================================
     SUPABASE
  ========================================================== */

  const {
    error
  } = await supabaseClient

    .from(
      "subtasks"
    )

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


  updatingTaskIds.delete(
    String(
      task.id
    )
  );


  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {

    console.error(
      "Error actualizando estado:",
      error
    );


    /*
       Restaurar estado anterior.
    */

    task.status =
      oldStatus;


    renderKanban();


    ProjectFlow.showToast(
      "No se ha podido mover la subtarea",
      "error"
    );


    return;

  }


  /*
     Render final para quitar estado saving.
  */

  renderKanban();


  ProjectFlow.showToast(
    "Estado actualizado",
    "success"
  );

}


/* ============================================================
   LIMPIAR DROP ZONES
============================================================ */

function clearDropZones() {

  document
    .querySelectorAll(
      "[data-drop-zone]"
    )
    .forEach(
      zone => {

        zone.classList.remove(
          "drag-over"
        );

      }
    );

}


/* ============================================================
   ORDEN
============================================================ */

function sortKanbanTasks(
  a,
  b
) {

  /* ----------------------------------------------------------
     PRIORIDAD
  ---------------------------------------------------------- */

  const priorityOrder = {

    alta:
      0,

    media:
      1,

    baja:
      2

  };


  const priorityA =
    priorityOrder[
      a.priority
    ]
    ??
    99;


  const priorityB =
    priorityOrder[
      b.priority
    ]
    ??
    99;


  if (
    priorityA !==
    priorityB
  ) {

    return (
      priorityA -
      priorityB
    );

  }


  /* ----------------------------------------------------------
     FECHA
  ---------------------------------------------------------- */

  if (
    a.due_date
    &&
    b.due_date
  ) {

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


  if (
    a.due_date
    &&
    !b.due_date
  ) {

    return -1;

  }


  if (
    !a.due_date
    &&
    b.due_date
  ) {

    return 1;

  }


  return (
    a.title || ""
  ).localeCompare(
    b.title || "",
    "es"
  );

}


/* ============================================================
   HELPER
============================================================ */

function setKanbanText(
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