/**
 * GYM ROUTINE TRACKER - App Logic
 * Vanilla JS, Mobile-First
 */



const SUPABASE_URL = "https://avhboixotomcadrnbuuv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aGJvaXhvdG9tY2Fkcm5idXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTk0ODIsImV4cCI6MjA4ODM3NTQ4Mn0.Y8akewJRg0a98_HTuZLkyc1Et0tW6FwXKwJjwrIk0tA";
let syncInterval = null;
// --- CONFIGURATION ---
const APP_VERSION = "1.0.0";
const DEFAULT_DAYS = 4;
const DEFAULT_EX_PER_DAY = 6;
const SAVE_DEBOUNCE_MS = 500;

// --- EXERCISE CATALOG ---
const BASE_CATALOG = {
  "PECHO": ["Press banca plano", "Aperturas con mancuernas", "Fondos en paralelas", "Pullover"],
  "ESPALDA": ["Dominadas", "Remo con barra", "Jalón al pecho", "Remo con mancuerna"],
  "HOMBROS": ["Press militar", "Elevaciones laterales", "Pájaros (posterior)", "Frontal mancuerna"],
  "PIERNAS": ["Sentadilla", "Prensa", "Peso muerto rumano", "Extensión cuádriceps"],
  "BÍCEPS": ["Curl con barra", "Curl alternado", "Curl martillo", "Curl concentrado"],
  "TRÍCEPS": ["Press francés", "Extensión polea", "Fondos banco", "Patada tríceps"],
  "GLÚTEOS": ["Hip thrust", "Patada polea", "Sentadilla sumo", "Puente glúteo"],
  "ABDOMEN": ["Crunch", "Plancha", "Elevación piernas", "Rueda abdominal"]
};


const USER_CATALOG_KEY = "gym_custom_catalog_v1";

function loadUserCatalog() {

  const data = localStorage.getItem(USER_CATALOG_KEY);

  if (!data) return {};

  try {

    return JSON.parse(data);

  } catch {

    return {};

  }

}

function saveUserCatalog(catalog) {

  localStorage.setItem(USER_CATALOG_KEY, JSON.stringify(catalog));

}

function getFinalCatalog() {

  const userCatalog = loadUserCatalog();

  const finalCatalog = JSON.parse(JSON.stringify(BASE_CATALOG));

  Object.keys(userCatalog).forEach(section => {

    if (!finalCatalog[section]) {

      finalCatalog[section] = [];

    }

    userCatalog[section].forEach(ex => {

      if (!finalCatalog[section].includes(ex)) {

        finalCatalog[section].push(ex);

      }

    });

  });

  return finalCatalog;

}


// Sistema de licencias antiguo eliminado

// --- STATE ---
let state = {
  currentWeek: 1,
  openDay: 1,
  rutina: {
    meta: { version: APP_VERSION, updatedAt: null },
    semanas: {}
  }
};

let saveTimeout = null;

// --- INITIALIZATION ---
function init() {
  loadFromStorage();

  if (
    !state.rutina ||
    !state.rutina.semanas ||
    Object.keys(state.rutina.semanas).length === 0
  ) {
    seedInitialData();
  }

  renderTabs();
  renderApp();
  setupEventListeners();

  document.body.addEventListener('click', (e) => {
    if (e.target && e.target.tagName === "BUTTON" && typeof hapticTap === 'function') {
      hapticTap();
    }
  });

  updateDiasRestantes();

  // ---> INICIO DE LÍNEA A AGREGAR <---
  initWeightModule();
  initProgressModule(); // Lógica nueva agregada
  initMainMenu();
  // ---> FIN DE LÍNEA A AGREGAR <---

}



// Sincronización manejada por startUserAccessSync()




function seedInitialData() {
  for (let w = 1; w <= 3; w++) {
    state.rutina.semanas[w] = { dias: {} };
    for (let d = 1; d <= DEFAULT_DAYS; d++) {
      state.rutina.semanas[w].dias[d] = { ejercicios: [] };
      for (let e = 0; e < DEFAULT_EX_PER_DAY; e++) {
        // Seed some examples for W1 D1
        if (w === 1 && d === 1 && e === 0) {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject("Press banca plano", "PECHO", 4, "5.5.6.6"));
        } else if (w === 1 && d === 1 && e === 1) {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject("Remo con barra", "ESPALDA", 3, "8"));
        } else {
          state.rutina.semanas[w].dias[d].ejercicios.push(createExerciseObject());
        }
      }
    }
  }
  saveToStorage(true);
}

function createExerciseObject(nombre = "", grupo = "", series = "", reps = "", peso = "") {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + Math.random().toString(36),
    nombre,
    grupo,
    series,
    reps,
    peso
  };
}


function generateRoutineText() {

  let text = "🏋️ Rutina Gym\n\n";

  const semanas = state.rutina.semanas;

  Object.keys(semanas).forEach(w => {

    text += "SEMANA " + w + "\n";

    const dias = semanas[w].dias;

    Object.keys(dias).forEach(d => {

      text += "\nDía " + d + "\n";

      dias[d].ejercicios.forEach(ex => {

        if (!ex.nombre) return;

        text += "• " + ex.nombre;

        if (ex.series) text += " | " + ex.series + " sets";

        if (ex.reps) text += " | " + ex.reps + " reps";

        if (ex.peso) text += " | " + ex.peso + " kg";

        text += "\n";

      });

    });

    text += "\n";

  });

  return text;

}

function shareRoutineWhatsApp() {

  const text = generateRoutineText();

  const url = "https://wa.me/?text=" + encodeURIComponent(text);

  window.open(url, "_blank");

}


// --- RENDERING ---
function renderTabs() {

  const tabsContainer = document.getElementById('week-tabs');

  tabsContainer.innerHTML = '';

  const semanas = Object.keys(state.rutina.semanas);

  semanas.forEach(w => {

    const btn = document.createElement('button');

    // 1. Asignamos la clase y el estado activo original (fundamental para CSS)
    btn.className = `tab-btn ${state.currentWeek == w ? 'active' : ''}`;

    // 2. Insertamos el HTML con el nombre y la cruz roja
    btn.innerHTML = `SEMANA ${w} <span class="delete-week" onclick="deleteWeek(${w}, event)" title="Eliminar semana">✖</span>`;

    // 3. Abrimos correctamente el evento click para cambiar de pestaña
    btn.onclick = () => {

      state.currentWeek = parseInt(w);

      renderTabs();

      renderApp();

      scrollActiveWeekIntoView();

    }; // Aquí cierra el onclick correctamente

    tabsContainer.appendChild(btn);


  });

  scrollActiveWeekIntoView();

}

function scrollActiveWeekIntoView() {

  const container = document.getElementById('week-tabs');

  const active = container.querySelector('.tab-btn.active');

  if (!active) return;

  active.scrollIntoView({
    behavior: 'smooth',
    inline: 'center',
    block: 'nearest'
  });

}


