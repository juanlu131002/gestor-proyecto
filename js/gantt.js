/* ============================================================
   PROJECTFLOW — GANTT.JS
============================================================ */


/* ============================================================
   ESTADO
============================================================ */

let ganttSubtasks = [];
let ganttGlobalTasks = [];

let ganttRangeDays = 60;

let ganttStartDate =
  createDefaultStartDate(
    ganttRangeDays
  );


/* ============================================================
   INIT
============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    try {

      await ProjectFlow.init();

      setupGanttEvents();

      await loadGanttData();

    } catch (error) {

      console.error(
        "Error cargando Gantt:",
        error
      );


      ProjectFlow.showToast(
        "No se ha podido cargar el diagrama de Gantt",
        "error"
      );

    }

  }
);


/* ============================================================
   CARGAR DATOS
============================================================ */

async function loadGanttData() {

  try {

    const [
      subtasksData,
      globalTasksData
    ] = await Promise.all([

      ProjectFlow.fetchSubtasks(),

      ProjectFlow.fetchGlobalTasks()

    ]);


    ganttSubtasks =
      subtasksData || [];


    ganttGlobalTasks =
      globalTasksData || [];


    renderLegend();

    renderSummary();

    renderUnplanned();

    renderGantt();

  } catch (error) {

    console.error(
      "Error obteniendo datos del Gantt:",
      error
    );

    throw error;

  }

}


/* ============================================================
   SUMMARY
============================================================ */

function renderSummary() {

  const planned =
    ganttSubtasks.filter(
      hasAnyPlanningDate
    );


  const unplanned =
    ganttSubtasks.filter(
      task =>
        !hasAnyPlanningDate(
          task
        )
    );


  const completed =
    ganttSubtasks.filter(
      task =>
        task.status ===
        "terminada"
    );


  setGanttText(
    "ganttPlannedCount",
    planned.length
  );


  setGanttText(
    "ganttUnplannedCount",
    unplanned.length
  );


  setGanttText(
    "ganttCompletedCount",
    completed.length
  );

}


/* ============================================================
   LEYENDA
============================================================ */

