const SUPABASE_URL = "https://vjrxwlgmfiqizzadotly.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_ScDXv9MnyILCnV73TePOxA_YKh6b2C8";

window.sb = window.sb || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
  const sb = window.sb;

  const authView = document.getElementById("auth-view");
  const appView = document.getElementById("app-view");

  const authTabs = document.querySelectorAll(".auth-tab");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginMessage = document.getElementById("login-message");
  const signupMessage = document.getElementById("signup-message");
  const currentUserLabel = document.getElementById("current-user-label");
  const logoutBtn = document.getElementById("logout-btn");

  function switchTab(tab) {
    authTabs.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
    loginForm.hidden = tab !== "login";
    signupForm.hidden = tab !== "signup";
    loginMessage.textContent = "";
    signupMessage.textContent = "";
  }

  function showAuthView() {
    authView.hidden = false;
    appView.hidden = true;
  }

  function showAppView(user) {
    currentUserLabel.textContent = user?.email ? `${user.email}님` : "";
    authView.hidden = true;
    appView.hidden = false;
    window.dispatchEvent(new CustomEvent("auth:login", { detail: { user } }));
  }

  async function ensureUserRow(user) {
    const { error } = await sb.from("user_tbl").upsert({ id: user.id, email: user.email });
    if (error) console.error("failed to sync user_tbl row", error);
  }

  authTabs.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const passwordConfirm = document.getElementById("signup-password-confirm").value;

    if (!email || !password) {
      signupMessage.textContent = "이메일과 비밀번호를 입력해주세요.";
      return;
    }
    if (password !== passwordConfirm) {
      signupMessage.textContent = "비밀번호가 일치하지 않습니다.";
      return;
    }

    const submitBtn = signupForm.querySelector(".auth-submit");
    submitBtn.disabled = true;
    signupMessage.textContent = "가입 처리 중...";

    const { data, error } = await sb.auth.signUp({ email, password });

    submitBtn.disabled = false;

    if (error) {
      signupMessage.textContent = error.message || "회원가입에 실패했습니다.";
      return;
    }

    if (data.user) {
      await ensureUserRow(data.user);
    }

    signupForm.reset();

    if (data.session) {
      showAppView(data.user);
    } else {
      document.getElementById("login-email").value = email;
      switchTab("login");
      loginMessage.textContent = "회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요.";
    }
  });

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
      loginMessage.textContent = "이메일과 비밀번호를 입력해주세요.";
      return;
    }

    const submitBtn = loginForm.querySelector(".auth-submit");
    submitBtn.disabled = true;
    loginMessage.textContent = "로그인 중...";

    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    submitBtn.disabled = false;

    if (error) {
      loginMessage.textContent = "이메일 또는 비밀번호가 올바르지 않습니다.";
      return;
    }

    await ensureUserRow(data.user);

    loginForm.reset();
    loginMessage.textContent = "";
    showAppView(data.user);
  });

  logoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    switchTab("login");
    showAuthView();
  });

  (async function init() {
    const { data } = await sb.auth.getSession();
    if (data.session?.user) {
      showAppView(data.session.user);
    } else {
      showAuthView();
    }
  })();
});