function renderApp() {

  const container = document.getElementById('days-accordion');

  const weekLabel = document.getElementById('current-week-label');

  const weekData = state.rutina.semanas[state.currentWeek];

  weekLabel.textContent = `Semana ${state.currentWeek}`;

  container.innerHTML = '';

  Object.keys(weekData.dias).forEach(dayId => {

    const dia = weekData.dias[dayId];

    const dayCard = document.createElement('div');

    dayCard.className = 'day-card';

    // guardar qué día es en el DOM
    dayCard.dataset.day = dayId;

    // no abrir siempre el día 1
    if (state.openDay == dayId) {
      dayCard.classList.add('open');
    }

    dayCard.innerHTML = `
            <div class="day-header">
                <h3>Día ${dayId}</h3>
                <div style="display:flex; align-items:center; gap:16px;">
                    <button class="delete-day" type="button" onclick="deleteDay(${dayId}, event)">✖</button>
                    <span class="arrow">▼</span>
                </div>
            </div>


            <div class="day-content" id="day-content-${dayId}">
            </div>

            <button class="btn-add-ex" onclick="addExerciseField(${dayId})">+ Agregar Ejercicio</button>
        `;

    const contentContainer = dayCard.querySelector('.day-content');

    dia.ejercicios.forEach((ex, idx) => {
      contentContainer.appendChild(createExerciseRow(dayId, idx, ex));
    });

    dayCard.querySelector('.day-header').onclick = () => {

      document.querySelectorAll('.day-card').forEach(c => {
        if (c !== dayCard) c.classList.remove('open');
      });

      dayCard.classList.toggle('open');
      state.openDay = dayId;

      if (dayCard.classList.contains('open')) {
        dayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

    };

    container.appendChild(dayCard);

  });

}




function createExerciseRow(dayId, index, exercise) {

  const row = document.createElement('div');

  row.className = 'exercise-row';
  row.dataset.day = dayId;      // identifica el día
  row.dataset.index = index;    // identifica el ejercicio dentro del día

  const finalCatalog = getFinalCatalog();

  let optionsHtml = `
    <option value="">Seleccionar ejercicio...</option>
    <option value="__ADD_SECTION__">+ Crear sección...</option>
    <option value="__ADD_EXERCISE__">+ Crear ejercicio...</option>
`;

  for (const [grupo, items] of Object.entries(finalCatalog)) {

    optionsHtml += `<optgroup label="${grupo}">`;

    items.forEach(item => {

      const selected = (exercise.nombre === item) ? 'selected' : '';

      optionsHtml += `<option value="${item}" ${selected}>${item}</option>`;

    });

    optionsHtml += `</optgroup>`;

  }

  row.innerHTML = `

        <!-- ===================================================== -->
        <!-- BOTON ELIMINAR EJERCICIO                              -->
        <!-- Se posiciona arriba a la derecha con CSS              -->
        <!-- Llama a deleteExercise(dayId,index)                   -->
        <!-- ===================================================== -->

        <button class="delete-exercise"
                type="button"
                title="Eliminar ejercicio"
                onclick="deleteExercise(${dayId}, ${index}, this)">
            ✖
        </button>


        <!-- ===================================================== -->
        <!-- SELECTOR DE EJERCICIO                                 -->
        <!-- ===================================================== -->

        <div class="ex-title-container">
            <select class="ex-select" onchange="handleExerciseSelect(${dayId}, ${index}, this)">
                ${optionsHtml}
            </select>
        </div>


        <!-- ===================================================== -->
        <!-- INPUT SERIES                                          -->
        <!-- ===================================================== -->

        <div class="input-group sets">
            <label>Sets</label>
            <input type="number" value="${exercise.series}" placeholder="0" min="0" inputmode="numeric"
                   oninput="updateEx(${dayId}, ${index}, 'series', this)">
        </div>


        <!-- ===================================================== -->
        <!-- INPUT REPS                                            -->
        <!-- ===================================================== -->

        <div class="input-group reps">
            <label>Reps</label>
            <input type="text" value="${exercise.reps}" placeholder="8-10"
                   oninput="updateEx(${dayId}, ${index}, 'reps', this)">
        </div>


        <!-- ===================================================== -->
        <!-- INPUT PESO                                            -->
        <!-- ===================================================== -->

        <div class="input-group weight">
            <label>Peso</label>

            <div class="weight-wrapper">
                <input
                    type="text"
                    value="${exercise.peso}"
                    placeholder="60/70/75"
                    inputmode="decimal"
                    autocomplete="off"
                    spellcheck="false"
                    oninput="updateEx(${dayId}, ${index}, 'peso', this)"
                >
                <span class="unit-toggle">kg</span>
            </div>

            <div class="peso-max">
                ${calculateMaxWeight(exercise.peso)}
            </div>
        </div>
    `;

  return row;

}




window.handleExerciseSelect = (dayId, index, selectEl) => {

  const val = selectEl.value;

  if (val === "__ADD_SECTION__") {

    const ok = addNewSectionFlow();
    selectEl.value = ""; // vuelve a “Seleccionar…”
    if (ok) renderApp();
    return;

  }

  if (val === "__ADD_EXERCISE__") {

    const created = addNewExerciseFlow();

    selectEl.value = ""; // vuelve a “Seleccionar…”

    if (created) {
      renderApp();
    }

    return;

  }

  // Selección normal
  updateEx(dayId, index, "nombre", selectEl);

};








function addNewSectionFlow() {

  let section = prompt("Nombre de la sección nueva (ej: PANTORRILLAS):");

  if (!section) return false;

  section = section.trim();

  if (!section) return false;

  section = section.toUpperCase();

  const userCatalog = loadUserCatalog();

  if (userCatalog[section]) {
    alert("Esa sección ya existe.");
    return false;
  }

  userCatalog[section] = [];

  saveUserCatalog(userCatalog);

  alert("Sección creada: " + section);

  return true;

}

function addNewExerciseFlow() {

  let exName = prompt("Nombre del ejercicio (ej: Buen día con barra):");

  if (!exName) return false;

  exName = exName.trim();

  if (!exName) return false;

  // Elegir sección
  const finalCatalog = getFinalCatalog();
  const sections = Object.keys(finalCatalog);

  let section = prompt(
    "¿En qué sección va?\n\n" +
    "Ejemplos: " + sections.slice(0, 6).join(", ") + "\n\n" +
    "Escribí el nombre exacto o uno nuevo (ej: PANTORRILLAS):"
  );

  if (!section) return false;

  section = section.trim();

  if (!section) return false;

  section = section.toUpperCase();

  // Guardar en catálogo de usuario
  const userCatalog = loadUserCatalog();

  if (!userCatalog[section]) {
    userCatalog[section] = [];
  }

  // Evitar duplicados
  const alreadyExistsInFinal = (finalCatalog[section] || []).includes(exName);
  const alreadyExistsInUser = userCatalog[section].includes(exName);

  if (alreadyExistsInFinal || alreadyExistsInUser) {
    alert("Ese ejercicio ya existe en esa sección.");
    return false;
  }

  userCatalog[section].push(exName);

  saveUserCatalog(userCatalog);

  alert("Ejercicio agregado en " + section + ":\n" + exName);

  return true;

}








// --- ACTIONS ---
window.updateEx = (dayId, idx, field, el) => {

  const value = el.value;
  const exercise = state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios[idx];

  if (field === 'nombre') {

    exercise.nombre = value;
    const opt = el.options[el.selectedIndex];
    exercise.grupo = opt.parentElement.label || "";

  } else {

    if (field === 'peso') {

      exercise[field] = value;

      const pesoMax = calculateMaxWeight(value);

      const container = el.closest(".input-group.weight");
      const maxLabel = container.querySelector(".peso-max");

      if (maxLabel) {
        maxLabel.textContent = pesoMax;
      }

    } else {

      exercise[field] = value;

    }

  }

  debouncedSave();

};

window.addExerciseField = (dayId) => {

  state.rutina.semanas[state.currentWeek].dias[dayId].ejercicios.push(createExerciseObject());

  renderApp();

  debouncedSave();

  setTimeout(() => {

    const content = document.getElementById(`day-content-${dayId}`);

    if (!content) return;

    const rows = content.querySelectorAll('.exercise-row');

    if (rows.length === 0) return;

    rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });

  }, 50);

};