function renderLegend() {

  const container =
    document.getElementById(
      "ganttLegend"
    );


  if (!container) {
    return;
  }


  if (
    ganttGlobalTasks.length === 0
  ) {

    container.innerHTML = `

      <span class="gantt-legend-item">
        No hay tareas globales.
      </span>

    `;

    return;

  }


  container.innerHTML =
    ganttGlobalTasks
      .map(
        task => `

          <span class="gantt-legend-item">

            <i
              class="gantt-legend-color"
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
   SIN PLANIFICAR
============================================================ */

function renderUnplanned() {

  const section =
    document.getElementById(
      "ganttUnplannedSection"
    );


  const container =
    document.getElementById(
      "ganttUnplannedList"
    );


  if (
    !section
    ||
    !container
  ) {

    return;

  }


  const tasks =
    ganttSubtasks.filter(
      task =>
        !hasAnyPlanningDate(
          task
        )
    );


  setGanttText(
    "ganttUnplannedBadge",
    tasks.length
  );


  if (
    tasks.length === 0
  ) {

    section.hidden =
      true;

    return;

  }


  section.hidden =
    false;


  container.innerHTML =
    tasks
      .map(
        task => {

          const globalTask =
            findGlobalTask(
              task.global_task_id
            );


          const color =
            ProjectFlow.safeColor(
              globalTask?.color
            );


          return `

            <article class="gantt-unplanned-item">

              <span
                class="gantt-unplanned-color"
                style="
                  background:
                  ${color}
                "
              ></span>


              <div class="gantt-unplanned-copy">

                <strong>

                  ${ProjectFlow.escapeHTML(
                    task.title
                  )}

                </strong>


                <span>

                  ${
                    globalTask

                      ? ProjectFlow.escapeHTML(
                          globalTask.title
                        )

                      : "Sin tarea global"
                  }

                  ·

                  ${ProjectFlow.formatTaskStatus(
                    task.status
                  )}

                </span>

              </div>

            </article>

          `;

        }
      )
      .join("");


  ProjectFlow.refreshIcons();

}


/* ============================================================
   RENDER GENERAL GANTT
============================================================ */

function renderGantt() {

  const board =
    document.getElementById(
      "ganttBoard"
    );


  if (!board) {
    return;
  }


  const dates =
    buildDateRange(
      ganttStartDate,
      ganttRangeDays
    );


  renderPeriodTitle(
    dates
  );


  const plannedTasks =
    ganttSubtasks.filter(
      hasAnyPlanningDate
    );


  if (
    plannedTasks.length === 0
  ) {

    board.innerHTML = `

      <div class="gantt-empty">

        <i data-lucide="chart-gantt"></i>

        <strong>
          No hay subtareas planificadas
        </strong>

        <span>
          Añade una fecha de inicio o una fecha límite desde la pantalla de tareas para que aparezcan aquí.
        </span>

      </div>

    `;


    ProjectFlow.refreshIcons();

    return;

  }


  const grouped =
    groupTasksByGlobalTask(
      plannedTasks
    );


  board.innerHTML = `

    ${renderGanttHeader(
      dates
    )}

    ${grouped
      .map(
        group =>
          renderGlobalGroup(
            group,
            dates
          )
      )
      .join("")}

  `;


  ProjectFlow.refreshIcons();

}


/* ============================================================
   HEADER
============================================================ */

function renderGanttHeader(
  dates
) {

  return `

    <div class="gantt-header-row">

      <div class="gantt-header-label">
        SUBTAREA
      </div>


      <div class="gantt-date-header">

        ${dates
          .map(
            date => `

              <div
                class="
                  gantt-day-header
                  ${
                    isWeekend(
                      date
                    )
                      ? "weekend"
                      : ""
                  }
                  ${
                    isSameCalendarDay(
                      date,
                      new Date()
                    )
                      ? "today"
                      : ""
                  }
                "
              >

                <span>
                  ${formatWeekday(
                    date
                  )}
                </span>

                <strong>
                  ${date.getDate()}
                </strong>

              </div>

            `
          )
          .join("")}

      </div>

    </div>

  `;

}


/* ============================================================
   AGRUPAR
============================================================ */

function groupTasksByGlobalTask(
  tasks
) {

  const groups = [];


  /*
     Primero respetamos el orden
     de global_tasks.
  */

  ganttGlobalTasks.forEach(
    globalTask => {

      const children =
        tasks
          .filter(
            task =>
              String(
                task.global_task_id
              ) ===
              String(
                globalTask.id
              )
          )
          .sort(
            sortTasksByDate
          );


      if (
        children.length > 0
      ) {

        groups.push({

          globalTask,

          tasks:
            children

        });

      }

    }
  );


  /*
     Por seguridad, añadimos subtareas
     cuya tarea global no exista.
  */

  const orphanTasks =
    tasks
      .filter(
        task =>
          !ganttGlobalTasks.some(
            globalTask =>
              String(
                globalTask.id
              ) ===
              String(
                task.global_task_id
              )
          )
      )
      .sort(
        sortTasksByDate
      );


  if (
    orphanTasks.length > 0
  ) {

    groups.push({

      globalTask: {
        id:
          "orphan",

        title:
          "Sin tarea global",

        color:
          "#948b7e"
      },

      tasks:
        orphanTasks

    });

  }


  return groups;

}


/* ============================================================
   GLOBAL GROUP
============================================================ */

function renderGlobalGroup(
  group,
  dates
) {

  const globalTask =
    group.globalTask;


  const color =
    ProjectFlow.safeColor(
      globalTask.color
    );


  const completed =
    group.tasks.filter(
      task =>
        task.status ===
        "terminada"
    ).length;


  return `

    <section class="gantt-global-group">


      <!-- GLOBAL HEADER -->

      <div class="gantt-global-header">

        <div class="gantt-global-info">

          <span
            class="gantt-global-color"
            style="
              background:
              ${color}
            "
          ></span>


          <div class="gantt-global-copy">

            <strong>
              ${ProjectFlow.escapeHTML(
                globalTask.title
              )}
            </strong>

            <span>

              ${completed}/${group.tasks.length}
              terminadas

            </span>

          </div>

        </div>


        <div class="gantt-global-track">

          ${renderTimelineGrid(
            dates
          )}

          ${renderTodayLine(
            dates
          )}

        </div>

      </div>


      <!-- SUBTASKS -->

      ${group.tasks
        .map(
          task =>
            renderTaskRow(
              task,
              globalTask,
              dates
            )
        )
        .join("")}


    </section>

  `;

}


/* ============================================================
   TASK ROW
============================================================ */

function renderTaskRow(
  task,
  globalTask,
  dates
) {

  const color =
    ProjectFlow.safeColor(
      globalTask.color
    );


  const planning =
    getTaskPlanningDates(
      task
    );


  const bar =
    calculateBar(
      planning.start,
      planning.end,
      dates
    );


  const startLabel =
    task.start_date

      ? ProjectFlow.formatShortDate(
          task.start_date
        )

      : "—";


  const dueLabel =
    task.due_date

      ? ProjectFlow.formatShortDate(
          task.due_date
        )

      : "—";


  return `

    <div class="gantt-task-row">


      <!-- ================================================
           INFO
      ================================================= -->

      <div class="gantt-task-info">

        <span
          class="gantt-task-accent"
          style="
            background:
            ${color}
          "
        ></span>


        <div class="gantt-task-copy">

          <strong
            title="${ProjectFlow.escapeHTML(task.title)}"
          >
            ${ProjectFlow.escapeHTML(
              task.title
            )}
          </strong>


          <div class="gantt-task-meta">

            <span>

              <i data-lucide="play"></i>

              ${startLabel}

            </span>


            <span>

              <i data-lucide="flag"></i>

              ${dueLabel}

            </span>


            <span>

              ${ProjectFlow.formatTaskStatus(
                task.status
              )}

            </span>

          </div>

        </div>

      </div>


      <!-- ================================================
           TIMELINE
      ================================================= -->

      <div class="gantt-timeline">

        ${renderTimelineGrid(
          dates
        )}


        ${
          bar.visible

            ? renderTaskBar(
                task,
                bar,
                color,
                planning
              )

            : renderOutsideRange(
                planning,
                dates
              )
        }


        ${renderTodayLine(
          dates
        )}

      </div>


    </div>

  `;

}


/* ============================================================
   GRID
============================================================ */

function renderTimelineGrid(
  dates
) {

  return dates
    .map(
      date => `

        <div
          class="
            gantt-day-cell
            ${
              isWeekend(
                date
              )
                ? "weekend"
                : ""
            }
            ${
              isSameCalendarDay(
                date,
                new Date()
              )
                ? "today"
                : ""
            }
          "
        ></div>

      `
    )
    .join("");

}


/* ============================================================
   TASK BAR
============================================================ */

function renderTaskBar(
  task,
  bar,
  color,
  planning
) {

  const singleDay =
    differenceInDays(
      planning.start,
      planning.end
    ) === 0;


  const classes = [

    "gantt-bar",

    task.status ===
    "terminada"
      ? "completed"
      : "",

    singleDay
      ? "milestone"
      : ""

  ]
    .filter(Boolean)
    .join(" ");


  return `

    <div
      class="${classes}"
      style="
        left:${bar.left}px;
        width:${bar.width}px;
        background:${color};
      "
      title="${ProjectFlow.escapeHTML(task.title)}"
    >

      <span>
        ${ProjectFlow.escapeHTML(
          task.title
        )}
      </span>

    </div>

  `;

}


/* ============================================================
   FECHAS DE PLANIFICACIÓN
============================================================ */

function getTaskPlanningDates(
  task
) {

  let start =
    task.start_date

      ? parseDateOnly(
          task.start_date
        )

      : null;


  let end =
    task.due_date

      ? parseDateOnly(
          task.due_date
        )

      : null;


  /*
     Solo due_date:
     se representa como un día.
  */

  if (
    !start
    &&
    end
  ) {

    start =
      new Date(
        end
      );

  }


  /*
     Solo start_date:
     se representa como un día.
  */

  if (
    start
    &&
    !end
  ) {

    end =
      new Date(
        start
      );

  }


  /*
     Protección ante datos incoherentes.
  */

  if (
    start
    &&
    end
    &&
    end < start
  ) {

    const temporary =
      start;

    start =
      end;

    end =
      temporary;

  }


  return {
    start,
    end
  };

}


/* ============================================================
   BAR POSITION
============================================================ */

function calculateBar(
  taskStart,
  taskEnd,
  dates
) {

  if (
    !taskStart
    ||
    !taskEnd
  ) {

    return {
      visible:
        false,

      left:
        0,

      width:
        0
    };

  }


  const rangeStart =
    startOfDay(
      dates[0]
    );


  const rangeEnd =
    startOfDay(
      dates[
        dates.length - 1
      ]
    );


  let visibleStart =
    startOfDay(
      taskStart
    );


  let visibleEnd =
    startOfDay(
      taskEnd
    );


  /*
     Completamente fuera del rango.
  */

  if (
    visibleEnd < rangeStart
    ||
    visibleStart > rangeEnd
  ) {

    return {
      visible:
        false,

      left:
        0,

      width:
        0
    };

  }


  /*
     Recortar al rango visible.
  */

  if (
    visibleStart < rangeStart
  ) {

    visibleStart =
      rangeStart;

  }


  if (
    visibleEnd > rangeEnd
  ) {

    visibleEnd =
      rangeEnd;

  }


  const dayWidth =
    getDayWidth();


  const startIndex =
    differenceInDays(
      rangeStart,
      visibleStart
    );


  const durationDays =
    differenceInDays(
      visibleStart,
      visibleEnd
    )
    +
    1;


  const left =
    startIndex *
    dayWidth;


  const width =
    Math.max(
      1,
      durationDays
    )
    *
    dayWidth;


  return {

    visible:
      true,

    left,

    width

  };

}


/* ============================================================
   FUERA DE RANGO
============================================================ */

function renderOutsideRange(
  planning,
  dates
) {

  if (
    !planning.start
    ||
    !planning.end
  ) {

    return "";

  }


  const rangeStart =
    startOfDay(
      dates[0]
    );


  const rangeEnd =
    startOfDay(
      dates[
        dates.length - 1
      ]
    );


  if (
    planning.end < rangeStart
  ) {

    return `

      <span
        class="
          gantt-outside-label
          before
        "
      >
        ← anterior
      </span>

    `;

  }


  if (
    planning.start > rangeEnd
  ) {

    return `

      <span
        class="
          gantt-outside-label
          after
        "
      >
        posterior →
      </span>

    `;

  }


  return "";

}


/* ============================================================
   TODAY LINE
============================================================ */

function renderTodayLine(
  dates
) {

  const today =
    startOfDay(
      new Date()
    );


  const first =
    startOfDay(
      dates[0]
    );


  const last =
    startOfDay(
      dates[
        dates.length - 1
      ]
    );


  if (
    today < first
    ||
    today > last
  ) {

    return "";

  }


  const dayWidth =
    getDayWidth();


  const index =
    differenceInDays(
      first,
      today
    );


  const left =
    (
      index *
      dayWidth
    )
    +
    (
      dayWidth / 2
    );


  return `

    <span
      class="gantt-today-line"
      style="
        left:${left}px;
      "
    ></span>

  `;

}


/* ============================================================
   PERIOD TITLE
============================================================ */

function renderPeriodTitle(
  dates
) {

  const element =
    document.getElementById(
      "ganttPeriodTitle"
    );


  if (!element) {
    return;
  }


  const first =
    dates[0];


  const last =
    dates[
      dates.length - 1
    ];


  const formatter =
    new Intl.DateTimeFormat(
      "es-ES",
      {
        day:
          "numeric",

        month:
          "short",

        year:
          "numeric"
      }
    );


  element.textContent =
    `${formatter.format(first)} — ${formatter.format(last)}`;

}


/* ============================================================
   EVENTS
============================================================ */

function setupGanttEvents() {


  /* ----------------------------------------------------------
     PREVIOUS
  ---------------------------------------------------------- */

  document
    .getElementById(
      "ganttPrevious"
    )
    ?.addEventListener(
      "click",
      () => {

        ganttStartDate =
          addDays(
            ganttStartDate,
            -Math.max(
              7,
              Math.floor(
                ganttRangeDays /
                2
              )
            )
          );


        renderGantt();

      }
    );


  /* ----------------------------------------------------------
     NEXT
  ---------------------------------------------------------- */

  document
    .getElementById(
      "ganttNext"
    )
    ?.addEventListener(
      "click",
      () => {

        ganttStartDate =
          addDays(
            ganttStartDate,
            Math.max(
              7,
              Math.floor(
                ganttRangeDays /
                2
              )
            )
          );


        renderGantt();

      }
    );


  /* ----------------------------------------------------------
     TODAY
  ---------------------------------------------------------- */

  document
    .getElementById(
      "ganttToday"
    )
    ?.addEventListener(
      "click",
      () => {

        ganttStartDate =
          createDefaultStartDate(
            ganttRangeDays
          );


        renderGantt();


        /*
           Volvemos el scroll
           a la posición inicial.
        */

        const scroll =
          document.getElementById(
            "ganttScroll"
          );


        if (scroll) {

          scroll.scrollLeft =
            0;

        }

      }
    );


  /* ----------------------------------------------------------
     RANGE
  ---------------------------------------------------------- */

  document
    .getElementById(
      "ganttRange"
    )
    ?.addEventListener(
      "change",
      event => {

        const value =
          Number(
            event.target.value
          );


        if (
          ![
            30,
            60,
            90
          ].includes(
            value
          )
        ) {

          return;

        }


        ganttRangeDays =
          value;


        ganttStartDate =
          createDefaultStartDate(
            ganttRangeDays
          );


        renderGantt();

      }
    );

}


/* ============================================================
   DEFAULT RANGE
============================================================ */

function createDefaultStartDate(
  rangeDays
) {

  const today =
    startOfDay(
      new Date()
    );


  /*
     Hoy aparece aproximadamente
     al 20-25% de la vista.
  */

  const daysBeforeToday =
    Math.max(
      7,
      Math.round(
        rangeDays *
        .22
      )
    );


  return addDays(
    today,
    -daysBeforeToday
  );

}


/* ============================================================
   DATE RANGE
============================================================ */

function buildDateRange(
  start,
  numberOfDays
) {

  const dates = [];


  const safeStart =
    startOfDay(
      start
    );


  for (
    let index = 0;
    index < numberOfDays;
    index++
  ) {

    dates.push(
      addDays(
        safeStart,
        index
      )
    );

  }


  return dates;

}


/* ============================================================
   HELPERS DE DATOS
============================================================ */

function findGlobalTask(
  globalTaskId
) {

  return ganttGlobalTasks.find(
    task =>
      String(
        task.id
      ) ===
      String(
        globalTaskId
      )
  );

}


function hasAnyPlanningDate(
  task
) {

  return Boolean(
    task.start_date
    ||
    task.due_date
  );

}


/* ============================================================
   SORT
============================================================ */

function sortTasksByDate(
  a,
  b
) {

  const planningA =
    getTaskPlanningDates(
      a
    );


  const planningB =
    getTaskPlanningDates(
      b
    );


  if (
    !planningA.start
    &&
    !planningB.start
  ) {

    return (
      a.title || ""
    ).localeCompare(
      b.title || "",
      "es"
    );

  }


  if (
    !planningA.start
  ) {

    return 1;

  }


  if (
    !planningB.start
  ) {

    return -1;

  }


  return (
    planningA.start -
    planningB.start
  );

}


/* ============================================================
   DATE HELPERS
============================================================ */

function parseDateOnly(
  value
) {

  /*
     Evitamos errores de timezone
     con fechas YYYY-MM-DD.
  */

  const [
    year,
    month,
    day
  ] =
    value
      .split("-")
      .map(Number);


  return new Date(
    year,
    month - 1,
    day
  );

}


function startOfDay(
  date
) {

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

}


function addDays(
  date,
  numberOfDays
) {

  const result =
    new Date(
      date
    );


  result.setDate(
    result.getDate()
    +
    numberOfDays
  );


  return result;

}


function differenceInDays(
  start,
  end
) {

  const startUTC =
    Date.UTC(
      start.getFullYear(),
      start.getMonth(),
      start.getDate()
    );


  const endUTC =
    Date.UTC(
      end.getFullYear(),
      end.getMonth(),
      end.getDate()
    );


  return Math.round(
    (
      endUTC -
      startUTC
    )
    /
    86400000
  );

}


function isSameCalendarDay(
  first,
  second
) {

  return (
    first.getFullYear() ===
    second.getFullYear()

    &&

    first.getMonth() ===
    second.getMonth()

    &&

    first.getDate() ===
    second.getDate()
  );

}


function isWeekend(
  date
) {

  return (
    date.getDay() === 0
    ||
    date.getDay() === 6
  );

}


function formatWeekday(
  date
) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday:
        "short"
    }
  )
    .format(
      date
    )
    .replace(
      ".",
      ""
    )
    .toUpperCase()
    .slice(
      0,
      2
    );

}


/* ============================================================
   CSS VALUE
============================================================ */

function getDayWidth() {

  /*
     Debe coincidir con:

     --gantt-day-width: 38px;
  */

  return 38;

}


/* ============================================================
   TEXT
============================================================ */

function setGanttText(
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