/* ============================================================
   PROJECTFLOW — CALENDAR.JS
============================================================ */


/* ============================================================
   ESTADO
============================================================ */

let calendarSubtasks = [];
let calendarMeetings = [];
let calendarGlobalTasks = [];

let editingMeetingId = null;

let calendarDate = new Date();

calendarDate = new Date(
  calendarDate.getFullYear(),
  calendarDate.getMonth(),
  1
);


/* ============================================================
   INIT
============================================================ */

document.addEventListener("DOMContentLoaded", async () => {

  try {

    await ProjectFlow.init();

    setupCalendarEvents();

    await loadCalendarData();

    ProjectFlow.refreshIcons();

  } catch (error) {

    console.error(
      "Error cargando calendario:",
      error
    );

    ProjectFlow.showToast(
      "No se ha podido cargar el calendario",
      "error"
    );

  }

});


/* ============================================================
   CARGAR DATOS
============================================================ */

async function loadCalendarData() {

  try {

    const [
      subtasksData,
      meetingsData,
      globalTasksData
    ] = await Promise.all([

      ProjectFlow.fetchSubtasks(),

      fetchMeetings(),

      ProjectFlow.fetchGlobalTasks()

    ]);


    calendarSubtasks =
      subtasksData || [];

    calendarMeetings =
      meetingsData || [];

    calendarGlobalTasks =
      globalTasksData || [];


    renderCalendar();

    renderCalendarSummary();

  } catch (error) {

    console.error(
      "Error cargando datos del calendario:",
      error
    );

    throw error;

  }

}


/* ============================================================
   OBTENER REUNIONES DE SUPABASE
============================================================ */

async function fetchMeetings() {

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

    console.error(
      "Error cargando reuniones:",
      error
    );

    throw error;

  }


  return data || [];

}


/* ============================================================
   RENDER CALENDARIO
============================================================ */

function renderCalendar() {

  const grid =
    document.getElementById(
      "calendarGrid"
    );


  if (!grid) {
    return;
  }


  const year =
    calendarDate.getFullYear();


  const month =
    calendarDate.getMonth();


  /* ----------------------------------------------------------
     TÍTULO DEL MES
  ---------------------------------------------------------- */

  const monthTitle =
    document.getElementById(
      "calendarMonthTitle"
    );


  if (monthTitle) {

    monthTitle.textContent =
      new Intl.DateTimeFormat(
        "es-ES",
        {
          month: "long",
          year: "numeric"
        }
      ).format(
        calendarDate
      );

  }


  /* ----------------------------------------------------------
     PRIMER DÍA DEL MES
  ---------------------------------------------------------- */

  const firstDay =
    new Date(
      year,
      month,
      1
    );


  const mondayIndex =
    (
      firstDay.getDay() + 6
    ) % 7;


  const gridStart =
    new Date(
      year,
      month,
      1 - mondayIndex
    );


  /* ----------------------------------------------------------
     GENERAR 6 SEMANAS
  ---------------------------------------------------------- */

  const days = [];


  for (
    let i = 0;
    i < 42;
    i++
  ) {

    const date =
      new Date(
        gridStart
      );


    date.setDate(
      gridStart.getDate() + i
    );


    days.push(
      date
    );

  }


  grid.innerHTML =
    days
      .map(
        date =>
          renderCalendarDay(
            date,
            month
          )
      )
      .join("");


  ProjectFlow.refreshIcons();

}


/* ============================================================
   RENDER DÍA
============================================================ */

function renderCalendarDay(
  date,
  currentMonth
) {

  const dateKey =
    formatDateKey(
      date
    );


  const today =
    formatDateKey(
      new Date()
    );


  const events =
    getEventsForDate(
      dateKey
    );


  const visibleEvents =
    events.slice(
      0,
      3
    );


  const remaining =
    events.length -
    visibleEvents.length;


  return `

    <div
      class="
        calendar-day
        ${
          date.getMonth() !== currentMonth
            ? "other-month"
            : ""
        }
        ${
          dateKey === today
            ? "today"
            : ""
        }
      "
      data-calendar-date="${dateKey}"
    >

      <div class="calendar-day-number">
        ${date.getDate()}
      </div>


      <div class="calendar-events">

        ${
          visibleEvents
            .map(
              event =>
                renderCalendarEvent(
                  event
                )
            )
            .join("")
        }


        ${
          remaining > 0

            ? `
              <span class="calendar-more">
                +${remaining} más
              </span>
            `

            : ""
        }

      </div>

    </div>

  `;

}