// --- DATA PERSISTENCE ---
function debouncedSave() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => saveToStorage(true), SAVE_DEBOUNCE_MS);
}

function saveToStorage(showTime = false) {
  state.rutina.meta.updatedAt = new Date().toISOString();
  localStorage.setItem('gym_rutina_v1', JSON.stringify(state.rutina));

  if (showTime) {
    const now = new Date();
    const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    document.getElementById('last-saved').textContent = `Guardado: ${timeStr}`;
  }
}

function loadFromStorage() {
  const data = localStorage.getItem('gym_rutina_v1');
  if (data) {
    try {
      state.rutina = JSON.parse(data);
    } catch (e) {
      console.error("Error loading data", e);
    }
  }
}

// --- UI HELPERS & EVENTS ---
function setupEventListeners() {


  document.getElementById('btn-share-wa').onclick = () => {
    generarPDFRutina();
  };

  document.getElementById('btn-reset-week').onclick = () => {
    if (!confirm("¿Seguro que querés reiniciar los ejercicios de esta semana?")) return;
    const dias = state.rutina.semanas[state.currentWeek].dias;
    Object.keys(dias).forEach(dia => {
      dias[dia].ejercicios.forEach(ex => {
        ex.series = "";
        ex.reps = "";
        ex.peso = "";
      });
    });
    renderApp();
    saveToStorage(true);
  };

  document.getElementById('btn-duplicate-week').onclick = () => {

    const semanaActual = state.currentWeek;
    const siguienteSemana = semanaActual + 1;

    if (!state.rutina.semanas[siguienteSemana]) {
      state.rutina.semanas[siguienteSemana] = { dias: {} };
    }

    const diasActuales = state.rutina.semanas[semanaActual].dias;

    const nuevosDias = {};

    Object.keys(diasActuales).forEach(dia => {

      nuevosDias[dia] = {
        ejercicios: diasActuales[dia].ejercicios.map(ex => {

          return {
            id: crypto.randomUUID(),
            nombre: ex.nombre,
            grupo: ex.grupo,
            series: ex.series,
            reps: ex.reps,
            peso: ""
          };

        })
      };

    });

    state.rutina.semanas[siguienteSemana].dias = nuevosDias;

    alert("Rutina duplicada a Semana " + siguienteSemana);

    renderTabs();
    saveToStorage(true);

  };

  document.getElementById('btn-add-day').onclick = () => {

    const dias = state.rutina.semanas[state.currentWeek].dias;

    const nuevoDia = Object.keys(dias).length + 1;

    dias[nuevoDia] = {
      ejercicios: Array(DEFAULT_EX_PER_DAY).fill(0).map(() => createExerciseObject())
    };

    renderApp();
    saveToStorage(true);

  };

  /* ----------- NUEVO BLOQUE: AGREGAR SEMANA ----------- */

  document.getElementById('btn-add-week').onclick = () => {

    const semanas = state.rutina.semanas;

    const nuevaSemana = Object.keys(semanas).length + 1;

    const diasBase = state.rutina.semanas[state.currentWeek].dias;

    const nuevosDias = {};

    Object.keys(diasBase).forEach(dia => {

      nuevosDias[dia] = {
        ejercicios: diasBase[dia].ejercicios.map(() => createExerciseObject())
      };

    });

    semanas[nuevaSemana] = { dias: nuevosDias };

    state.currentWeek = nuevaSemana;

    renderTabs();
    renderApp();
    saveToStorage(true);

  };

  /* ---------------------------------------------------- */


}

