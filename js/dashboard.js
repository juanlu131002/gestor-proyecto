/* ============================================================
   PROJECTFLOW
   DASHBOARD DINÁMICO + SUPABASE
============================================================ */


/* ============================================================
   ESTADO GLOBAL
============================================================ */

let currentUser = null;
let currentProfile = null;

let globalTasks = [];
let subtasks = [];
let assignments = [];
let meetings = [];


/* ============================================================
   INICIAR
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  try {

    await initDashboard();

  } catch (error) {

    console.error(
      "Error cargando ProjectFlow:",
      error
    );

    showFatalError(error);

  }

});


async function initDashboard() {

  /* ----------------------------------------------------------
     1. SESIÓN
  ---------------------------------------------------------- */

  const {
    data: { session },
    error
  } = await supabaseClient.auth.getSession();


  if (error) {
    throw error;
  }


  if (!session) {

    window.location.href =
      "index.html";

    return;

  }


  currentUser =
    session.user;


  /*
     app.js necesita conocer al usuario actual
     para poder calcular sus notificaciones.
  */

  if (window.ProjectFlow) {

    window.ProjectFlow.user =
      currentUser;

  }


  /* ----------------------------------------------------------
     2. PERFIL
  ---------------------------------------------------------- */

  await loadProfile();


  /* ----------------------------------------------------------
     3. DATOS DEL PROYECTO
  ---------------------------------------------------------- */

  await Promise.all([

    loadGlobalTasks(),

    loadSubtasks(),

    loadAssignments(),

    loadMeetings()

  ]);


  /* ----------------------------------------------------------
     4. PINTAR
  ---------------------------------------------------------- */

  renderUser();

  renderDate();

  renderStats();

  renderAgenda();

  renderMyTasks();

  renderGlobalTasks();

  renderNextMeeting();


  /* ----------------------------------------------------------
     5. EVENTOS
  ---------------------------------------------------------- */

  setupEvents();


  /*
     Notificaciones (tareas asignadas y fechas
     límite próximas), definidas en app.js.
  */

  if (
    window.ProjectFlow
    &&
    window.ProjectFlow.setupNotifications
  ) {

    window.ProjectFlow.setupNotifications();

  }


  /*
     Lucide tiene que ejecutarse otra vez
     porque acabamos de crear HTML dinámicamente.
  */

  refreshIcons();

}


/* ============================================================
   SUPABASE — PERFIL
============================================================ */

async function loadProfile() {

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();


  if (error) {
    throw error;
  }


  currentProfile = data;

}


/* ============================================================
   SUPABASE — TAREAS GLOBALES
============================================================ */

async function loadGlobalTasks() {

  const {
    data,
    error
  } = await supabaseClient
    .from("global_tasks")
    .select("*")
    .order(
      "created_at",
      {
        ascending: true
      }
    );


  if (error) {
    throw error;
  }


  globalTasks =
    data || [];

}


/* ============================================================
   SUPABASE — SUBTAREAS
============================================================ */

async function loadSubtasks() {

  const {
    data,
    error
  } = await supabaseClient
    .from("subtasks")
    .select("*")
    .order(
      "due_date",
      {
        ascending: true,
        nullsFirst: false
      }
    );


  if (error) {
    throw error;
  }


  subtasks =
    data || [];

}


/* ============================================================
   SUPABASE — ASIGNACIONES
============================================================ */

async function loadAssignments() {

  const {
    data,
    error
  } = await supabaseClient
    .from("task_assignments")
    .select("*");


  if (error) {
    throw error;
  }


  assignments =
    data || [];

}


/* ============================================================
   SUPABASE — REUNIONES
============================================================ */

async function loadMeetings() {

  const {
    data,
    error
  } = await supabaseClient
    .from("meetings")
    .select("*")
    .order(
      "starts_at",
      {
        ascending: true
      }
    );


  if (error) {
    throw error;
  }


  meetings =
    data || [];

}


/* ============================================================
   USUARIO
============================================================ */

function renderUser() {

  const name =
    currentProfile.full_name ||
    currentProfile.email ||
    "Usuario";


  const firstName =
    name
      .trim()
      .split(/\s+/)[0];


  setText(
    "sidebarUserName",
    name
  );


  setText(
    "sidebarUserRole",
    formatRole(
      currentProfile.role
    )
  );


  setText(
    "sidebarAvatar",
    getInitials(name)
  );


  setText(
    "heroUserName",
    `${firstName}.`
  );

}


/* ============================================================
   FECHA + SEMANA
============================================================ */

