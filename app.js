document.addEventListener("DOMContentLoaded", () => {
  const todoInput = document.getElementById("todo-input");
  const categorySelect = document.getElementById("category-select");
  const addBtn = document.getElementById("add-btn");
  const todoList = document.getElementById("todo-list");
  const filterArea = document.getElementById("filter-area");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  const STORAGE_KEY = "todos";

  let todos = loadTodos();
  let currentFilter = "전체";

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.error("failed to load todos from localStorage", err);
      return [];
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function createId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    todos.push({
      id: createId(),
      text,
      category: categorySelect.value || "개인",
      completed: false,
      createdAt: new Date().toISOString(),
    });

    todoInput.value = "";
    todoInput.focus();
    saveTodos();
    render();
  }

  function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.text = trimmed;
    saveTodos();
    render();
  }

  function deleteTodo(id) {
    if (!confirm("이 할 일을 삭제할까요?")) return;
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    render();
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function getVisibleTodos() {
    const filtered =
      currentFilter === "전체"
        ? todos.slice()
        : todos.filter((t) => t.category === currentFilter);

    return filtered.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  }

  function renderProgress() {
    const total = todos.length;
    const done = todos.filter((t) => t.completed).length;

    if (total === 0) {
      progressFill.style.width = "0%";
      progressText.textContent = "할 일을 추가해보세요";
      return;
    }

    const percent = Math.round((done / total) * 100);
    progressFill.style.width = percent + "%";
    progressText.textContent = `${done}/${total} 완료 (${percent}%)`;
  }

  function render() {
    renderTodos();
    renderProgress();
  }

  function renderTodos() {
    todoList.innerHTML = "";

    const visible = getVisibleTodos();

    if (visible.length === 0) {
      todoList.innerHTML = `<li class="empty-message">할 일을 추가해보세요</li>`;
      return;
    }

    visible.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "todo-item" + (todo.completed ? " completed" : "");
      li.dataset.id = todo.id;

      li.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? "checked" : ""}>
        <span class="todo-text">${escapeHtml(todo.text)}</span>
        <span class="category-tag ${escapeHtml(todo.category)}">${escapeHtml(todo.category)}</span>
        <div class="todo-actions">
          <button type="button" class="edit-btn" title="수정">✎</button>
          <button type="button" class="delete-btn" title="삭제">🗑</button>
        </div>
      `;

      todoList.appendChild(li);
    });
  }

  function startEdit(li, id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (li.querySelector(".edit-input")) return;

    const textSpan = li.querySelector(".todo-text");
    const actions = li.querySelector(".todo-actions");

    const input = document.createElement("input");
    input.type = "text";
    input.className = "edit-input";
    input.value = todo.text;

    textSpan.replaceWith(input);
    actions.innerHTML = `<button type="button" class="confirm-edit-btn" title="확인">확인</button>`;
    input.focus();
    input.select();

    function commit() {
      saveEdit(id, input.value);
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commit();
      else if (e.key === "Escape") renderTodos();
    });
  }

  addBtn.addEventListener("click", addTodo);
  todoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTodo();
  });

  todoList.addEventListener("click", (e) => {
    const li = e.target.closest(".todo-item");
    if (!li) return;
    const id = li.dataset.id;

    if (e.target.classList.contains("todo-checkbox")) {
      toggleTodo(id);
    } else if (e.target.classList.contains("delete-btn")) {
      deleteTodo(id);
    } else if (e.target.classList.contains("edit-btn")) {
      startEdit(li, id);
    } else if (e.target.classList.contains("confirm-edit-btn")) {
      const input = li.querySelector(".edit-input");
      if (input) saveEdit(id, input.value);
    }
  });

  filterArea.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;

    currentFilter = btn.dataset.filter;
    [...filterArea.querySelectorAll(".filter-btn")].forEach((b) =>
      b.classList.toggle("active", b === btn)
    );
    renderTodos();
  });

  render();
});