/* ============================================================
   EVENTOS DE UN DÍA
============================================================ */

function getEventsForDate(
  dateKey
) {

  const events = [];


  /* ==========================================================
     FECHAS LÍMITE DE SUBTAREAS
  ========================================================== */

  calendarSubtasks
    .filter(
      task =>
        task.due_date ===
        dateKey
    )
    .forEach(
      task => {

        events.push({

          id:
            task.id,

          type:
            "deadline",

          title:
            task.title,

          date:
            task.due_date,

          data:
            task

        });

      }
    );


  /* ==========================================================
     REUNIONES
  ========================================================== */

  calendarMeetings
    .filter(
      meeting => {

        const meetingDate =
          formatDateKey(
            new Date(
              meeting.starts_at
            )
          );


        return (
          meetingDate ===
          dateKey
        );

      }
    )
    .forEach(
      meeting => {

        events.push({

          id:
            meeting.id,

          type:
            "meeting",

          title:
            meeting.title,

          date:
            meeting.starts_at,

          data:
            meeting

        });

      }
    );


  events.sort(
    (a, b) => {

      if (
        a.type === "meeting"
        &&
        b.type !== "meeting"
      ) {
        return -1;
      }


      if (
        b.type === "meeting"
        &&
        a.type !== "meeting"
      ) {
        return 1;
      }


      if (
        a.type === "meeting"
        &&
        b.type === "meeting"
      ) {

        return (
          new Date(a.date)
          -
          new Date(b.date)
        );

      }


      return 0;

    }
  );


  return events;

}


/* ============================================================
   RENDER EVENTO
============================================================ */

function renderCalendarEvent(
  event
) {

  const icon =
    event.type === "meeting"
      ? "users"
      : "flag";


  let prefix = "";


  if (
    event.type === "meeting"
  ) {

    prefix =
      formatTime(
        new Date(
          event.date
        )
      );

  }


  return `

    <button
      type="button"
      class="calendar-event ${event.type}"
      data-event-type="${event.type}"
      data-event-id="${event.id}"
      title="${ProjectFlow.escapeHTML(event.title)}"
    >

      <i data-lucide="${icon}"></i>

      <span>

        ${
          prefix
            ? `${prefix} · `
            : ""
        }

        ${ProjectFlow.escapeHTML(event.title)}

      </span>

    </button>

  `;

}


/* ============================================================
   RESUMEN
============================================================ */

function renderCalendarSummary() {

  const year =
    calendarDate.getFullYear();


  const month =
    calendarDate.getMonth();


  const deadlines =
    calendarSubtasks.filter(
      task => {

        if (!task.due_date) {
          return false;
        }


        const date =
          ProjectFlow.parseDateOnly(
            task.due_date
          );


        return (

          date.getFullYear() === year

          &&

          date.getMonth() === month

          &&

          task.status !== "terminada"

        );

      }
    );


  const meetings =
    calendarMeetings.filter(
      meeting => {

        const date =
          new Date(
            meeting.starts_at
          );


        return (

          date.getFullYear() === year

          &&

          date.getMonth() === month

        );

      }
    );


  setCalendarText(
    "deadlineCount",
    deadlines.length
  );


  setCalendarText(
    "meetingCount",
    meetings.length
  );


  setCalendarText(
    "monthEventsCount",
    deadlines.length +
    meetings.length
  );

}


/* ============================================================
   EVENTOS DEL DOM
============================================================ */