function renderDate() {

  const now =
    new Date();


  const formattedDate =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    )
      .format(now)
      .toUpperCase();


  setText(
    "currentDate",
    formattedDate
  );


  setText(
    "currentWeek",
    String(
      getISOWeek(now)
    ).padStart(2, "0")
  );


  setText(
    "weekYear",
    now.getFullYear()
  );

}


/* ============================================================
   ESTADÍSTICAS
============================================================ */

function renderStats() {

  const total =
    subtasks.length;


  const inProgress =
    subtasks.filter(
      task =>
        task.status ===
        "en_proceso"
    ).length;


  const completed =
    subtasks.filter(
      task =>
        task.status ===
        "terminada"
    ).length;


  const percentage =
    total > 0

      ? Math.round(
          (completed / total)
          * 100
        )

      : 0;


  setText(
    "totalTasks",
    total
  );


  setText(
    "inProgressTasks",
    inProgress
  );


  setText(
    "completedTasks",
    completed
  );


  setText(
    "completedPercentage",
    `${percentage}% completado`
  );


  setText(
    "progressPercentage",
    `${percentage}%`
  );


  const bar =
    document.getElementById(
      "progressBar"
    );


  if (bar) {

    bar.style.width =
      `${percentage}%`;

  }

}


/* ============================================================
   AGENDA
============================================================ */

function renderAgenda() {

  const container =
    document.getElementById(
      "agendaContainer"
    );


  if (!container) {
    return;
  }


  const today =
    startOfDay(
      new Date()
    );


  const agendaItems = [];


  /* ----------------------------------------------------------
     SUBTAREAS
  ---------------------------------------------------------- */

  subtasks.forEach(task => {

    if (!task.due_date) {
      return;
    }


    const date =
      parseDateOnly(
        task.due_date
      );


    /*
      No enseñamos tareas terminadas
      ni fechas anteriores.
    */

    if (
      task.status === "terminada"
      ||
      date < today
    ) {
      return;
    }


    const parent =
      globalTasks.find(
        item =>
          item.id ===
          task.global_task_id
      );


    agendaItems.push({

      type: "task",

      id: task.id,

      date,

      title: task.title,

      subtitle:
        parent?.title ||
        "Proyecto",

      color:
        parent?.color ||
        "#c96a4a",

      priority:
        task.priority,

      status:
        task.status

    });

  });


  /* ----------------------------------------------------------
     REUNIONES
  ---------------------------------------------------------- */

  meetings.forEach(meeting => {

    const start =
      new Date(
        meeting.starts_at
      );


    if (
      startOfDay(start) <
      today
    ) {
      return;
    }


    agendaItems.push({

      type: "meeting",

      id: meeting.id,

      date: start,

      endDate:
        meeting.ends_at
          ? new Date(
              meeting.ends_at
            )
          : null,

      title:
        meeting.title,

      subtitle:
        "Reunión",

      color:
        "#607c91",

      url:
        meeting.meeting_url

    });

  });


  /* ----------------------------------------------------------
     ORDENAR
  ---------------------------------------------------------- */

  agendaItems.sort(
    (a, b) =>
      a.date - b.date
  );


  /*
     Mostramos máximo 12 elementos
     en dashboard.
  */

  const visibleItems =
    agendaItems.slice(
      0,
      12
    );


  if (
    visibleItems.length === 0
  ) {

    container.innerHTML = `

      <div class="dashboard-empty">

        <i data-lucide="calendar-check"></i>

        <p>
          No hay próximas entregas
          ni reuniones.
        </p>

      </div>

    `;

    refreshIcons();

    return;

  }


  /* ----------------------------------------------------------
     AGRUPAR POR DÍA
  ---------------------------------------------------------- */

  const groups =
    new Map();


  visibleItems.forEach(item => {

    const key =
      getDateKey(
        item.date
      );


    if (
      !groups.has(key)
    ) {

      groups.set(
        key,
        []
      );

    }


    groups
      .get(key)
      .push(item);

  });


  /* ----------------------------------------------------------
     HTML
  ---------------------------------------------------------- */

  container.innerHTML =
    Array.from(
      groups.values()
    )
      .map(
        items =>
          renderAgendaDay(items)
      )
      .join("");


  refreshIcons();

}


/* ============================================================
   DÍA DE AGENDA
============================================================ */