function calculateMaxWeight(pesoTexto) {

  if (!pesoTexto) return "";

  const numeros = pesoTexto
    .replace(/,/g, " ")
    .replace(/\//g, " ")
    .split(" ")
    .map(n => parseFloat(n))
    .filter(n => !isNaN(n));

  if (numeros.length === 0) return "";

  const max = Math.max(...numeros);

  return "máx: " + max + " kg";
}


function hapticTap() {

  if (!navigator.vibrate) return;

  navigator.vibrate(10);

}

/****************************************************
 LOGIN / REGISTER - SUPABASE
****************************************************/

// Funciones antiguas de login y register eliminadas



/* MODO TESTER: Comentado auto-login
const savedTel = localStorage.getItem("telefono");
const savedToken = localStorage.getItem("session_token");
const savedExp = localStorage.getItem("licencia_exp");

if (savedTel && savedToken && savedExp) {
  const today = new Date();
  const expDate = new Date(savedExp);

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("app-container").style.display = "block";
  init();

  updateDiasRestantes(); // Actualiza UI inicial (bloquea si expiró)

  // Siempre iniciar sync para detectar si pagó/renovó
  if (typeof startUserAccessSync === "function") {
    startUserAccessSync();
  }
}
*/







/* MODO TESTER: Comentados listeners del form SMS
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-send-code").onclick = async () => {
    const phone = document.getElementById("login-phone").value.trim();

    if (!phone) {
      alert("Ingresá tu número de WhatsApp.");
      return;
    }

    try {
      const res = await fetch(SUPABASE_URL + "/functions/v1/smooth-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: JSON.stringify({
          phone: phone
        })
      });

      const raw = await res.text();
      console.log("VERIFY-CODE STATUS:", res.status);
      console.log("VERIFY-CODE RAW:", raw);

      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) { }

      if (!res.ok) {
        alert(data?.error || raw || "No se pudo enviar el código.");
        return;
      }

      alert("Te enviamos un código por SMS.");

      document.getElementById("login-code").style.display = "block";
      document.getElementById("btn-verify-code").style.display = "block";
    } catch (err) {
      console.error("ERROR SEND CODE:", err);
      alert("Error de conexión al enviar código.");
    }
  };

  document.getElementById("btn-verify-code").onclick = async () => {

    const phone = document.getElementById("login-phone").value.trim();
    const code = document.getElementById("login-code").value.trim();

    if (!phone) {
      alert("Ingresá tu número de WhatsApp.");
      return;
    }

    if (!code) {
      alert("Ingresá el código.");
      return;
    }

    try {

      const res = await fetch(SUPABASE_URL + "/functions/v1/bright-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + SUPABASE_KEY
        },
        body: JSON.stringify({
          phone: phone,
          code: code
        })
      });

      const raw = await res.text();

      console.log("VERIFY SMS STATUS:", res.status);
      console.log("VERIFY SMS RAW:", raw);

      let data = null;

      try {
        data = JSON.parse(raw);
      } catch (e) { }

      if (!res.ok) {
        alert(data?.error || raw || "No se pudo verificar el código.");
        return;
      }

      if (data?.valid !== true) {
        alert("Código incorrecto o vencido.");
        return;
      }

      if (data?.session_token) {
        localStorage.setItem("telefono", phone);
        localStorage.setItem("session_token", data.session_token);

        // prueba de licencia (5 días)
        const fechaExp = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
        localStorage.setItem("licencia_exp", fechaExp.toISOString());
      }

      // mostrar app
      document.getElementById("login-screen").style.display = "none";
      document.getElementById("app-container").style.display = "block";
      init();

      // sincronizar acceso local + backend
      setTimeout(() => {
        if (typeof startUserAccessSync === "function") {
          startUserAccessSync();
        } else if (typeof updateDiasRestantes === "function") {
          updateDiasRestantes();
        }
      }, 200);

    } catch (err) {

      console.error("ERROR VERIFY CODE:", err);
      alert("Error de conexión al verificar código.");

    }

  };
});
*/







/* ==================================================
   INICIO MODO TESTER - LOGIN BYPASS
   ================================================== */
document.addEventListener("DOMContentLoaded", () => {

  // 1. Mostrar la app principal (el login-screen está comentado en HTML y no estorba)
  const appContainer = document.getElementById("app-container");
  if (appContainer) {
    appContainer.style.display = "block";
  }

  // 2. Simular sesión localStorage para evitar comprobaciones de "Licencia Vencida"
  localStorage.setItem("telefono", "+549110000TEST");
  localStorage.setItem("session_token", "TOKEN_TEST_123");
  localStorage.setItem("plan", "pro");

  // Vencimiento a un año hacia adelante
  const testExp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  localStorage.setItem("licencia_exp", testExp.toISOString());

  // 3. Iniciar la lógica central de la app. NO llamamos a startUserAccessSync().
  init();
  updateDiasRestantes();

});
/* ==================================================
   FIN MODO TESTER
   ================================================== */






































function updateDiasRestantes(serverUser = null) {

  const el = document.getElementById("dias-restantes");
  const modal = document.getElementById("plan-modal");
  const app = document.getElementById("app-container");
  const btnPlan = document.getElementById("btn-plan");

  if (!el) return;

  const DAY_MS = 1000 * 60 * 60 * 24;

  function desbloquearApp() {
    if (app) {
      app.style.pointerEvents = "auto";
      app.style.filter = "none";
    }

    // cerrar modal SOLO si fue abierto por bloqueo automático
    if (modal && modal.dataset.locked === "true") {
      modal.style.display = "none";
      modal.dataset.locked = "false";
    }
  }

  function bloquearApp() {
    if (modal) {
      modal.style.display = "block";
      modal.dataset.locked = "true";
    }
    if (app) {
      app.style.pointerEvents = "none";
      app.style.filter = "blur(2px)";
    }
  }

  let plan = null;
  let expira = null;

  if (serverUser && serverUser.plan) {
    plan = serverUser.plan;
    expira = serverUser.expira;

    localStorage.setItem("plan", plan);

    if (expira) {
      localStorage.setItem("licencia_exp", expira);
    }
  } else {
    plan = localStorage.getItem("plan");
    expira = localStorage.getItem("licencia_exp");
  }

  if (!expira) {
    el.innerText = "";
    el.style.color = "#444";
    desbloquearApp();

    if (btnPlan) {
      btnPlan.innerText = "💎 Activar PRO";
      btnPlan.style.display = "inline-block";
    }

    return;
  }

  const hoy = new Date();
  const venc = new Date(expira);
  const diff = Math.ceil((venc - hoy) / DAY_MS);

  if (diff <= 0) {
    el.innerText = "Licencia vencida";
    el.style.color = "#d11";

    if (btnPlan) {
      btnPlan.innerText = "💎 Activar PRO";
      btnPlan.style.display = "inline-block";
    }

    bloquearApp();
    return;
  }

  if (plan === "pro") {
    el.innerText = diff + " días restantes";
    el.style.color = "#0a8f4b";

    if (btnPlan) {
      btnPlan.innerText = "💎 Plan PRO activo";
      btnPlan.style.display = "inline-block";
    }

    desbloquearApp();
    return;
  }

  desbloquearApp();

  if (diff <= 3) {
    el.innerText = "⚠ " + diff + " días restantes";
    el.style.color = "#d11";
  } else {
    el.innerText = diff + " días restantes";
    el.style.color = "#444";
  }

  if (btnPlan) {
    btnPlan.innerText = "💎 Activar PRO";
    btnPlan.style.display = "inline-block";
  }

}




// ---- BOTON PLAN PRO ----
document.addEventListener("DOMContentLoaded", function () {

  const btnPlan = document.getElementById("btn-plan");
  const btnCerrar = document.getElementById("btn-cerrar-plan");

  if (btnPlan) {
    btnPlan.onclick = () => {

      const modal = document.getElementById("plan-modal");

      if (modal) {
        modal.style.display = "block";
        modal.dataset.locked = "false";
      }

    };
  }

  if (btnCerrar) {
    btnCerrar.onclick = () => {
      document.getElementById("plan-modal").style.display = "none";
    };
  }

});


/* =========================================================
   BOTÓN: "YA TRANSFERÍ"
   ---------------------------------------------------------
   Esta función se ejecuta cuando el usuario confirma que
   realizó la transferencia para activar el plan PRO.

   Flujo completo:
   1) Obtiene teléfono del usuario guardado en localStorage
   2) Obtiene el alias desde donde el usuario transfirió
   3) Guarda la solicitud en Supabase (tabla solicitudes_pago)
   4) Abre WhatsApp con un mensaje automático hacia el admin
   5) Cierra el modal de pago
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-transferido").onclick = async () => {

    /* -------------------------------------------------------
       1) OBTENER DATOS DEL USUARIO
       ------------------------------------------------------- */

    // teléfono guardado cuando el usuario se registró
    const telefono = localStorage.getItem("telefono");

    // alias que el usuario escribió en el campo del modal
    const aliasCliente = document.getElementById("alias-cliente").value;


    /* -------------------------------------------------------
       2) VALIDACIONES BÁSICAS
       ------------------------------------------------------- */

    // si por algún motivo no existe el teléfono
    if (!telefono) {
      alert("Error: usuario no identificado");
      return;
    }

    // si el usuario no escribió el alias desde donde pagó
    if (!aliasCliente || aliasCliente.trim() === "") {
      alert("Por favor escribí el alias desde donde hiciste la transferencia");
      return;
    }


    /* -------------------------------------------------------
       3) GUARDAR SOLICITUD EN SUPABASE
       -------------------------------------------------------
       Se registra una fila en la tabla:
  
       solicitudes_pago
  
       con los campos:
       telefono
       alias_cliente
       fecha
       estado
       ------------------------------------------------------- */

    try {

      const res = await fetch(
        SUPABASE_URL + "/rest/v1/solicitudes_pago",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY
          },

          body: JSON.stringify({

            telefono: telefono,

            alias_cliente: aliasCliente,

            plan_solicitado: "pro",

            estado: "pendiente"

          })
        }
      );


      /* -------------------------------------------------------
         4) SI SUPABASE GUARDÓ CORRECTAMENTE
         ------------------------------------------------------- */

      if (res.ok) {

        alert("Solicitud enviada. Avisanos por WhatsApp para activarte.");


        /* ---------------------------------------------------
           5) GENERAR MENSAJE AUTOMÁTICO PARA WHATSAPP
           --------------------------------------------------- */

        const hoy = new Date();

        const fecha =
          hoy.getDate().toString().padStart(2, "0") + "/" +
          (hoy.getMonth() + 1).toString().padStart(2, "0") + "/" +
          hoy.getFullYear();

        const mensaje =
          "Hola, transferí para activar PRO\n\n" +
          "tel: " + telefono + "\n" +
          "alias del pago: " + aliasCliente + "\n" +
          "fecha: " + fecha;


        /* ---------------------------------------------------
           6) ABRIR WHATSAPP DEL USUARIO
           ---------------------------------------------------
           Esto abre WhatsApp con el mensaje listo para enviar
           al administrador de la app
           --------------------------------------------------- */

        const url =
          "https://wa.me/543424307388?text=" + encodeURIComponent(mensaje);

        window.open(url, "_blank");


        /* ---------------------------------------------------
           7) CERRAR MODAL DE PAGO
           --------------------------------------------------- */

        document.getElementById("plan-modal").style.display = "none";

      }


      /* -------------------------------------------------------
         8) SI FALLÓ EL INSERT EN SUPABASE
         ------------------------------------------------------- */

      else {

        alert("No se pudo registrar la solicitud");

      }

    }


    /* -------------------------------------------------------
       9) ERROR DE CONEXIÓN O EXCEPCIÓN
       ------------------------------------------------------- */

    catch (err) {

      console.error(err);

      alert("Error de conexión");

    }

  };
});