function setupCalendarEvents() {


  /* ==========================================================
     MES ANTERIOR
  ========================================================== */

  document
    .getElementById(
      "previousMonth"
    )
    ?.addEventListener(
      "click",
      () => {

        calendarDate =
          new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth() - 1,
            1
          );


        renderCalendar();

        renderCalendarSummary();

      }
    );


  /* ==========================================================
     MES SIGUIENTE
  ========================================================== */

  document
    .getElementById(
      "nextMonth"
    )
    ?.addEventListener(
      "click",
      () => {

        calendarDate =
          new Date(
            calendarDate.getFullYear(),
            calendarDate.getMonth() + 1,
            1
          );


        renderCalendar();

        renderCalendarSummary();

      }
    );


  /* ==========================================================
     HOY
  ========================================================== */

  document
    .getElementById(
      "todayButton"
    )
    ?.addEventListener(
      "click",
      () => {

        const today =
          new Date();


        calendarDate =
          new Date(
            today.getFullYear(),
            today.getMonth(),
            1
          );


        renderCalendar();

        renderCalendarSummary();

      }
    );


  /* ==========================================================
     BOTÓN NUEVA REUNIÓN
  ========================================================== */

  document
    .getElementById(
      "newMeetingButton"
    )
    ?.addEventListener(
      "click",
      () => {

        openMeetingModal();

      }
    );


  /* ==========================================================
     FORMULARIO REUNIÓN
  ========================================================== */

  document
    .getElementById(
      "meetingForm"
    )
    ?.addEventListener(
      "submit",
      saveMeeting
    );


  /* ==========================================================
     CLICKS DELEGADOS
  ========================================================== */

  document.addEventListener(
    "click",
    async event => {


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
         EDITAR REUNIÓN
      -------------------------------------------------------- */

      const editMeetingButton =
        event.target.closest(
          "[data-edit-meeting]"
        );


      if (editMeetingButton) {

        const meetingId =
          editMeetingButton.getAttribute(
            "data-edit-meeting"
          );


        if (meetingId) {

          openEditMeetingModal(
            meetingId
          );

        }


        return;

      }


      /* --------------------------------------------------------
         ELIMINAR REUNIÓN
      -------------------------------------------------------- */

      const deleteMeetingButton =
        event.target.closest(
          "[data-delete-meeting]"
        );


      if (deleteMeetingButton) {

        const meetingId =
          deleteMeetingButton.getAttribute(
            "data-delete-meeting"
          );


        if (meetingId) {

          await deleteMeeting(
            meetingId
          );

        }


        return;

      }


      /* --------------------------------------------------------
         ABRIR EVENTO
      -------------------------------------------------------- */

      const eventButton =
        event.target.closest(
          "[data-event-id]"
        );


      if (eventButton) {

        const type =
          eventButton.getAttribute(
            "data-event-type"
          );


        const id =
          eventButton.getAttribute(
            "data-event-id"
          );


          if (
            type
            &&
            id
          ) {
          
            if (
              type === "meeting"
            ) {
          
              openEditMeetingModal(
                id
              );
          
            } else {
          
              openEventDetail(
                type,
                id
              );
          
            }
          
          }


        return;

      }


      /* --------------------------------------------------------
         CLIC EN DÍA VACÍO
      -------------------------------------------------------- */

      const calendarDay =
        event.target.closest(
          "[data-calendar-date]"
        );


      if (calendarDay) {

        const selectedDate =
          calendarDay.getAttribute(
            "data-calendar-date"
          );


        if (selectedDate) {

          openMeetingModal(
            selectedDate
          );

        }

      }

    }
  );

}


/* ============================================================
   ABRIR MODAL NUEVA REUNIÓN
============================================================ */

function openMeetingModal(
  selectedDate = null
) {

  editingMeetingId = null;


  const form =
    document.getElementById(
      "meetingForm"
    );


  if (form) {
    form.reset();
  }


  const dateInput =
    document.getElementById(
      "meetingDate"
    );


  if (dateInput) {

    dateInput.value =
      selectedDate
      ||
      formatDateKey(
        new Date()
      );

  }


  const startTime =
    document.getElementById(
      "meetingStartTime"
    );


  if (startTime) {
    startTime.value =
      "10:00";
  }


  const endTime =
    document.getElementById(
      "meetingEndTime"
    );


  if (endTime) {
    endTime.value =
      "11:00";
  }


  updateMeetingModalMode(
    false
  );


  ProjectFlow.openModal(
    "meetingModal"
  );


  ProjectFlow.refreshIcons();

}


