import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoovV6Vds98iJbxnowkpaUXZaNF3MUM-0",
  authDomain: "controle-de-frotas-fbef5.firebaseapp.com",
  projectId: "controle-de-frotas-fbef5",
  storageBucket: "controle-de-frotas-fbef5.firebasestorage.app",
  messagingSenderId: "515556626253",
  appId: "1:515556626253:web:59d31c82635983dd6b7104",
};

const ADMIN_PIN = "1234";
const ADMIN_SESSION_KEY = "controleFrotasAdmin";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const fleetCollection = collection(db, "composicoes");

const elements = {
  adminForm: document.querySelector("#admin-form"),
  adminPin: document.querySelector("#admin-pin"),
  logoutAdmin: document.querySelector("#logout-admin"),
  addFleet: document.querySelector("#add-fleet"),
  search: document.querySelector("#fleet-search"),
  count: document.querySelector("#fleet-count"),
  syncStatus: document.querySelector("#sync-status"),
  list: document.querySelector("#fleet-list"),
  empty: document.querySelector("#empty-state"),
  dialog: document.querySelector("#fleet-dialog"),
  detailsDialog: document.querySelector("#details-dialog"),
  form: document.querySelector("#fleet-form"),
  dialogTitle: document.querySelector("#dialog-title"),
  detailsTitle: document.querySelector("#details-title"),
  detailsBody: document.querySelector("#details-body"),
  closeDialog: document.querySelector("#close-dialog"),
  closeDetails: document.querySelector("#close-details"),
  cancelForm: document.querySelector("#cancel-form"),
  toast: document.querySelector("#toast"),
  fleetId: document.querySelector("#fleet-id"),
  placa: document.querySelector("#placa"),
  tipoCavalo: document.querySelector("#tipo-cavalo"),
  goCarreta: document.querySelector("#go-carreta"),
  empresa: document.querySelector("#empresa"),
  modal: document.querySelector("#modal"),
  comCasca: document.querySelector("#com-casca"),
  catracas: document.querySelector("#catracas"),
  fueiros: document.querySelector("#fueiros"),
};

