import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCj6d_PudMcn5y-6pWEn0kAmxnhxBFN5xY",
  authDomain: "notes-pro-id-837194y28492.firebaseapp.com",
  projectId: "notes-pro-id-837194y28492",
  storageBucket: "notes-pro-id-837194y28492.firebasestorage.app",
  messagingSenderId: "1063801319971",
  appId: "1:1063801319971:web:c02b550b04b972d4aab796"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const notesRef = collection(db, "notes");

const notesEl = document.getElementById("notes");
const loadingEl = document.getElementById("loading");
const emptyEl = document.getElementById("empty");
const modal = document.getElementById("modal");
const form = document.getElementById("noteForm");
const typeEl = document.getElementById("type");
const contentEl = document.getElementById("content");
const modalTitle = document.getElementById("modalTitle");
const saveBtn = form.querySelector(".save");

let editingId = null;

function openCreateModal() {
  editingId = null;
  modalTitle.textContent = "Новая заметка";
  saveBtn.textContent = "Сохранить";
  form.reset();
  modal.classList.remove("hidden");
  typeEl.focus();
}

function openEditModal(note) {
  editingId = note.id;
  modalTitle.textContent = "Изменить заметку";
  saveBtn.textContent = "Сохранить изменения";
  typeEl.value = note.type || "";
  contentEl.value = note.content || "";
  modal.classList.remove("hidden");
  typeEl.focus();
}

document.getElementById("addBtn").addEventListener("click", openCreateModal);
document.getElementById("closeBtn").addEventListener("click", closeModal);
modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

function closeModal() {
  modal.classList.add("hidden");
  form.reset();
  editingId = null;
  modalTitle.textContent = "Новая заметка";
  saveBtn.textContent = "Сохранить";
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const type = typeEl.value.trim();
  const content = contentEl.value.trim();
  if (!type || !content) return;

  saveBtn.disabled = true;
  saveBtn.textContent = editingId ? "Сохранение…" : "Сохранение…";

  try {
    if (editingId) {
      await updateDoc(doc(db, "notes", editingId), { type, content });
    } else {
      await addDoc(notesRef, { type, content, pinned: false, createdAt: serverTimestamp() });
    }
    closeModal();
  } catch (err) {
    alert(editingId ? "Не удалось изменить заметку. Проверь настройки Firestore." : "Не удалось сохранить заметку. Проверь настройки Firestore.");
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Сохранить";
  }
});

const q = query(notesRef, orderBy("createdAt", "desc"));
onSnapshot(q, snapshot => {
  loadingEl.classList.add("hidden");
  const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  items.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || getTime(b) - getTime(a));
  render(items);
}, err => {
  loadingEl.textContent = "Не удалось загрузить заметки. Проверь Firestore и правила доступа.";
  console.error(err);
});

function getTime(n) { return n.createdAt?.toMillis?.() ?? 0; }

function render(items) {
  notesEl.innerHTML = "";
  emptyEl.classList.toggle("hidden", items.length !== 0);
  for (const note of items) notesEl.appendChild(createNote(note));
}

function createNote(note) {
  const article = document.createElement("article");
  article.className = "note";

  const title = document.createElement("h4");
  title.textContent = note.type || "Без типа";

  const star = document.createElement("button");
  star.className = `star${note.pinned ? " pinned" : ""}`;
  star.textContent = "★";
  star.title = note.pinned ? "Открепить" : "Закрепить";
  star.setAttribute("aria-label", star.title);
  star.addEventListener("click", async () => {
    star.disabled = true;
    try {
      await updateDoc(doc(db, "notes", note.id), { pinned: !note.pinned });
    } catch (err) {
      console.error(err);
      alert("Не удалось изменить закрепление.");
    } finally {
      star.disabled = false;
    }
  });

  const menuWrap = document.createElement("div");
  menuWrap.className = "note-menu";

  const menuBtn = document.createElement("button");
  menuBtn.className = "menu-btn";
  menuBtn.textContent = "⋮";
  menuBtn.title = "Действия";
  menuBtn.setAttribute("aria-label", "Действия с заметкой");

  const menu = document.createElement("div");
  menu.className = "menu hidden";

  const editBtn = document.createElement("button");
  editBtn.className = "menu-item";
  editBtn.textContent = "Изменить";
  editBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    openEditModal(note);
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "menu-item danger";
  deleteBtn.textContent = "Удалить";
  deleteBtn.addEventListener("click", async () => {
    menu.classList.add("hidden");
    if (!confirm("Удалить эту заметку? Это действие нельзя отменить.")) return;
    deleteBtn.disabled = true;
    try {
      await deleteDoc(doc(db, "notes", note.id));
    } catch (err) {
      console.error(err);
      alert("Не удалось удалить заметку. Проверь настройки Firestore.");
      deleteBtn.disabled = false;
    }
  });

  menu.append(editBtn, deleteBtn);
  menuWrap.append(menuBtn, menu);
  menuBtn.addEventListener("click", e => {
    e.stopPropagation();
    document.querySelectorAll(".menu").forEach(m => {
      if (m !== menu) m.classList.add("hidden");
    });
    menu.classList.toggle("hidden");
  });

  const text = document.createElement("p");
  const content = String(note.content ?? "");
  const long = content.length > 12;
  text.textContent = long ? content.slice(0, 12) + "…" : content;

  article.append(title, star, menuWrap, text);

  if (long) {
    const expand = document.createElement("button");
    expand.className = "expand";
    expand.textContent = "Развернуть";
    let opened = false;
    expand.addEventListener("click", () => {
      opened = !opened;
      text.textContent = opened ? content : content.slice(0, 12) + "…";
      expand.textContent = opened ? "Свернуть" : "Развернуть";
    });
    article.appendChild(expand);
  }

  return article;
}

document.addEventListener("click", () => {
  document.querySelectorAll(".menu").forEach(menu => menu.classList.add("hidden"));
});