/* ============================================================
   ABRIR MODAL EDITAR REUNIÓN
============================================================ */

function openEditMeetingModal(
  meetingId
) {

  const meeting =
    calendarMeetings.find(
      item =>
        String(item.id) ===
        String(meetingId)
    );


  if (!meeting) {

    ProjectFlow.showToast(
      "No se ha encontrado la reunión",
      "error"
    );

    return;

  }


  editingMeetingId =
    meeting.id;


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


  const titleInput =
    document.getElementById(
      "meetingTitle"
    );


  const descriptionInput =
    document.getElementById(
      "meetingDescription"
    );


  const dateInput =
    document.getElementById(
      "meetingDate"
    );


  const startTimeInput =
    document.getElementById(
      "meetingStartTime"
    );


  const endTimeInput =
    document.getElementById(
      "meetingEndTime"
    );


  const urlInput =
    document.getElementById(
      "meetingUrl"
    );


  if (titleInput) {

    titleInput.value =
      meeting.title || "";

  }


  if (descriptionInput) {

    descriptionInput.value =
      meeting.description || "";

  }


  if (dateInput) {

    dateInput.value =
      formatDateKey(
        start
      );

  }


  if (startTimeInput) {

    startTimeInput.value =
      formatTimeInput(
        start
      );

  }


  if (endTimeInput) {

    endTimeInput.value =
      end
        ? formatTimeInput(
            end
          )
        : "";

  }


  if (urlInput) {

    urlInput.value =
      meeting.meeting_url || "";

  }


  updateMeetingModalMode(
    true
  );


  ProjectFlow.closeModal(
    "eventModal"
  );


  ProjectFlow.openModal(
    "meetingModal"
  );


  ProjectFlow.refreshIcons();

}


/* ============================================================
   CAMBIAR MODAL CREAR / EDITAR
============================================================ */

function updateMeetingModalMode(
  isEditing
) {

  const modal =
    document.getElementById(
      "meetingModal"
    );


  if (!modal) {
    return;
  }


  const title =
    modal.querySelector(
      ".modal-header h2"
    );


  if (title) {

    title.textContent =
      isEditing
        ? "Editar reunión"
        : "Nueva reunión";

  }


  const submitButton =
    modal.querySelector(
      'button[type="submit"]'
    );


  if (submitButton) {

    submitButton.textContent =
      isEditing
        ? "Guardar cambios"
        : "Crear reunión";

  }


  /*
     El botón "Eliminar reunión" solo tiene
     sentido cuando estamos editando una
     reunión existente.
  */

  const deleteButton =
    document.getElementById(
      "deleteMeetingModalButton"
    );


  if (deleteButton) {

    deleteButton.hidden =
      !isEditing;

  }

}


/* ============================================================
   GUARDAR REUNIÓN
============================================================ */

async function saveMeeting(
  event
) {

  event.preventDefault();


  if (editingMeetingId) {

    await updateMeeting(
      event
    );

  } else {

    await createMeeting(
      event
    );

  }

}


/* ============================================================
   LEER DATOS DEL FORMULARIO
============================================================ */

function getMeetingFormData() {

  const title =
    document
      .getElementById(
        "meetingTitle"
      )
      ?.value
      .trim()
    || "";


  const description =
    document
      .getElementById(
        "meetingDescription"
      )
      ?.value
      .trim()
    || "";


  const date =
    document
      .getElementById(
        "meetingDate"
      )
      ?.value
    || "";


  const startTime =
    document
      .getElementById(
        "meetingStartTime"
      )
      ?.value
    || "";


  const endTime =
    document
      .getElementById(
        "meetingEndTime"
      )
      ?.value
    || "";


  const meetingUrl =
    document
      .getElementById(
        "meetingUrl"
      )
      ?.value
      .trim()
    || "";


  return {

    title,
    description,
    date,
    startTime,
    endTime,
    meetingUrl

  };

}