// después del login exitoso



function startUserAccessSync() {
  if (syncInterval) clearInterval(syncInterval);
  consultarEstadoUsuario();
  syncInterval = setInterval(consultarEstadoUsuario, 15000);
}

async function consultarEstadoUsuario() {

  const telefono = localStorage.getItem("telefono");
  if (!telefono) {
    updateDiasRestantes();
    return;
  }

  const telefonoQuery = encodeURIComponent(telefono);

  try {

    const res = await fetch(
      SUPABASE_URL +
      "/rest/v1/usuarios?telefono=eq." +
      telefonoQuery +
      "&select=telefono,plan,expira",
      {
        method: "GET",
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: "Bearer " + SUPABASE_KEY,
          Accept: "application/json"
        }
      }
    );

    if (!res.ok) {
      updateDiasRestantes();
      return;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      updateDiasRestantes();
      return;
    }

    const serverUser = data[0];

    // -----------------------------
    // ESTADO ACTUAL LOCAL
    // -----------------------------

    let localPlan = localStorage.getItem("plan");
    let localExp = localStorage.getItem("licencia_exp");

    // -----------------------------
    // VALIDAR DATOS DEL SERVIDOR
    // -----------------------------

    const serverPlan = serverUser.plan;
    const serverExp = serverUser.expira;

    let finalPlan = localPlan;
    let finalExp = localExp;

    // SOLO actualizamos si el servidor trae datos válidos
    if (serverPlan && serverPlan !== "") {
      finalPlan = serverPlan;
    }

    if (serverExp && serverExp !== "") {

      const serverDate = new Date(serverExp);
      const localDate = localExp ? new Date(localExp) : null;

      // Evitar pisar fechas válidas con fechas viejas
      if (!localDate || serverDate > localDate) {
        finalExp = serverExp;
      }

    }

    // -----------------------------
    // GUARDAR RESULTADO FINAL
    // -----------------------------

    if (finalPlan) {
      localStorage.setItem("plan", finalPlan);
    }

    if (finalExp) {
      localStorage.setItem("licencia_exp", finalExp);
    }

    // -----------------------------
    // ACTUALIZAR INTERFAZ
    // -----------------------------

    updateDiasRestantes({
      plan: finalPlan,
      expira: finalExp
    });

  } catch (err) {

    console.error("Error sync usuario:", err);

    // si falla el servidor seguimos con localStorage
    updateDiasRestantes({
      plan: localStorage.getItem("plan"),
      expira: localStorage.getItem("licencia_exp")
    });

  }

}


















/* -------------------------------------------------------
   


Opción 1 — SIMULACIÓN LOCAL (rápida)
No toca Supabase. Solo abre la app para probar PRO.
-----------------------------------------------------
const telefono = "+54342696969";

fetch(
"https://avhboixotomcadrnbuuv.supabase.co/rest/v1/usuarios",
{
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aGJvaXhvdG9tY2Fkcm5idXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTk0ODIsImV4cCI6MjA4ODM3NTQ4Mn0.Y8akewJRg0a98_HTuZLkyc1Et0tW6FwXKwJjwrIk0tA",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aGJvaXhvdG9tY2Fkcm5idXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTk0ODIsImV4cCI6MjA4ODM3NTQ4Mn0.Y8akewJRg0a98_HTuZLkyc1Et0tW6FwXKwJjwrIk0tA",
    "Prefer": "return=representation"
  },
  body: JSON.stringify({
    telefono: telefono,
    activo: true,
    session_token: "TEST_TOKEN_123"
  })
}
)
.then(r => r.text())
.then(t => {
console.log("Respuesta Supabase:", t);

localStorage.setItem("telefono", telefono);
localStorage.setItem("session_token", "TEST_TOKEN_123");

const fechaExp = new Date(Date.now() + 5*24*60*60*1000);
localStorage.setItem("licencia_exp", fechaExp.toISOString());

document.getElementById("login-screen").style.display = "none";
document.getElementById("app-container").style.display = "block";

init();

if (typeof startUserAccessSync === "function") {
  startUserAccessSync();
}

updateDiasRestantes();
});







Script correcto para tus pruebas
---------------------------------

*********************************************************************
const telefono = "+54342696969";
const token = "TEST_TOKEN_123";
const fechaExp = new Date(Date.now() + 5*24*60*60*1000).toISOString();

fetch(
"https://avhboixotomcadrnbuuv.supabase.co/rest/v1/usuarios",
{
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aGJvaXhvdG9tY2Fkcm5idXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTk0ODIsImV4cCI6MjA4ODM3NTQ4Mn0.Y8akewJRg0a98_HTuZLkyc1Et0tW6FwXKwJjwrIk0tA",
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2aGJvaXhvdG9tY2Fkcm5idXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTk0ODIsImV4cCI6MjA4ODM3NTQ4Mn0.Y8akewJRg0a98_HTuZLkyc1Et0tW6FwXKwJjwrIk0tA",
    "Prefer": "resolution=merge-duplicates"
  },
  body: JSON.stringify({
    telefono: telefono,
    activo: true,
    session_token: token,
    plan: "pro",
    expira: fechaExp
  })
}
)
.then(() => {

localStorage.setItem("telefono", telefono);
localStorage.setItem("session_token", token);
localStorage.setItem("licencia_exp", fechaExp);
localStorage.setItem("plan","pro");

document.getElementById("login-screen").style.display = "none";
document.getElementById("app-container").style.display = "block";

init();

if (typeof startUserAccessSync === "function") {
  startUserAccessSync();
}

updateDiasRestantes({plan:"pro",expira:fechaExp});

});
*********************************************************************















Esto actualiza los dias por consola
-------------------------
localStorage.setItem("licencia_exp","2026-04-12")
updateDiasRestantes()
-----------------------------------------------------
Para probar PRO automáticamente
Después de eso, podés simular que el admin activó PRO:
-----------------------------------------------------
updateDiasRestantes({
plan: "pro",
expira: new Date(Date.now() + 30*24*60*60*1000).toISOString()
});


-------------------------------------------------------
Flujo real de  app

usuario paga
↓
toca "ya transferí"
↓
se guarda en solicitudes_pago
↓
te llega WhatsApp
↓
vos verificás la transferencia
↓
editás la tabla usuarios
↓
plan = pro
ultima_cuota_pagada = hoy
expira = hoy + 30 días
-------------------------------------------------------
Qué  hacer cuando alguien paga

Entrar a:

usuarios

y editar:

plan = pro
ultima_cuota_pagada = hoy
expira = hoy + 30 días

Eso automáticamente habilita PRO.
-------------------------------------------------------

usuarios → controla acceso
solicitudes_pago → pedidos de pago
ejercicios → contenido de la app


-------------------------------------------------------
Cuando alguien paga:

Paso 1 Abrís esta tabla:
------ 

usuarios

Paso 2 Buscás el usuario por:
------
telefono

Ejemplo:

TEST_USER

Paso 3  Editás estos 3 campos
------
plan = pro
ultima_cuota_pagada = HOY
expira = HOY + 30 días




------------------------------------------------------- */





