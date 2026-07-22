document.addEventListener("DOMContentLoaded", () => {
  const todoInput = document.getElementById("todo-input");
  const categorySelect = document.getElementById("category-select");
  const addBtn = document.getElementById("add-btn");
  const todoList = document.getElementById("todo-list");
  const filterArea = document.getElementById("filter-area");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const appView = document.getElementById("app-view");

  const TABLE_NAME = "todo_tbl";

  const db = window.sb;

  let todos = [];
  let currentFilter = "전체";
  let currentUserId = null;

  async function loadTodos() {
    const { data, error } = await db
      .from(TABLE_NAME)
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("failed to load todos from supabase", error);
      alert("할 일 목록을 불러오지 못했습니다.");
      return [];
    }

    return data;
  }

  async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const { data, error } = await db
      .from(TABLE_NAME)
      .insert({
        user_id: currentUserId,
        text,
        category: categorySelect.value || "개인",
        completed: false,
      })
      .select()
      .single();

    if (error) {
      console.error("failed to add todo", error);
      alert("할 일을 추가하지 못했습니다.");
      return;
    }

    todos.push(data);
    todoInput.value = "";
    todoInput.focus();
    render();
  }

  async function saveEdit(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return;

    const { error } = await db.from(TABLE_NAME).update({ text: trimmed }).eq("id", id);

    if (error) {
      console.error("failed to update todo", error);
      alert("할 일을 수정하지 못했습니다.");
      return;
    }

    const todo = todos.find((t) => t.id === id);
    if (todo) todo.text = trimmed;
    render();
  }

  async function deleteTodo(id) {
    if (!confirm("이 할 일을 삭제할까요?")) return;

    const { error } = await db.from(TABLE_NAME).delete().eq("id", id);

    if (error) {
      console.error("failed to delete todo", error);
      alert("할 일을 삭제하지 못했습니다.");
      return;
    }

    todos = todos.filter((t) => t.id !== id);
    render();
  }

  async function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    const nextCompleted = !todo.completed;
    const { error } = await db
      .from(TABLE_NAME)
      .update({ completed: nextCompleted })
      .eq("id", id);

    if (error) {
      console.error("failed to toggle todo", error);
      alert("완료 상태를 변경하지 못했습니다.");
      return;
    }

    todo.completed = nextCompleted;
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

  async function init(user) {
    currentUserId = user.id;
    progressText.textContent = "불러오는 중...";
    todos = await loadTodos();
    render();
  }

  window.addEventListener("auth:login", (e) => init(e.detail.user));

  (async function bootstrap() {
    const { data } = await db.auth.getSession();
    if (data.session?.user && appView && !appView.hidden) {
      init(data.session.user);
    }
  })();
});