/* ============================================================
   VALIDAR REUNIÓN
============================================================ */

function validateMeetingForm(
  meetingData
) {

  const {
    title,
    date,
    startTime,
    endTime
  } = meetingData;


  if (!title) {

    ProjectFlow.showToast(
      "Escribe un nombre para la reunión",
      "error"
    );

    return null;

  }


  if (!date) {

    ProjectFlow.showToast(
      "Selecciona una fecha",
      "error"
    );

    return null;

  }


  if (!startTime) {

    ProjectFlow.showToast(
      "Selecciona una hora de inicio",
      "error"
    );

    return null;

  }


  const startsAt =
    new Date(
      `${date}T${startTime}:00`
    );


  if (
    Number.isNaN(
      startsAt.getTime()
    )
  ) {

    ProjectFlow.showToast(
      "La fecha de inicio no es válida",
      "error"
    );

    return null;

  }


  let endsAt = null;


  if (endTime) {

    endsAt =
      new Date(
        `${date}T${endTime}:00`
      );


    if (
      Number.isNaN(
        endsAt.getTime()
      )
    ) {

      ProjectFlow.showToast(
        "La hora de finalización no es válida",
        "error"
      );

      return null;

    }


    if (
      endsAt <
      startsAt
    ) {

      ProjectFlow.showToast(
        "La reunión no puede terminar antes de empezar",
        "error"
      );

      return null;

    }

  }


  return {

    startsAt,
    endsAt

  };

}


/* ============================================================
   CREAR REUNIÓN
============================================================ */