function generarPDFRutina() {
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const semanas = state.rutina.semanas;
  const semKeys = Object.keys(semanas).sort((a, b) => a - b);

  const chunks = [];
  for (let i = 0; i < semKeys.length; i += 4) {
    chunks.push(semKeys.slice(i, i + 4));
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  //espacio entre “Día” y la primera tabla está determinado por una sola variable: startX.
  //const startX = 25; la tabla empieza en 25 mm probar const startX = 16;
  const startX = 18;
  const marginRight = 14;
  const usableWidth = pageWidth - startX - marginRight;
  const weekWidth = usableWidth / 4;
  //ANCHO DE COLUMNAS
  const colEjercicio = weekWidth * 0.5;
  const colS = weekWidth * 0.08;
  const colR = weekWidth * 0.17;
  const colKg = weekWidth * 0.25;

  chunks.forEach((chunk, chunkIndex) => {
    if (chunkIndex > 0) {
      doc.addPage();
    }

    doc.setFontSize(18);
    doc.text("Rutina de Entrenamiento", 14, 15);

    let startY = 25;
    //LETRA DE SEMANA
    doc.setFontSize(9);
    chunk.forEach((semana, index) => {
      const tableX = startX + index * weekWidth;
      doc.text("SEMANA " + semana, tableX, startY);
    });

    startY += 5;
    const tablesStartY = startY;

    for (let dia = 1; dia <= 4; dia++) {
      let maxFinalY = startY;
      //LETRA DE DIA
      doc.setFontSize(9);
      //etiqueta del día
      // doc.text("Día " + dia, 10, startY + 7); el texto está en 10 mm, dejando 15 mm de espacio.      
      // probar doc.text("Día " + dia, 12, startY + 7); mas chico mueve "dia" mas a la izquierda
      doc.text("Día " + dia, 8, startY + 7);

      let maxEjercicios = 1;
      chunk.forEach(semana => {
        const ejercicios = semanas[semana].dias[dia].ejercicios;
        if (ejercicios && ejercicios.length > maxEjercicios) {
          maxEjercicios = ejercicios.length;
        }
      });

      chunk.forEach((semana, index) => {
        const ejercicios = semanas[semana].dias[dia].ejercicios;

        let tabla = ejercicios.map(e => [
          e.nombre || "",
          e.series || "",
          e.reps || "",
          e.peso || ""
        ]);

        while (tabla.length < maxEjercicios) {
          tabla.push(["", "", "", ""]);
        }

        const tableX = startX + index * weekWidth;

        doc.autoTable({
          startY: startY,
          margin: { left: tableX },
          head: [['Ejercicio', 'S', 'R', 'Kg']],
          body: tabla,
          theme: 'grid',
          tableWidth: weekWidth,
          styles: {
            fontSize: 7,
            cellPadding: 0.5,
            valign: 'middle',
            overflow: 'visible'
          },
          columnStyles: {
            0: { cellWidth: colEjercicio },
            1: { cellWidth: colS, halign: 'center' },
            2: { cellWidth: colR, halign: 'center' },
            3: { cellWidth: colKg, halign: 'center' }
          }
        });

        if (doc.lastAutoTable.finalY > maxFinalY) {
          maxFinalY = doc.lastAutoTable.finalY;
        }
      });

      startY = maxFinalY + 5;
    }

    doc.setLineWidth(0.8);
    doc.setDrawColor(0, 150, 120); // verde similar al header

    for (let i = 1; i < chunk.length; i++) {
      const lineX = startX + i * weekWidth;
      doc.line(lineX, tablesStartY, lineX, startY - 5);
    }
  });

  doc.save("rutina_gym.pdf");
}











/* ================================================= */
/* ELIMINAR EJERCICIO                                */
/* ================================================= */

function deleteExercise(dayId, index, btn) {

  if (!confirm("Eliminar ejercicio?")) return;

  const semana = state.rutina.semanas[state.currentWeek];
  const dia = semana.dias[dayId];

  // eliminar del estado
  dia.ejercicios.splice(index, 1);

  // guardar cambios
  saveToStorage(true);

  // eliminar solo la fila del DOM
  const row = btn.closest('.exercise-row');
  if (row) row.remove();

}


/* ================================================= */
/* ELIMINAR DIA                                */
/* ================================================= */

window.deleteDay = (dayId, event) => {
  // Evitamos que al hacer clic en la X se expanda/contraiga el acordeón
  if (event) event.stopPropagation();
  if (!confirm("¿Eliminar el Día " + dayId + " por completo?")) return;

  const dias = state.rutina.semanas[state.currentWeek].dias;

  // 1. Elimina el día del objeto usando la key (dayId) real
  delete dias[dayId];

  // 2. Si el día eliminado era el que estaba abierto, limpiamos el estado
  // y tratamos de abrir otro día válido para que no quede la pantalla vacía
  if (state.openDay == dayId) {
    state.openDay = null;
    const diasDisponibles = Object.keys(dias);
    if (diasDisponibles.length > 0) {
      state.openDay = diasDisponibles[0];
    }
  }

  // 3. Guardar estado permanentemente y re-renderizar la interfaz
  saveToStorage(true);
  renderApp();
};


/* ================================================= */
/* ELIMINAR SEMANA                                   */
/* ================================================= */
window.deleteWeek = (weekId, event) => {
  // Evitar que el clic en la X cambie la semana activa
  if (event) event.stopPropagation();

  const semanas = state.rutina.semanas;
  const numSemanas = Object.keys(semanas).length;

  if (numSemanas <= 1) {
    alert("No podés eliminar la única semana disponible.");
    return;
  }

  if (!confirm("¿Eliminar la SEMANA " + weekId + " por completo?")) return;

  // 1. Eliminar la semana del objeto global
  delete semanas[weekId];

  // 2. Si borramos la semana que estábamos mirando, saltamos a la primera que haya quedado
  if (state.currentWeek == weekId) {
    const semanasRestantes = Object.keys(semanas);
    state.currentWeek = parseInt(semanasRestantes[0]);
  }

  // 3. Persistir y reconstruir la pantalla
  saveToStorage(true);
  renderTabs();
  renderApp();

  if (typeof scrollActiveWeekIntoView === "function") {
    scrollActiveWeekIntoView();
  }
};













/* ========================================================= */
/* MÓDULO CONTROL DE PESO CORPORAL                           */
/* ========================================================= */

const WEIGHT_STORAGE_KEY = 'gym_weight_log_v1';
let weightLog = [];
let isWeightModuleInitialized = false; // <-- GUARD PARA EVITAR DUPLICACIÓN

function loadWeightLog() {
  const data = localStorage.getItem(WEIGHT_STORAGE_KEY);
  if (data) {
    try {
      weightLog = JSON.parse(data);
      weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (e) {
      console.error("Error cargando historial de peso", e);
      weightLog = [];
    }
  } else {
    weightLog = [];
  }
}

function saveWeightLog() {
  weightLog.sort((a, b) => new Date(a.date) - new Date(b.date));
  localStorage.setItem(WEIGHT_STORAGE_KEY, JSON.stringify(weightLog));
}








/* ========================================================= */
/* MENÚ PRINCIPAL NAVEGACIÓN                                 */
/* ========================================================= */
function initMainMenu() {
  const btnMenu = document.getElementById('btn-main-menu');
  const overlay = document.getElementById('main-menu-overlay');
  const btnClose = document.getElementById('btn-close-menu');
  const btnProgress = document.getElementById('btn-progress-module');
  const btnWeight = document.getElementById('btn-weight-module');
  if (btnMenu && overlay && btnClose) {
    // Abrir menú principal
    btnMenu.addEventListener('click', () => {
      overlay.style.display = 'flex';
    });
    // Cerrar menú con la cruz
    btnClose.addEventListener('click', () => {
      overlay.style.display = 'none';
    });
    // Cerrar si tocan fuera del menú
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
    // Cerrar menú si pulsan en "Peso Corporal" (para dejar que actúe su propio evento)
    if (btnWeight) {
      btnWeight.addEventListener('click', () => {
        overlay.style.display = 'none';
      });
    }
  }
}











function initWeightModule() {
  // Si ya se agregaron los listeners previamente, abortamos silenciosamente
  if (isWeightModuleInitialized) return;

  loadWeightLog();

  // Asignar fecha de hoy al input por defecto
  const dateInput = document.getElementById('weight-date');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  const btnOpen = document.getElementById('btn-weight-module');
  const btnClose = document.getElementById('btn-close-weight');
  const appContainer = document.getElementById('app-container');
  const weightContainer = document.getElementById('weight-container');

  // Transiciones de vistas (se registran UNA SOLA VEZ)
  if (btnOpen && btnClose && appContainer && weightContainer) {
    btnOpen.addEventListener('click', () => {
      appContainer.style.display = 'none';
      weightContainer.style.display = 'flex';
      renderWeightModule();
    });

    btnClose.addEventListener('click', () => {
      appContainer.style.display = 'block';
      weightContainer.style.display = 'none';
    });
  }

  const btnAdd = document.getElementById('btn-add-weight');
  if (btnAdd) {
    btnAdd.addEventListener('click', addWeightRecord);
  }

  // Sellamos la inicialización para futuras llamadas de init()
  isWeightModuleInitialized = true;
}


function addWeightRecord() {
  const dateInput = document.getElementById('weight-date');
  const valueInput = document.getElementById('weight-value');

  const date = dateInput.value;
  const valueStr = valueInput.value.replace(',', '.'); // Tolerancia a comas
  const value = parseFloat(valueStr);

  if (!date) {
    alert("Por favor, seleccioná una fecha.");
    return;
  }
  if (isNaN(value) || value <= 0) {
    alert("Por favor, ingresá un peso corporal válido.");
    return;
  }

  // Sobrescribir si hay registro mismo día, de lo contrario agregar
  const existingIndex = weightLog.findIndex(w => w.date === date);
  if (existingIndex >= 0) {
    weightLog[existingIndex].weight = value;
  } else {
    weightLog.push({ date: date, weight: value });
  }

  saveWeightLog();
  renderWeightModule();

  valueInput.value = ""; // Limpiar input post-guardado
}

window.deleteWeightRecord = function (date) {
  if (!confirm("¿Borrar este registro?")) return;
  weightLog = weightLog.filter(w => w.date !== date);
  saveWeightLog();
  renderWeightModule();
};

function renderWeightModule() {
  renderWeightTable();
  renderWeightChart();
}

/* ========================================================= */
/* TABLA DE REGISTROS (Render)                               */
/* ========================================================= */
function renderWeightTable() {
  const tbody = document.getElementById('weight-table-body');
  if (!tbody) return;

  tbody.innerHTML = "";

  // Invertimos clonando el log para mostrar del más nuevo al más antiguo
  const reversedLog = [...weightLog].reverse();

  if (reversedLog.length === 0) {
    tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding: 24px 0; color: #8e8e93;'>Aún no hay registros cargados</td></tr>";
    return;
  }

  reversedLog.forEach(record => {
    const parts = record.date.split("-");
    const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
            <td>${formattedDate}</td>
            <td style="color: var(--primary);">${record.weight.toFixed(1)}</td>
            <td>
                <button class="btn-delete-weight" title="Borrar registro" onclick="deleteWeightRecord('${record.date}')">✖</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

/* ========================================================= */
/* GRÁFICO DE EVOLUCIÓN (Native HTML5 Canvas)                */
/* ========================================================= */
function renderWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  // Requiere mínimo 2 puntos para unir una línea
  if (weightLog.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "13px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Agregá al menos 2 registros para ver el gráfico", width / 2, height / 2);
    return;
  }

  const padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const weights = weightLog.map(w => w.weight);
  const minW = Math.min(...weights) - 1.5; // Margen dinámico inferior
  const maxW = Math.max(...weights) + 1.5; // Margen dinámico superior
  const range = maxW - minW;

  // Dibujo de líneas horizontales base
  ctx.strokeStyle = "#e5e5ea";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(width - padding, padding);
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Dibujo de la línea de evolución (Azul)
  ctx.strokeStyle = "#007aff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  weightLog.forEach((record, idx) => {
    const x = padding + (idx / (weightLog.length - 1)) * chartW;
    const normalizedY = (record.weight - minW) / range;
    const y = height - padding - (normalizedY * chartH);

    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dibujo de los puntos en los cruces
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#007aff";

  weightLog.forEach((record, idx) => {
    const x = padding + (idx / (weightLog.length - 1)) * chartW;
    const normalizedY = (record.weight - minW) / range;
    const y = height - padding - (normalizedY * chartH);

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  });
}



/* ===================================================== */
/* MÓDULO: PROGRESO DE EJERCICIOS                        */
/* ===================================================== */

const PROGRESS_STORAGE_KEY = "gym_progress_v1";
let progressData = [];

function initProgressModule() {
  loadProgressData();

  const btnOpen = document.getElementById("btn-progress-module");
  const btnClose = document.getElementById("btn-close-progress");
  const container = document.getElementById("progress-container");

  if (btnOpen && container && btnClose) {
    btnOpen.addEventListener("click", () => {
      // Ocultar menú principal si está abierto
      document.getElementById("main-menu-overlay").style.display = "none";

      // Mostrar contenedor
      container.style.display = "flex";

      // Setear fecha actual por defecto en el form
      const hoy = new Date();
      // Formato YYYY-MM-DD local
      const offset = hoy.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(hoy - offset)).toISOString().split('T')[0];
      document.getElementById('progress-date').value = localISOTime;

      loadExerciseSelects();
      renderProgressUI();
    });

    btnClose.addEventListener("click", () => {
      container.style.display = "none";
    });
  }

  const btnAdd = document.getElementById("btn-add-progress");
  if (btnAdd) {
    btnAdd.addEventListener("click", handleAddProgress);
  }

  const filterSelect = document.getElementById("progress-filter-select");
  if (filterSelect) {
    filterSelect.addEventListener("change", renderProgressUI);
  }
}



/* Persistencia de Progreso */
function loadProgressData() {
  const data = localStorage.getItem(PROGRESS_STORAGE_KEY);
  if (data) {
    try {
      progressData = JSON.parse(data);
    } catch {
      progressData = [];
    }
  } else {
    progressData = [];
  }
}

function saveProgressData() {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressData));
}