let fleets = [];
let filteredFleets = [];
let isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
let toastTimeout;

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatPlate(value) {
  const raw = String(value ?? "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 7);

  if (raw.length <= 3) {
    return raw;
  }

  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  toastTimeout = window.setTimeout(() => {
    elements.toast.classList.add("hidden");
  }, 3000);
}

function updateAdminView() {
  elements.addFleet.classList.toggle("hidden", !isAdmin);
  elements.logoutAdmin.classList.toggle("hidden", !isAdmin);
  elements.adminForm.classList.toggle("hidden", isAdmin);
  renderFleets();
}

function getFleetSearchText(fleet) {
  return normalizeText(
    [
      fleet.placa,
      fleet.tipoCavalo,
      fleet.goCarreta,
      fleet.empresa,
      fleet.modal,
      fleet.comCasca,
      fleet.catracas,
      fleet.fueiros,
    ].join(" ")
  );
}

function applyFilter() {
  const searchTerm = normalizeText(elements.search.value);
  filteredFleets = searchTerm
    ? fleets.filter((fleet) => getFleetSearchText(fleet).includes(searchTerm))
    : [...fleets];

  renderFleets();
}

function createFleetCard(fleet) {
  const article = document.createElement("article");
  article.className = "fleet-card";
  article.tabIndex = 0;
  article.role = "button";
  article.setAttribute("aria-label", `Abrir detalhes de ${fleet.placa}`);
  article.innerHTML = `
    <div class="card-head">
      <strong class="plate">${escapeHtml(fleet.placa)}</strong>
      <span class="modal-pill">${escapeHtml(fleet.modal)}</span>
    </div>

    <div class="fleet-details">
      <div class="fleet-meta">
        <span>Cavalo</span>
        <span>${escapeHtml(fleet.tipoCavalo)}</span>
      </div>
      <div class="fleet-meta">
        <span>Carreta GO</span>
        <span>${escapeHtml(fleet.goCarreta)}</span>
      </div>
      <div class="fleet-meta">
        <span>Empresa</span>
        <span>${escapeHtml(fleet.empresa)}</span>
      </div>
      <div class="fleet-meta">
        <span>Operação</span>
        <span>Casca: ${escapeHtml(fleet.comCasca ?? "-")}</span>
      </div>
    </div>

    <div class="fleet-actions ${isAdmin ? "" : "hidden"}">
      <button class="icon-button edit-button" type="button" title="Editar" aria-label="Editar ${escapeHtml(
        fleet.placa
      )}">
        <i data-lucide="pencil"></i>
      </button>
      <button class="icon-button danger delete-button" type="button" title="Excluir" aria-label="Excluir ${escapeHtml(
        fleet.placa
      )}">
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;

  article.addEventListener("click", () => openDetailsDialog(fleet));
  article.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDetailsDialog(fleet);
    }
  });

  article.querySelector(".edit-button")?.addEventListener("click", (event) => {
    event.stopPropagation();
    openFleetDialog(fleet);
  });
  article.querySelector(".delete-button")?.addEventListener("click", (event) => {
    event.stopPropagation();
    deleteFleet(fleet);
  });
  return article;
}

function renderFleets() {
  elements.list.replaceChildren(...filteredFleets.map(createFleetCard));
  elements.empty.classList.toggle("hidden", filteredFleets.length > 0);

  const total = filteredFleets.length;
  elements.count.textContent = `${total} ${total === 1 ? "conjunto" : "conjuntos"}`;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function clearForm() {
  elements.form.reset();
  elements.fleetId.value = "";
  elements.tipoCavalo.value = "Próprio";
  elements.modal.value = "Bitrem";
  elements.comCasca.value = "Sim";
  elements.catracas.value = "6";
  elements.fueiros.value = "2";
}

function openFleetDialog(fleet = null) {
  clearForm();

  if (fleet) {
    elements.dialogTitle.textContent = "Editar conjunto";
    elements.fleetId.value = fleet.id;
    elements.placa.value = fleet.placa ?? "";
    elements.tipoCavalo.value = fleet.tipoCavalo ?? "Próprio";
    elements.goCarreta.value = fleet.goCarreta ?? "";
    elements.empresa.value = fleet.empresa ?? "";
    elements.modal.value = ["Bitrem", "Tritrem"].includes(fleet.modal) ? fleet.modal : "Bitrem";
    elements.comCasca.value = fleet.comCasca ?? "Sim";
    elements.catracas.value = ["6", "12"].includes(String(fleet.catracas)) ? String(fleet.catracas) : "6";
    elements.fueiros.value = ["2", "4"].includes(String(fleet.fueiros)) ? String(fleet.fueiros) : "2";
  } else {
    elements.dialogTitle.textContent = "Novo conjunto";
  }

  elements.dialog.showModal();
  elements.placa.focus();
}

function closeFleetDialog() {
  elements.dialog.close();
  clearForm();
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value ?? "-")}</strong>
    </div>
  `;
}

function openDetailsDialog(fleet) {
  elements.detailsTitle.textContent = fleet.placa ?? "Composição";
  elements.detailsBody.innerHTML = `
    ${detailItem("Placa do cavalo", fleet.placa)}
    ${detailItem("Modelo do CM", fleet.tipoCavalo)}
    ${detailItem("GO da carreta", fleet.goCarreta)}
    ${detailItem("Empresa", fleet.empresa)}
    ${detailItem("Modal", fleet.modal)}
    ${detailItem("Com casca", fleet.comCasca)}
    ${detailItem("Catracas", fleet.catracas)}
    ${detailItem("Fueiros", fleet.fueiros)}
  `;
  elements.detailsDialog.showModal();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function closeDetailsDialog() {
  elements.detailsDialog.close();
}

async function saveFleet(event) {
  event.preventDefault();

  if (!isAdmin) {
    showToast("Entre como admin para salvar.");
    return;
  }

  const id = elements.fleetId.value;
  const payload = {
    placa: formatPlate(elements.placa.value),
    tipoCavalo: elements.tipoCavalo.value,
    goCarreta: elements.goCarreta.value.trim(),
    empresa: elements.empresa.value.trim(),
    modal: elements.modal.value,
    comCasca: elements.comCasca.value,
    catracas: elements.catracas.value,
    fueiros: elements.fueiros.value,
    updatedAt: serverTimestamp(),
  };

  if (
    !payload.placa ||
    !payload.goCarreta ||
    !payload.empresa ||
    !payload.modal ||
    !payload.comCasca ||
    !payload.catracas ||
    !payload.fueiros
  ) {
    showToast("Preencha todos os campos obrigatórios.");
    return;
  }

  try {
    if (id) {
      await updateDoc(doc(db, "composicoes", id), payload);
      showToast("Conjunto atualizado.");
    } else {
      await addDoc(fleetCollection, {
        ...payload,
        createdAt: serverTimestamp(),
      });
      showToast("Conjunto cadastrado.");
    }

    closeFleetDialog();
  } catch (error) {
    console.error(error);
    showToast("Não foi possível salvar no Firebase.");
  }
}

async function deleteFleet(fleet) {
  if (!isAdmin) {
    showToast("Entre como admin para excluir.");
    return;
  }

  const confirmed = window.confirm(`Excluir o conjunto ${fleet.placa}?`);
  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(doc(db, "composicoes", fleet.id));
    showToast("Conjunto excluído.");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível excluir no Firebase.");
  }
}

function handleAdminLogin(event) {
  event.preventDefault();
  const pin = elements.adminPin.value.trim();

  if (pin !== ADMIN_PIN) {
    showToast("PIN admin inválido.");
    elements.adminPin.select();
    return;
  }

  isAdmin = true;
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  elements.adminPin.value = "";
  showToast("Modo admin ativo.");
  updateAdminView();
}

function handleAdminLogout() {
  isAdmin = false;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  showToast("Modo visualização ativo.");
  updateAdminView();
}

function subscribeToFleets() {
  const fleetsQuery = query(fleetCollection, orderBy("placa", "asc"));

  onSnapshot(
    fleetsQuery,
    (snapshot) => {
      fleets = snapshot.docs.map((fleetDoc) => ({
        id: fleetDoc.id,
        ...fleetDoc.data(),
      }));

      elements.syncStatus.textContent = "Sincronizado";
      applyFilter();
    },
    (error) => {
      console.error(error);
      elements.syncStatus.textContent = "Erro no Firebase";
      showToast("Confira se o Firestore está ativo e com regras de acesso.");
    }
  );
}

elements.adminForm.addEventListener("submit", handleAdminLogin);
elements.logoutAdmin.addEventListener("click", handleAdminLogout);
elements.addFleet.addEventListener("click", () => openFleetDialog());
elements.search.addEventListener("input", applyFilter);
elements.form.addEventListener("submit", saveFleet);
elements.closeDialog.addEventListener("click", closeFleetDialog);
elements.closeDetails.addEventListener("click", closeDetailsDialog);
elements.cancelForm.addEventListener("click", closeFleetDialog);
elements.placa.addEventListener("input", () => {
  elements.placa.value = formatPlate(elements.placa.value);
});

elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) {
    closeFleetDialog();
  }
});

elements.detailsDialog.addEventListener("click", (event) => {
  if (event.target === elements.detailsDialog) {
    closeDetailsDialog();
  }
});

updateAdminView();
subscribeToFleets();