function renderAgendaDay(items) {

  const date =
    items[0].date;


  const today =
    isSameDay(
      date,
      new Date()
    );


  return `

    <article class="day-row">

      <div class="
        day-column
        ${today ? "selected-day" : ""}
      ">

        <span>
          ${formatWeekday(date)}
        </span>

        <strong>
          ${String(
            date.getDate()
          ).padStart(2, "0")}
        </strong>

        <small>
          ${formatMonth(date)}
        </small>

      </div>


      <div class="day-events">

        ${items
          .map(
            item =>
              renderAgendaItem(item)
          )
          .join("")}

      </div>

    </article>

  `;

}


/* ============================================================
   ELEMENTO DE AGENDA
============================================================ */

function renderAgendaItem(item) {

  if (
    item.type === "meeting"
  ) {

    return `

      <div class="event">

        <span
          class="event-bar"
          style="
            background:
            ${safeColor(item.color)}
          "
        ></span>


        <div class="event-main">

          <strong>
            ${escapeHTML(
              item.title
            )}
          </strong>

          <span>
            Reunión
          </span>

        </div>


        <div class="event-meta">

          <span>
            ${formatTime(
              item.date
            )}
          </span>


          ${
            item.endDate
              ? `

                <strong>

                  →
                  ${formatTime(
                    item.endDate
                  )}

                </strong>

              `
              : ""
          }

        </div>

      </div>

    `;

  }


  return `

    <div class="event">

      <span
        class="event-bar"
        style="
          background:
          ${safeColor(item.color)}
        "
      ></span>


      <div class="event-main">

        <strong>
          ${escapeHTML(
            item.title
          )}
        </strong>

        <span>

          ${escapeHTML(
            item.subtitle
          )}

          · Subtarea

        </span>

      </div>


      <div class="event-meta">

        ${
          item.priority === "alta"

            ? `
              <span class="high-tag">
                ALTA
              </span>
            `

            : `
              <span>
                ENTREGA
              </span>
            `
        }

      </div>

    </div>

  `;

}


/* ============================================================
   MIS TAREAS
============================================================ */

function renderMyTasks() {

  const container =
    document.getElementById(
      "myTasksContainer"
    );


  if (!container) {
    return;
  }


  const assignedTaskIds =
    new Set(

      assignments

        .filter(
          assignment =>
            assignment.user_id ===
            currentUser.id
        )

        .map(
          assignment =>
            assignment.subtask_id
        )

    );


  const myTasks =
    subtasks

      .filter(
        task =>

          assignedTaskIds.has(
            task.id
          )

          &&

          task.status !==
          "terminada"
      )

      .sort(
        sortByDueDate
      )

      .slice(
        0,
        5
      );


  if (
    myTasks.length === 0
  ) {

    container.innerHTML = `

      <div class="dashboard-empty-small">

        No tienes tareas
        pendientes asignadas.

      </div>

    `;

    return;

  }


  container.innerHTML =
    myTasks
      .map(task => {

        const parent =
          globalTasks.find(
            item =>
              item.id ===
              task.global_task_id
          );


        return `

          <div class="mini-task">

            <button
              class="task-check"
              data-complete-task="${task.id}"
              title="Marcar como terminada"
            ></button>


            <span
              class="mini-task-color"
              style="
                background:
                ${safeColor(
                  parent?.color
                )}
              "
            ></span>


            <div>

              <strong>
                ${escapeHTML(
                  task.title
                )}
              </strong>

              <span>

                ${
                  task.due_date

                    ? formatShortDate(
                        parseDateOnly(
                          task.due_date
                        )
                      )

                    : "SIN FECHA"
                }

              </span>

            </div>

          </div>

        `;

      })
      .join("");

}


/* ============================================================
   TAREAS GLOBALES
============================================================ */

function renderGlobalTasks() {

  const container =
    document.getElementById(
      "globalTasksContainer"
    );


  if (!container) {
    return;
  }


  if (
    globalTasks.length === 0
  ) {

    container.innerHTML = `

      <div class="dashboard-empty-small">

        Todavía no hay
        tareas globales.

      </div>

    `;

    return;

  }


  container.innerHTML =
    globalTasks
      .map(globalTask => {

        const children =
          subtasks.filter(
            task =>
              task.global_task_id ===
              globalTask.id
          );


        const completed =
          children.filter(
            task =>
              task.status ===
              "terminada"
          ).length;


        const total =
          children.length;


        const percentage =
          total > 0

            ? Math.round(
                (completed / total)
                * 100
              )

            : 0;


        return `

          <div class="global-task">

            <div
              class="global-color"
              style="
                background:
                ${safeColor(
                  globalTask.color
                )}
              "
            ></div>


            <div class="global-info">

              <div>

                <strong>
                  ${escapeHTML(
                    globalTask.title
                  )}
                </strong>

                <span>
                  ${completed} / ${total}
                </span>

              </div>


              <div class="small-progress">

                <span
                  style="
                    width:
                    ${percentage}%;

                    background:
                    ${safeColor(
                      globalTask.color
                    )};
                  "
                ></span>

              </div>

            </div>

          </div>

        `;

      })
      .join("");

}