function handleAddProgress() {
  const dateInput = document.getElementById("progress-date").value;
  const exInput = document.getElementById("progress-exercise-select").value;
  const valInput = document.getElementById("progress-value").value;

  if (!dateInput || !exInput || !valInput) {
    alert("Completá todos los campos.");
    return;
  }

  const newRecord = {
    id: Date.now() + Math.random().toString(36),
    date: dateInput,
    exercise: exInput,
    weight: parseFloat(valInput)
  };

  progressData.push(newRecord);
  saveProgressData();

  // Limpiar solo peso para facilitar carga masiva
  document.getElementById("progress-value").value = "";

  // Refrescar selector de filtrado por si es un ejercicio nuevo
  const filterSelect = document.getElementById("progress-filter-select");
  const prevFilter = filterSelect.value;
  loadExerciseSelects();
  filterSelect.value = exInput; // Autofiltrar por el recien agregado (muy útil)

  renderProgressUI();
}

window.deleteProgressRecord = (id) => {
  if (confirm("¿Eliminar este registro?")) {
    progressData = progressData.filter(r => r.id !== id);
    saveProgressData();

    const filterSelect = document.getElementById("progress-filter-select");
    const prevFilter = filterSelect.value;
    loadExerciseSelects();
    filterSelect.value = prevFilter;

    renderProgressUI();
  }
};



