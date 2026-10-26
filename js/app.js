/* ============================================================
   PROJECTFLOW — APP.JS

   Funciones comunes para todas las páginas:
   - Sesión
   - Perfil
   - Roles
   - Logout
   - Navegación
   - Helpers de fechas
   - Helpers HTML
   - Iconos
============================================================ */


/* ============================================================
   ESTADO GLOBAL DE LA APP
============================================================ */

window.ProjectFlow = {

    user: null,
  
    profile: null
  
  };
  
  
  /* ============================================================
     INICIALIZACIÓN
  ============================================================ */
  
  async function initApp() {
  
    try {
  
      /* --------------------------------------------------------
         1. COMPROBAR SESIÓN
      -------------------------------------------------------- */
  
      const {
        data: { session },
        error
      } = await supabaseClient.auth.getSession();
  
  
      if (error) {
        throw error;
      }
  
  
      /*
        Si no existe sesión y estamos en una página
        protegida, volvemos al login.
      */
  
      if (!session) {
  
        window.location.href = "index.html";
  
        return null;
  
      }
  
  
      window.ProjectFlow.user =
        session.user;
  
  
      /* --------------------------------------------------------
         2. CARGAR PERFIL
      -------------------------------------------------------- */
  
      const profile =
        await loadCurrentProfile(
          session.user.id
        );
  
  
      window.ProjectFlow.profile =
        profile;
  
  
      /* --------------------------------------------------------
         3. PINTAR USUARIO
      -------------------------------------------------------- */
  
      renderCurrentUser();
  
  
      /* --------------------------------------------------------
         4. CONFIGURAR LOGOUT
      -------------------------------------------------------- */

      setupLogout();


      /* --------------------------------------------------------
         4.5. CONFIGURAR NOTIFICACIONES
      -------------------------------------------------------- */

      setupNotifications();


      /* --------------------------------------------------------
         5. MARCAR NAVEGACIÓN ACTIVA
      -------------------------------------------------------- */
  
      setActiveNavigation();
  
  
      /* --------------------------------------------------------
         6. ICONOS
      -------------------------------------------------------- */
  
      refreshIcons();
  
  
      return {
  
        user:
          window.ProjectFlow.user,
  
        profile:
          window.ProjectFlow.profile
  
      };
  
  
    } catch (error) {
  
      console.error(
        "Error inicializando ProjectFlow:",
        error
      );
  
  
      throw error;
  
    }
  
  }
  
  
  /* ============================================================
     PERFIL
  ============================================================ */
  
  async function loadCurrentProfile(userId) {
  
    const {
      data,
      error
    } = await supabaseClient
  
      .from("profiles")
  
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      `)
  
      .eq(
        "id",
        userId
      )
  
      .single();
  
  
    if (error) {
  
      console.error(
        "Error cargando perfil:",
        error
      );
  
      throw error;
  
    }
  
  
    return data;
  
  }
  
  
  /* ============================================================
     OBTENER USUARIO
  ============================================================ */
  
  function getCurrentUser() {
  
    return window.ProjectFlow.user;
  
  }
  
  
  function getCurrentProfile() {
  
    return window.ProjectFlow.profile;
  
  }
  
  
  /* ============================================================
     ROLES
  ============================================================ */
  
  function isProfessor() {
  
    return (
      window.ProjectFlow.profile?.role
      ===
      "profesor"
    );
  
  }
  
  
  function isStudent() {
  
    return (
      window.ProjectFlow.profile?.role
      ===
      "estudiante"
    );
  
  }
  
  
  function formatRole(role) {
  
    switch (role) {
  
      case "profesor":
        return "Profesor";
  
      case "estudiante":
        return "Estudiante";
  
      default:
        return "Usuario";
  
    }
  
  }
  
  
  /* ============================================================
     PINTAR USUARIO EN SIDEBAR
  ============================================================ */
  
  function renderCurrentUser() {
  
    const profile =
      getCurrentProfile();
  
  
    if (!profile) {
      return;
    }
  
  
    const name =
      profile.full_name
      ||
      profile.email
      ||
      "Usuario";
  
  
    /*
       Nombre
    */
  
    const nameElement =
      document.getElementById(
        "sidebarUserName"
      );
  
  
    if (nameElement) {
  
      nameElement.textContent =
        name;
  
    }
  
  
    /*
       Rol
    */
  
    const roleElement =
      document.getElementById(
        "sidebarUserRole"
      );
  
  
    if (roleElement) {
  
      roleElement.textContent =
        formatRole(
          profile.role
        );
  
    }
  
  
    /*
       Avatar
    */
  
    const avatar =
      document.getElementById(
        "sidebarAvatar"
      );
  
  
    if (avatar) {
  
      avatar.textContent =
        getInitials(name);
  
    }
  
  
    /*
       Elementos exclusivos de profesor.
  
       Cualquier elemento HTML que tenga:
  
       data-professor-only
  
       solo se mostrará para profesores.
    */
  
    document
      .querySelectorAll(
        "[data-professor-only]"
      )
      .forEach(element => {
  
        if (isProfessor()) {
  
          element.hidden = false;
  
        } else {
  
          element.hidden = true;
  
        }
  
      });
  
  }
  
  
  /* ============================================================
     LOGOUT
  ============================================================ */
  
  function setupLogout() {
  
    const button =
      document.getElementById(
        "logoutButton"
      );
  
  
    if (!button) {
      return;
    }
  
  
    /*
       Evitamos registrar el listener
       varias veces.
    */
  
    if (
      button.dataset.logoutReady
      ===
      "true"
    ) {
  
      return;
  
    }
  
  
    button.dataset.logoutReady =
      "true";
  
  
    button.addEventListener(
      "click",
      logout
    );
  
  }
  
  
  async function logout() {
  
    try {
  
      const {
        error
      } = await supabaseClient
        .auth
        .signOut();
  
  
      if (error) {
        throw error;
      }
  
  
      window.location.href =
        "index.html";
  
  
    } catch (error) {
  
      console.error(
        "Error cerrando sesión:",
        error
      );
  
  
      alert(
        "No se ha podido cerrar la sesión."
      );
  
    }
  
  }
  
  
  /* ============================================================
     NAVEGACIÓN ACTIVA
  ============================================================ */
  
  function setActiveNavigation() {
  
    /*
       Ejemplo:
  
       /calendar.html
  
       pasa a:
  
       calendar.html
    */
  
    const currentPage =
      window.location.pathname
        .split("/")
        .pop()
      ||
      "dashboard.html";
  
  
    document
      .querySelectorAll(
        ".nav-link"
      )
      .forEach(link => {
  
        const href =
          link
            .getAttribute("href")
            ?.split("/")
            .pop();
  
  
        link.classList.toggle(
          "active",
          href === currentPage
        );
  
      });
  
  }
  
  
  /* ============================================================
     CARGAR TODAS LAS TAREAS GLOBALES
  ============================================================ */
  
  async function fetchGlobalTasks() {
  
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
  
  
    return data || [];
  
  }
  
  
  /* ============================================================
     CARGAR SUBTAREAS
  ============================================================ */
  
  async function fetchSubtasks() {
  
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
  
  
    return data || [];
  
  }
  
  
  /* ============================================================
     CARGAR ASIGNACIONES
  ============================================================ */
  
  async function fetchAssignments() {
  
    const {
      data,
      error
    } = await supabaseClient
  
      .from("task_assignments")
  
      .select(`
        id,
        subtask_id,
        user_id,
        assigned_at,
        assigned_by
      `);
  
  
    if (error) {
      throw error;
    }
  
  
    return data || [];
  
  }
  
  
  /* ============================================================
     CARGAR PERFILES
  ============================================================ */

  // Cuentas que no pertenecen a este proyecto (p.ej. filtradas desde
  // PracticeFlow por el trigger de registro compartido) y no deben
  // aparecer en esta app, aunque sigan teniendo fila en public.profiles.
  const HIDDEN_PROFILE_EMAILS = [
    "javier.otero@alumnos.upm.es",
    "marinachiara.perez@alumnos.upm.es"
  ];

  async function fetchProfiles() {

    const {
      data,
      error
    } = await supabaseClient

      .from("profiles")

      .select(`
        id,
        email,
        full_name,
        role
      `)

      .order(
        "full_name",
        {
          ascending: true
        }
      );


    if (error) {
      throw error;
    }


    return (data || []).filter(
      (profile) => !HIDDEN_PROFILE_EMAILS.includes(profile.email)
    );

  }
  
  
  /* ============================================================
     CARGAR REUNIONES
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
      throw error;
    }
  
  
    return data || [];
  
  }
  
  
  /* ============================================================
     BUSCAR TAREA GLOBAL
  ============================================================ */
  
  function findGlobalTask(
    globalTasks,
    id
  ) {
  
    return globalTasks.find(
      task =>
        task.id === id
    )
    ||
    null;
  
  }
  
  
  /* ============================================================
     ESTADOS
  ============================================================ */
  
  function formatTaskStatus(status) {
  
    switch (status) {
  
      case "sin_asignar":
        return "Sin asignar";
  
      case "en_proceso":
        return "En proceso";
  
      case "pendiente_evaluacion":
        return "Pendiente de evaluación";
  
      case "terminada":
        return "Terminada";
  
      default:
        return status || "—";
  
    }
  
  }
  
  
  /* ============================================================
     PRIORIDADES
  ============================================================ */
  
  function formatTaskPriority(priority) {
  
    switch (priority) {
  
      case "baja":
        return "Baja";
  
      case "media":
        return "Media";
  
      case "alta":
        return "Alta";
  
      default:
        return priority || "—";
  
    }
  
  }
  
  
  /* ============================================================
     FECHA SQL → JAVASCRIPT
  ============================================================ */
  
  function parseDateOnly(value) {
  
    if (!value) {
      return null;
    }
  
  
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
  
  
  /* ============================================================
     FECHA JAVASCRIPT → YYYY-MM-DD
  ============================================================ */
  
  function toDateInputValue(date) {
  
    if (!date) {
      return "";
    }
  
  
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
  
  
    return `${year}-${month}-${day}`;
  
  }
  
  
  /* ============================================================
     INICIO DEL DÍA
  ============================================================ */
  
  function startOfDay(date) {
  
    return new Date(
  
      date.getFullYear(),
  
      date.getMonth(),
  
      date.getDate()
  
    );
  
  }
  
  
  /* ============================================================
     MISMO DÍA
  ============================================================ */
  
  function isSameDay(a, b) {
  
    if (
      !a ||
      !b
    ) {
      return false;
    }
  
  
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
  
  
  /* ============================================================
     CLAVE DE FECHA
  ============================================================ */
  
  function getDateKey(date) {
  
    return [
  
      date.getFullYear(),
  
      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      ),
  
      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      )
  
    ].join("-");
  
  }
  
  
  /* ============================================================
     FORMATO DE FECHAS
  ============================================================ */
  
  function formatDate(
    value,
    options = {}
  ) {
  
    if (!value) {
      return "Sin fecha";
    }
  
  
    let date;
  
  
    if (
      value instanceof Date
    ) {
  
      date = value;
  
    } else if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        value
      )
    ) {
  
      date =
        parseDateOnly(value);
  
    } else {
  
      date =
        new Date(value);
  
    }
  
  
    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
  
      return "Fecha inválida";
  
    }
  
  
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...options
      }
    ).format(date);
  
  }
  
  
  /* ============================================================
     FORMATO CORTO
  ============================================================ */
  
  function formatShortDate(value) {
  
    if (!value) {
      return "Sin fecha";
    }
  
  
    const date =
      value instanceof Date
        ? value
        : parseDateOnly(value);
  
  
    if (
      isSameDay(
        date,
        new Date()
      )
    ) {
  
      return "Hoy";
  
    }
  
  
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day: "numeric",
        month: "short"
      }
    ).format(date);
  
  }
  
  
  /* ============================================================
     FORMATO DE HORA
  ============================================================ */
  
  function formatTime(value) {
  
    if (!value) {
      return "";
    }
  
  
    const date =
      value instanceof Date
        ? value
        : new Date(value);
  
  
    return new Intl.DateTimeFormat(
      "es-ES",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }
    ).format(date);
  
  }
  
  
  /* ============================================================
     DÍA DE LA SEMANA
  ============================================================ */
  
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
  
  
  /* ============================================================
     MES
  ============================================================ */
  
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
      temp.getUTCDay()
      ||
      7;
  
  
    temp.setUTCDate(
  
      temp.getUTCDate()
  
      +
  
      4
  
      -
  
      day
  
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
  
        +
  
        1
  
      )
  
      /
  
      7
  
    );
  
  }
  
  
  /* ============================================================
     INICIALES
  ============================================================ */
  
  function getInitials(name) {
  
    if (!name) {
      return "?";
    }
  
  
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
     ESCAPAR HTML
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
     VALIDAR COLORES
  ============================================================ */
  
  function safeColor(
    color,
    fallback = "#c96a4a"
  ) {
  
    if (
  
      typeof color ===
        "string"
  
      &&
  
      /^#[0-9A-Fa-f]{6}$/.test(
        color
      )
  
    ) {
  
      return color;
  
    }
  
  
    return fallback;
  
  }
  
  
  /* ============================================================
     ID ALEATORIO PARA ELEMENTOS HTML
  ============================================================ */
  
  function createDOMId(
    prefix = "item"
  ) {
  
    return (
  
      prefix
  
      +
  
      "-"
  
      +
  
      Math.random()
        .toString(36)
        .slice(2, 10)
  
    );
  
  }
  
  
  /* ============================================================
     LUCIDE
  ============================================================ */
  
  function refreshIcons() {
  
    if (
      window.lucide
      &&
      typeof lucide.createIcons
        ===
        "function"
    ) {
  
      lucide.createIcons();
  
    }
  
  }
  
  
  /* ============================================================
     PEQUEÑO TOAST
  ============================================================ */
  
  function showToast(
    message,
    type = "default"
  ) {
  
    /*
       Eliminamos toast anterior
    */
  
    const previous =
      document.querySelector(
        ".app-toast"
      );
  
  
    previous?.remove();
  
  
    const toast =
      document.createElement(
        "div"
      );
  
  
    toast.className =
      `app-toast app-toast-${type}`;
  
  
    toast.textContent =
      message;
  
  
    document.body.appendChild(
      toast
    );
  
  
    requestAnimationFrame(
      () => {
  
        toast.classList.add(
          "visible"
        );
  
      }
    );
  
  
    setTimeout(
      () => {
  
        toast.classList.remove(
          "visible"
        );
  
  
        setTimeout(
          () => toast.remove(),
          250
        );
  
      },
      2800
    );
  
  }
  
  
  /* ============================================================
     NOTIFICACIONES
  ============================================================ */

  /*
     Días de antelación para avisar de una fecha límite
     próxima.
  */

  const NOTIFICATION_DUE_SOON_DAYS = 3;

  /*
     Cada cuánto se revisan notificaciones nuevas
     mientras la página está abierta (ms).
  */

  const NOTIFICATION_POLL_MS = 60000;

  let notificationsPollTimer = null;


  /*
     Guardamos qué notificaciones ha visto ya cada usuario
     en localStorage, para no mostrarlas como "nuevas"
     cada vez que se abra el panel.
  */

  function getNotificationsSeenKey() {

    const user =
      getCurrentUser();


    return (
      "projectflow-notifications-seen-"
      +
      (user ? user.id : "anon")
    );

  }


  function loadSeenNotificationIds() {

    try {

      const raw =
        localStorage.getItem(
          getNotificationsSeenKey()
        );


      return raw
        ? new Set(JSON.parse(raw))
        : new Set();

    } catch (error) {

      return new Set();

    }

  }


  function saveSeenNotificationIds(ids) {

    try {

      localStorage.setItem(
        getNotificationsSeenKey(),
        JSON.stringify(
          Array.from(ids)
        )
      );

    } catch (error) {

      /*
         localStorage no disponible
         (modo privado, cuota, etc.).
         No es crítico: simplemente no
         recordaremos qué se ha leído.
      */

    }

  }


  /*
     Construye la lista de notificaciones del usuario
     actual:

     - Tareas que se le han asignado.
     - Tareas asignadas a él con fecha límite próxima.
     - Tareas asignadas a él ya vencidas.
  */

  async function buildNotifications() {

    const user =
      getCurrentUser();


    if (!user) {
      return [];
    }


    const [
      subtasks,
      assignments,
      globalTasks
    ] = await Promise.all([

      fetchSubtasks(),

      fetchAssignments(),

      fetchGlobalTasks()

    ]);


    const myAssignments =
      assignments.filter(
        assignment =>
          String(assignment.user_id)
          ===
          String(user.id)
      );


    const today =
      startOfDay(new Date());


    const limitDate =
      startOfDay(new Date());

    limitDate.setDate(
      limitDate.getDate()
      +
      NOTIFICATION_DUE_SOON_DAYS
    );


    const notifications = [];


    myAssignments.forEach(assignment => {

      const subtask =
        subtasks.find(
          item =>
            String(item.id)
            ===
            String(assignment.subtask_id)
        );


      if (!subtask) {
        return;
      }


      const globalTask =
        findGlobalTask(
          globalTasks,
          subtask.global_task_id
        );


      /*
         Notificación: se te ha asignado esta tarea.
      */

      notifications.push({

        id: `assigned-${assignment.id}`,

        type: "assigned",

        sortDate:
          assignment.assigned_at
          ||
          subtask.created_at
          ||
          new Date().toISOString(),

        title: subtask.title,

        context:
          globalTask
            ? globalTask.title
            : ""

      });


      /*
         Si ya está terminada o no tiene fecha
         límite, no avisamos de plazos.
      */

      if (
        subtask.status
          ===
          "terminada"
        ||
        !subtask.due_date
      ) {

        return;

      }


      const dueDate =
        startOfDay(
          parseDateOnly(
            subtask.due_date
          )
        );


      if (dueDate < today) {

        notifications.push({

          id: `overdue-${subtask.id}`,

          type: "overdue",

          sortDate: subtask.due_date,

          title: subtask.title,

          context:
            globalTask
              ? globalTask.title
              : "",

          dueDate: subtask.due_date

        });

      } else if (dueDate <= limitDate) {

        notifications.push({

          id: `due-soon-${subtask.id}`,

          type: "due-soon",

          sortDate: subtask.due_date,

          title: subtask.title,

          context:
            globalTask
              ? globalTask.title
              : "",

          dueDate: subtask.due_date

        });

      }

    });


    notifications.sort(
      (a, b) =>
        new Date(b.sortDate)
        -
        new Date(a.sortDate)
    );


    return notifications;

  }


  /*
     Formateador de fecha propio para las notificaciones.

     No reutilizamos la función global "formatShortDate"
     porque algunas páginas (dashboard.js, gantt.js)
     declaran su propia versión con una firma distinta
     (esperan un objeto Date, no un string), y al ser
     funciones globales del mismo nombre, la última en
     cargarse "gana". Con esta función propia evitamos
     depender de eso.
  */

  function notificationDateLabel(value) {

    if (!value) {
      return "";
    }


    const date =
      /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? parseDateOnly(value)
        : new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    if (
      isSameDay(
        date,
        new Date()
      )
    ) {

      return "Hoy";

    }


    return new Intl.DateTimeFormat(
      "es-ES",
      {
        day: "numeric",
        month: "short"
      }
    ).format(date);

  }


  function notificationIconName(type) {

    switch (type) {

      case "assigned":
        return "user-plus";

      case "overdue":
        return "alert-triangle";

      case "due-soon":
        return "clock";

      default:
        return "bell";

    }

  }


  function notificationMessage(notification) {

    const title =
      escapeHTML(notification.title);


    switch (notification.type) {

      case "assigned":
        return `Se te ha asignado <strong>${title}</strong>`;

      case "overdue":
        return `<strong>${title}</strong> ha superado su fecha límite`;

      case "due-soon":
        return `<strong>${title}</strong> vence pronto`;

      default:
        return title;

    }

  }


  function renderNotifications(notifications) {

    const list =
      document.getElementById(
        "notificationsList"
      );


    const badge =
      document.getElementById(
        "notificationsBadge"
      );


    if (!list) {
      return;
    }


    const seen =
      loadSeenNotificationIds();


    const unreadCount =
      notifications.filter(
        notification =>
          !seen.has(notification.id)
      ).length;


    if (badge) {

      if (unreadCount > 0) {

        badge.hidden = false;

        badge.textContent =
          unreadCount > 9
            ? "9+"
            : String(unreadCount);

      } else {

        badge.hidden = true;

        badge.textContent = "";

      }

    }


    if (notifications.length === 0) {

      list.innerHTML = `
        <div class="notifications-empty">
          No tienes notificaciones por ahora.
        </div>
      `;

      return;

    }


    list.innerHTML =
      notifications
        .map(notification => `

          <div
            class="notification-item ${seen.has(notification.id) ? "" : "unread"}"
          >

            <span class="notification-icon ${notification.type}">
              <i data-lucide="${notificationIconName(notification.type)}"></i>
            </span>

            <span class="notification-body">

              <span class="notification-title">
                ${notificationMessage(notification)}
                ${notification.context ? ` · ${escapeHTML(notification.context)}` : ""}
              </span>

              <span class="notification-time">
                ${
                  notification.dueDate
                    ? `Vence ${notificationDateLabel(notification.dueDate)}`
                    : notificationDateLabel(notification.sortDate)
                }
              </span>

            </span>

          </div>

        `)
        .join("");


    refreshIcons();

  }


  async function refreshNotifications() {

    try {

      const notifications =
        await buildNotifications();


      window.ProjectFlow.notifications =
        notifications;


      renderNotifications(
        notifications
      );

    } catch (error) {

      console.error(
        "Error cargando notificaciones:",
        error
      );

    }

  }


  function markVisibleNotificationsSeen() {

    const notifications =
      window.ProjectFlow.notifications
      ||
      [];


    if (notifications.length === 0) {
      return;
    }


    const seen =
      loadSeenNotificationIds();


    notifications.forEach(
      notification =>
        seen.add(notification.id)
    );


    saveSeenNotificationIds(seen);


    const badge =
      document.getElementById(
        "notificationsBadge"
      );


    if (badge) {

      badge.hidden = true;

      badge.textContent = "";

    }


    document
      .querySelectorAll(
        ".notification-item.unread"
      )
      .forEach(item => {

        item.classList.remove(
          "unread"
        );

      });

  }


  function toggleNotificationsPanel(forceOpen) {

    const panel =
      document.getElementById(
        "notificationsPanel"
      );


    const button =
      document.getElementById(
        "notificationsButton"
      );


    if (
      !panel ||
      !button
    ) {

      return;

    }


    const shouldOpen =
      forceOpen
        !== undefined
        ? forceOpen
        : panel.hidden;


    panel.hidden =
      !shouldOpen;


    button.setAttribute(
      "aria-expanded",
      String(shouldOpen)
    );


    if (shouldOpen) {

      refreshIcons();

      markVisibleNotificationsSeen();

    }

  }


  function setupNotifications() {

    const button =
      document.getElementById(
        "notificationsButton"
      );


    const panel =
      document.getElementById(
        "notificationsPanel"
      );


    /*
       Si la página no tiene el marcado de
       notificaciones, no hacemos nada.
    */

    if (
      !button ||
      !panel
    ) {

      return;

    }


    /*
       Evitamos registrar los listeners
       varias veces.
    */

    if (
      button.dataset.notificationsReady
      ===
      "true"
    ) {

      return;

    }


    button.dataset.notificationsReady =
      "true";


    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        toggleNotificationsPanel();

      }
    );


    /*
       Cerramos el panel al hacer clic fuera.
    */

    document.addEventListener(
      "click",
      event => {

        if (panel.hidden) {
          return;
        }


        if (
          panel.contains(event.target)
          ||
          button.contains(event.target)
        ) {

          return;

        }


        toggleNotificationsPanel(false);

      }
    );


    /*
       Cerramos el panel con Escape.
    */

    document.addEventListener(
      "keydown",
      event => {

        if (
          event.key === "Escape"
          &&
          !panel.hidden
        ) {

          toggleNotificationsPanel(false);

        }

      }
    );


    /*
       Primera carga.
    */

    refreshNotifications();


    /*
       Revisamos periódicamente si hay
       notificaciones nuevas.
    */

    if (notificationsPollTimer) {

      clearInterval(
        notificationsPollTimer
      );

    }


    notificationsPollTimer =
      setInterval(
        refreshNotifications,
        NOTIFICATION_POLL_MS
      );

  }


  /* ============================================================
     MODALES
  ============================================================ */

  /* ============================================================
   MODALES
============================================================ */

function openModal(id) {

    const modal =
      document.getElementById(id);
  
  
    if (!modal) {
  
      console.error(
        `No existe el modal: ${id}`
      );
  
      return;
  
    }
  
  
    /*
       IMPORTANTE:
       Algunos modales usan el atributo HTML "hidden"
       y otros usan la clase ".open".
  
       Soportamos los dos sistemas.
    */
  
    modal.hidden = false;
  
    modal.removeAttribute(
      "hidden"
    );
  
    modal.classList.add(
      "open"
    );
  
    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  
  
    document.body.classList.add(
      "modal-open"
    );
  
  
    /*
       Actualizar iconos creados dentro
       del modal.
    */
  
    refreshIcons();
  
  }
  
  
  function closeModal(id) {
  
    const modal =
      document.getElementById(id);
  
  
    if (!modal) {
      return;
    }
  
  
    modal.classList.remove(
      "open"
    );
  
    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  
  
    /*
       Esperamos un instante por si existe
       una animación de cierre.
    */
  
    setTimeout(
      () => {
  
        modal.hidden = true;
  
        modal.setAttribute(
          "hidden",
          ""
        );
  
      },
      150
    );
  
  
    document.body.classList.remove(
      "modal-open"
    );
  
  }
  
  
  /* ============================================================
     EXPONER FUNCIONES
  ============================================================ */
  
  window.ProjectFlow.init =
    initApp;
  
  
  window.ProjectFlow.getUser =
    getCurrentUser;
  
  
  window.ProjectFlow.getProfile =
    getCurrentProfile;
  
  
  window.ProjectFlow.isProfessor =
    isProfessor;
  
  
  window.ProjectFlow.isStudent =
    isStudent;
  
  
  window.ProjectFlow.fetchGlobalTasks =
    fetchGlobalTasks;
  
  
  window.ProjectFlow.fetchSubtasks =
    fetchSubtasks;
  
  
  window.ProjectFlow.fetchAssignments =
    fetchAssignments;
  
  
  window.ProjectFlow.fetchProfiles =
    fetchProfiles;
  
  
  window.ProjectFlow.fetchMeetings =
    fetchMeetings;
  
  
  window.ProjectFlow.findGlobalTask =
    findGlobalTask;
  
  
  window.ProjectFlow.formatTaskStatus =
    formatTaskStatus;
  
  
  window.ProjectFlow.formatTaskPriority =
    formatTaskPriority;
  
  
  window.ProjectFlow.parseDateOnly =
    parseDateOnly;
  
  
  window.ProjectFlow.toDateInputValue =
    toDateInputValue;
  
  
  window.ProjectFlow.startOfDay =
    startOfDay;
  
  
  window.ProjectFlow.isSameDay =
    isSameDay;
  
  
  window.ProjectFlow.getDateKey =
    getDateKey;
  
  
  window.ProjectFlow.formatDate =
    formatDate;
  
  
  window.ProjectFlow.formatShortDate =
    formatShortDate;
  
  
  window.ProjectFlow.formatTime =
    formatTime;
  
  
  window.ProjectFlow.formatWeekday =
    formatWeekday;
  
  
  window.ProjectFlow.formatMonth =
    formatMonth;
  
  
  window.ProjectFlow.getISOWeek =
    getISOWeek;
  
  
  window.ProjectFlow.getInitials =
    getInitials;
  
  
  window.ProjectFlow.escapeHTML =
    escapeHTML;
  
  
  window.ProjectFlow.safeColor =
    safeColor;
  
  
  window.ProjectFlow.createDOMId =
    createDOMId;
  
  
  window.ProjectFlow.refreshIcons =
    refreshIcons;
  
  
  window.ProjectFlow.showToast =
    showToast;
  
  
  window.ProjectFlow.openModal =
    openModal;
  
  
  window.ProjectFlow.closeModal =
    closeModal;


  window.ProjectFlow.setupNotifications =
    setupNotifications;


  window.ProjectFlow.refreshNotifications =
    refreshNotifications;