async function createMeeting(
  event
) {

  if (event) {
    event.preventDefault();
  }


  const meetingData =
    getMeetingFormData();


  const validDates =
    validateMeetingForm(
      meetingData
    );


  if (!validDates) {
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


  const submitButton =
    event?.submitter;


  if (submitButton) {
    submitButton.disabled =
      true;
  }


  const {
    data,
    error
  } = await supabaseClient

    .from("meetings")

    .insert({

      title:
        meetingData.title,

      description:
        meetingData.description
          || null,

      starts_at:
        validDates.startsAt
          .toISOString(),

      ends_at:
        validDates.endsAt
          ? validDates.endsAt
              .toISOString()
          : null,

      meeting_url:
        meetingData.meetingUrl
          || null,

      created_by:
        user.id

    })

    .select()

    .single();


  if (submitButton) {
    submitButton.disabled =
      false;
  }


  if (error) {

    console.error(
      "Error creando reunión:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido crear la reunión",
      "error"
    );


    return;

  }


  calendarMeetings.push(
    data
  );


  sortMeetings();


  calendarDate =
    new Date(
      validDates.startsAt.getFullYear(),
      validDates.startsAt.getMonth(),
      1
    );


  editingMeetingId =
    null;


  renderCalendar();

  renderCalendarSummary();


  ProjectFlow.closeModal(
    "meetingModal"
  );


  ProjectFlow.showToast(
    "Reunión creada",
    "success"
  );

}


/* ============================================================
   ACTUALIZAR REUNIÓN
============================================================ */

async function updateMeeting(
  event
) {

  if (event) {
    event.preventDefault();
  }


  const meeting =
    calendarMeetings.find(
      item =>
        String(item.id) ===
        String(editingMeetingId)
    );


  if (!meeting) {

    ProjectFlow.showToast(
      "No se ha encontrado la reunión",
      "error"
    );

    return;

  }


  const meetingData =
    getMeetingFormData();


  const validDates =
    validateMeetingForm(
      meetingData
    );


  if (!validDates) {
    return;
  }


  const submitButton =
    event?.submitter;


  if (submitButton) {
    submitButton.disabled =
      true;
  }


  const {
    data,
    error
  } = await supabaseClient

    .from("meetings")

    .update({

      title:
        meetingData.title,

      description:
        meetingData.description
          || null,

      starts_at:
        validDates.startsAt
          .toISOString(),

      ends_at:
        validDates.endsAt
          ? validDates.endsAt
              .toISOString()
          : null,

      meeting_url:
        meetingData.meetingUrl
          || null,

      updated_at:
        new Date()
          .toISOString()

    })

    .eq(
      "id",
      meeting.id
    )

    .select()

    .single();


  if (submitButton) {
    submitButton.disabled =
      false;
  }


  if (error) {

    console.error(
      "Error actualizando reunión:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido actualizar la reunión",
      "error"
    );


    return;

  }


  const meetingIndex =
    calendarMeetings.findIndex(
      item =>
        String(item.id) ===
        String(meeting.id)
    );


  if (meetingIndex !== -1) {

    calendarMeetings[
      meetingIndex
    ] = data;

  }


  sortMeetings();


  calendarDate =
    new Date(
      validDates.startsAt.getFullYear(),
      validDates.startsAt.getMonth(),
      1
    );


  editingMeetingId =
    null;


  renderCalendar();

  renderCalendarSummary();


  ProjectFlow.closeModal(
    "meetingModal"
  );


  ProjectFlow.showToast(
    "Reunión actualizada",
    "success"
  );

}


/* ============================================================
   ORDENAR REUNIONES
============================================================ */

function sortMeetings() {

  calendarMeetings.sort(
    (a, b) =>
      new Date(
        a.starts_at
      )
      -
      new Date(
        b.starts_at
      )
  );

}


/* ============================================================
   ELIMINAR REUNIÓN
============================================================ */

async function deleteMeeting(
  meetingId
) {

  const meeting =
    calendarMeetings.find(
      item =>
        String(item.id) ===
        String(meetingId)
    );


  if (!meeting) {

    ProjectFlow.showToast(
      "No se ha encontrado la reunión",
      "error"
    );

    return;

  }


  const confirmed =
    window.confirm(
      `¿Quieres eliminar la reunión "${meeting.title}"?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error
  } = await supabaseClient

    .from("meetings")

    .delete()

    .eq(
      "id",
      meeting.id
    );


  if (error) {

    console.error(
      "Error eliminando reunión:",
      error
    );


    ProjectFlow.showToast(
      "No se ha podido eliminar la reunión",
      "error"
    );


    return;

  }


  calendarMeetings =
    calendarMeetings.filter(
      item =>
        String(item.id) !==
        String(meeting.id)
    );


  if (
    String(editingMeetingId) ===
    String(meeting.id)
  ) {

    editingMeetingId =
      null;

  }


  ProjectFlow.closeModal(
    "eventModal"
  );


  ProjectFlow.closeModal(
    "meetingModal"
  );


  renderCalendar();

  renderCalendarSummary();


  ProjectFlow.showToast(
    "Reunión eliminada",
    "success"
  );

}


/* ============================================================
   DETALLE DEL EVENTO
============================================================ */

function openEventDetail(
  type,
  id
) {

  const title =
    document.getElementById(
      "eventTitle"
    );


  const typeLabel =
    document.getElementById(
      "eventTypeLabel"
    );


  const detail =
    document.getElementById(
      "eventDetail"
    );


  if (
    !title
    ||
    !typeLabel
    ||
    !detail
  ) {
    return;
  }


  /* ==========================================================
     FECHA LÍMITE
  ========================================================== */

  if (
    type === "deadline"
  ) {

    const task =
      calendarSubtasks.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!task) {
      return;
    }


    const globalTask =
      calendarGlobalTasks.find(
        item =>
          String(item.id) ===
          String(
            task.global_task_id
          )
      );


    typeLabel.textContent =
      "FECHA LÍMITE";


    title.textContent =
      task.title;


    detail.innerHTML = `

      ${createDetailRow(
        "Tarea global",
        globalTask
          ? globalTask.title
          : "—"
      )}

      ${createDetailRow(
        "Fecha límite",
        ProjectFlow.formatShortDate(
          task.due_date
        )
      )}

      ${createDetailRow(
        "Estado",
        ProjectFlow.formatTaskStatus(
          task.status
        )
      )}

      ${createDetailRow(
        "Prioridad",
        ProjectFlow.formatTaskPriority(
          task.priority
        )
      )}

      ${
        task.description

          ? createDetailRow(
              "Descripción",
              task.description
            )

          : ""
      }

    `;

  }


  /* ==========================================================
     REUNIÓN
  ========================================================== */

  else if (
    type === "meeting"
  ) {

    const meeting =
      calendarMeetings.find(
        item =>
          String(item.id) ===
          String(id)
      );


    if (!meeting) {
      return;
    }


    typeLabel.textContent =
      "REUNIÓN";


    title.textContent =
      meeting.title;


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


    detail.innerHTML = `

      ${createDetailRow(
        "Fecha",
        formatLongDate(
          start
        )
      )}

      ${createDetailRow(
        "Hora",
        formatTime(
          start
        )
      )}

      ${
        end

          ? createDetailRow(
              "Finaliza",
              formatTime(
                end
              )
            )

          : ""
      }

      ${
        meeting.description

          ? createDetailRow(
              "Descripción",
              meeting.description
            )

          : ""
      }


      ${
        meeting.meeting_url

          ? `

            <div class="event-detail-row">

              <span class="event-detail-label">
                ENLACE
              </span>

              <span class="event-detail-value">

                <a
                  class="event-link"
                  href="${ProjectFlow.escapeHTML(meeting.meeting_url)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abrir reunión
                  ↗
                </a>

              </span>

            </div>

          `

          : ""
      }


      <div class="event-modal-actions">


        <button
          type="button"
          class="edit-meeting-button"
          data-edit-meeting="${meeting.id}"
        >

          <i data-lucide="pencil"></i>

          Editar reunión

        </button>


        <button
          type="button"
          class="delete-meeting-button"
          data-delete-meeting="${meeting.id}"
        >

          <i data-lucide="trash-2"></i>

          Eliminar reunión

        </button>


      </div>

    `;

  }


  ProjectFlow.openModal(
    "eventModal"
  );


  ProjectFlow.refreshIcons();

}


/* ============================================================
   FILA DETALLE
============================================================ */

function createDetailRow(
  label,
  value
) {

  return `

    <div class="event-detail-row">

      <span class="event-detail-label">

        ${ProjectFlow.escapeHTML(
          label
        )}

      </span>


      <span class="event-detail-value">

        ${ProjectFlow.escapeHTML(
          value || "—"
        )}

      </span>

    </div>

  `;

}


/* ============================================================
   FECHA → YYYY-MM-DD
============================================================ */

function formatDateKey(
  date
) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );


  return (
    `${year}-${month}-${day}`
  );

}


/* ============================================================
   FECHA LARGA
============================================================ */

function formatLongDate(
  date
) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      weekday:
        "long",

      day:
        "numeric",

      month:
        "long",

      year:
        "numeric"
    }
  ).format(
    date
  );

}


/* ============================================================
   HORA PARA MOSTRAR
============================================================ */

function formatTime(
  date
) {

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  ).format(
    date
  );

}


/* ============================================================
   HORA PARA INPUT TYPE="TIME"
============================================================ */

function formatTimeInput(
  date
) {

  const hours =
    String(
      date.getHours()
    ).padStart(
      2,
      "0"
    );


  const minutes =
    String(
      date.getMinutes()
    ).padStart(
      2,
      "0"
    );


  return (
    `${hours}:${minutes}`
  );

}


/* ============================================================
   HELPER
============================================================ */

function setCalendarText(
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

/* ==========================================================
   ELIMINAR DESDE MODAL DE EDICIÓN
========================================================== */

document
  .getElementById(
    "deleteMeetingModalButton"
  )
  ?.addEventListener(
    "click",
    async () => {

      if (!editingMeetingId) {
        return;
      }

      await deleteMeeting(
        editingMeetingId
      );

    }
  );