/* Carga de ejercicios disponibles en Catálogo */
function loadExerciseSelects() {
  const catalog = getFinalCatalog();
  const selectForm = document.getElementById("progress-exercise-select");
  const selectFilter = document.getElementById("progress-filter-select");

  if (!selectForm || !selectFilter) return;

  const prevFormVal = selectForm.value;
  const prevFilterVal = selectFilter.value;

  let optionsHtml = '<option value="">Selecciona Ejercicio...</option>';

  // Usamos el mismo recorrido por catalogos que existe en createExerciseRow
  for (const [grupo, items] of Object.entries(catalog)) {
    optionsHtml += `<optgroup label="${grupo}">`;
    items.forEach(item => {
      optionsHtml += `<option value="${item}">${item}</option>`;
    });
    optionsHtml += `</optgroup>`;
  }

  selectForm.innerHTML = optionsHtml;
  selectForm.value = prevFormVal; // Restaurar si había algo

  // Para el filtro extraemos solo los que tienen AL MENOS 1 registro
  const ejerciciosConRegistros = [...new Set(progressData.map(r => r.exercise))].sort();

  let filterHtml = '<option value="">Todos los registros</option>';
  ejerciciosConRegistros.forEach(ex => {
    filterHtml += `<option value="${ex}">${ex}</option>`;
  });

  selectFilter.innerHTML = filterHtml;
  selectFilter.value = ejerciciosConRegistros.includes(prevFilterVal) ? prevFilterVal : "";
}


/* Render principal de UI (Tabla + Grafico) */
function renderProgressUI() {
  const tbody = document.getElementById("progress-table-body");
  const filterVal = document.getElementById("progress-filter-select").value;

  // Filtrar
  let filteredData = progressData;
  if (filterVal) {
    filteredData = progressData.filter(r => r.exercise === filterVal);
  }

  // Ordenar descendente (más nuevo arriba) para tabla
  const sortedDesc = [...filteredData].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = "";
  sortedDesc.forEach(record => {
    // Formatear Fecha DD/MM
    const partes = record.date.split("-");
    const labelFecha = partes.length === 3 ? `${partes[2]}/${partes[1]}` : record.date;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${labelFecha}</td>
      <td style="font-size: 0.75rem; color:#444;">${record.exercise}</td>
      <td style="color: var(--primary);">${record.weight}</td>
      <td style="text-align:right;">
        <button class="btn-delete-progress" type="button" onclick="deleteProgressRecord('${record.id}')">✖</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Renderizar Gráfica solo con los datos filtrados
  renderProgressChart(filteredData, filterVal);
}



/* Renderizado Gráfica de Progreso de línea Vanilla JS */
function renderProgressChart(data, filterName) {
  const canvas = document.getElementById("progress-chart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  if (!filterName) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Seleccioná un ejercicio para ver su gráfica", w / 2, h / 2);
    return;
  }

  if (data.length < 2) {
    ctx.fillStyle = "#8e8e93";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Faltan datos (2 o +) para graficar", w / 2, h / 2);
    return;
  }

  // Ordenar ascendente para la gráfica (más viejo a izquierda, nuevo a derecha)
  const sortedAsc = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  const pesos = sortedAsc.map(r => r.weight);
  const minW = Math.min(...pesos);
  const maxW = Math.max(...pesos);

  const padY = 25;
  const padX = 25;
  const chartW = w - (padX * 2);
  const chartH = h - (padY * 2);
  let range = maxW - minW;
  if (range === 0) range = 10; // Si todos los pesos son iguales, forzar rango visual

  // Dibujar línea principal
  ctx.beginPath();
  ctx.strokeStyle = "var(--primary)";
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";

  sortedAsc.forEach((pt, i) => {
    const fracX = i / (sortedAsc.length - 1);
    const fracY = (pt.weight - minW) / range;

    const x = padX + (fracX * chartW);
    const y = h - padY - (fracY * chartH);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dibujar puntos y etiquetas
  ctx.fillStyle = "var(--primary)";
  ctx.textAlign = "center";
  ctx.font = "10px sans-serif";

  sortedAsc.forEach((pt, i) => {
    const fracX = i / (sortedAsc.length - 1);
    const fracY = (pt.weight - minW) / range;

    const x = padX + (fracX * chartW);
    const y = h - padY - (fracY * chartH);

    // Punto
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Etiqueta peso
    ctx.fillStyle = "var(--text)";
    ctx.fillText(pt.weight, x, y - 10);
    ctx.fillStyle = "var(--primary)"; // Reset para el siguiente punto
  });
}