/* ============================================================
   PRÓXIMA REUNIÓN
============================================================ */

function renderNextMeeting() {

  const container =
    document.getElementById(
      "nextMeetingContainer"
    );


  if (!container) {
    return;
  }


  const now =
    new Date();


  const futureMeetings =
    meetings
      .filter(
        meeting =>
          new Date(
            meeting.starts_at
          ) >= now
      )
      .sort(
        (a, b) =>
          new Date(a.starts_at)
          -
          new Date(b.starts_at)
      );


  const meeting =
    futureMeetings[0];


  if (!meeting) {

    container.innerHTML = `

      <span class="meeting-label">
        PRÓXIMA REUNIÓN
      </span>

      <div class="meeting-copy">

        <h3>
          Sin reuniones programadas
        </h3>

        <p>
          Cuando se cree una reunión
          aparecerá aquí.
        </p>

      </div>

    `;

    return;

  }


  const start =
    new Date(
      meeting.starts_at
    );


  const end =
    meeting.ends_at
      ? new Date(
          meeting.ends_at
        )
      : null;


  container.innerHTML = `

    <span class="meeting-label">
      PRÓXIMA REUNIÓN
    </span>


    <div class="meeting-date">

      <span>
        ${formatWeekday(start)}
      </span>

      <strong>
        ${String(
          start.getDate()
        ).padStart(2, "0")}
      </strong>

    </div>


    <div class="meeting-copy">

      <h3>
        ${escapeHTML(
          meeting.title
        )}
      </h3>

      <p>

        ${formatTime(start)}

        ${
          end
            ? ` → ${formatTime(end)}`
            : ""
        }

      </p>

    </div>


    ${
      meeting.meeting_url

        ? `

          <button
            data-meeting-url="${escapeHTML(meeting.meeting_url)}"
          >

            Abrir reunión

            <i data-lucide="arrow-up-right"></i>

          </button>

        `

        : ""
    }

  `;


  refreshIcons();

}


/* ============================================================
   EVENTOS
============================================================ */

function setupEvents() {

  /* ----------------------------------------------------------
     LOGOUT
  ---------------------------------------------------------- */

  const logoutButton =
    document.getElementById(
      "logoutButton"
    );


  logoutButton?.addEventListener(
    "click",
    logout
  );


  /* ----------------------------------------------------------
     NUEVA TAREA
  ---------------------------------------------------------- */

  const newTaskButton =
    document.getElementById(
      "newTaskButton"
    );


  newTaskButton?.addEventListener(
    "click",
    () => {

      /*
        De momento enviamos a Tareas.

        Ahí construiremos el modal
        para crear tareas/subtareas.
      */

      window.location.href =
        "tasks.html";

    }
  );


  /* ----------------------------------------------------------
     EVENT DELEGATION
  ---------------------------------------------------------- */

  document.addEventListener(
    "click",
    async event => {

      /*
         COMPLETAR TAREA
      */

      const completeButton =
        event.target.closest(
          "[data-complete-task]"
        );


      if (completeButton) {

        await completeTask(
          completeButton.dataset
            .completeTask
        );

        return;

      }


      /*
         ABRIR REUNIÓN
      */

      const meetingButton =
        event.target.closest(
          "[data-meeting-url]"
        );


      if (meetingButton) {

        const url =
          (
            meetingButton.dataset
              .meetingUrl || ""
          ).trim();


        if (url) {

          window.open(
            url,
            "_blank",
            "noopener,noreferrer"
          );

        }

      }

    }
  );

}


/* ============================================================
   COMPLETAR TAREA
============================================================ */

async function completeTask(
  taskId
) {

  /*
     El id llega desde un atributo data-*,
     así que siempre es un string. Lo
     limpiamos por si acaso arrastra
     espacios o saltos de línea.
  */

  const cleanTaskId =
    (taskId || "").trim();


  if (!cleanTaskId) {
    return;
  }


  const {
    error
  } = await supabaseClient
    .from("subtasks")
    .update({

      status:
        "terminada",

      updated_at:
        new Date()
          .toISOString()

    })
    .eq(
      "id",
      cleanTaskId
    );


  if (error) {

    console.error(error);

    alert(
      "No se ha podido actualizar la tarea."
    );

    return;

  }


  const task =
    subtasks.find(
      task =>
        String(task.id) ===
        cleanTaskId
    );


  if (task) {

    task.status =
      "terminada";

  }


  /*
     Redibujar partes afectadas
  */

  renderStats();

  renderAgenda();

  renderMyTasks();

  renderGlobalTasks();

}


/* ============================================================
   LOGOUT
============================================================ */

async function logout() {

  const {
    error
  } = await supabaseClient
    .auth
    .signOut();


  if (error) {

    console.error(error);

    return;

  }


  window.location.href =
    "index.html";

}


/* ============================================================
   FECHAS
============================================================ */

function parseDateOnly(value) {

  const [
    year,
    month,
    day
  ] = value
    .split("-")
    .map(Number);


  return new Date(
    year,
    month - 1,
    day
  );

}


function startOfDay(date) {

  return new Date(

    date.getFullYear(),

    date.getMonth(),

    date.getDate()

  );

}


function isSameDay(a, b) {

  return (

    a.getFullYear()
      ===
      b.getFullYear()

    &&

    a.getMonth()
      ===
      b.getMonth()

    &&

    a.getDate()
      ===
      b.getDate()

  );

}


function getDateKey(date) {

  return [

    date.getFullYear(),

    String(
      date.getMonth() + 1
    ).padStart(2, "0"),

    String(
      date.getDate()
    ).padStart(2, "0")

  ].join("-");

}


function formatWeekday(date) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday: "short"
    }
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

}


function formatMonth(date) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      month: "short"
    }
  )
    .format(date)
    .replace(".", "")
    .toUpperCase();

}


function formatTime(date) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }
  )
    .format(date);

}


function formatShortDate(date) {

  if (
    isSameDay(
      date,
      new Date()
    )
  ) {

    return "HOY";

  }


  return (

    String(
      date.getDate()
    ).padStart(2, "0")

    +

    " "

    +

    formatMonth(date)

  );

}


/* ============================================================
   SEMANA ISO
============================================================ */

function getISOWeek(date) {

  const temp =
    new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      )
    );


  const day =
    temp.getUTCDay() || 7;


  temp.setUTCDate(
    temp.getUTCDate()
    + 4
    - day
  );


  const yearStart =
    new Date(
      Date.UTC(
        temp.getUTCFullYear(),
        0,
        1
      )
    );


  return Math.ceil(
    (
      (
        temp - yearStart
      )
      /
      86400000
      + 1
    )
    /
    7
  );

}


/* ============================================================
   ORDEN
============================================================ */

function sortByDueDate(a, b) {

  if (
    !a.due_date &&
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
    parseDateOnly(
      a.due_date
    )
    -
    parseDateOnly(
      b.due_date
    )
  );

}


/* ============================================================
   HELPERS
============================================================ */

function setText(
  id,
  value
) {

  const element =
    document.getElementById(id);


  if (element) {

    element.textContent =
      value;

  }

}


function formatRole(role) {

  if (
    role === "profesor"
  ) {

    return "Profesor";

  }


  return "Estudiante";

}


function getInitials(name) {

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      word =>
        word.charAt(0)
    )
    .join("")
    .toUpperCase();

}


/* ============================================================
   SEGURIDAD HTML
============================================================ */

function escapeHTML(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/* ============================================================
   VALIDAR COLOR
============================================================ */

function safeColor(color) {

  /*
     Solo permitimos hexadecimal.

     Evitamos meter cualquier texto
     procedente de BD dentro de style.
  */

  if (
    typeof color === "string"
    &&
    /^#[0-9A-Fa-f]{6}$/.test(
      color
    )
  ) {

    return color;

  }


  return "#c96a4a";

}


/* ============================================================
   ICONOS
============================================================ */

function refreshIcons() {

  if (
    window.lucide
  ) {

    lucide.createIcons();

  }

}


/* ============================================================
   ERROR
============================================================ */

function showFatalError(error) {

  const agenda =
    document.getElementById(
      "agendaContainer"
    );


  if (agenda) {

    agenda.innerHTML = `

      <div class="dashboard-empty">

        <p>
          No se han podido cargar
          los datos del proyecto.
        </p>

        <small>
          Revisa la consola del navegador.
        </small>

      </div>

    `;

  }

}