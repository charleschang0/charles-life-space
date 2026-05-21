const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const filterButtons = document.querySelectorAll(".filter-chip");
const noteCards = document.querySelectorAll(".note-card");
const studioSessionKey = "charles-life-space-studio-session";

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedFilter = button.dataset.filter;

    filterButtons.forEach((chip) => chip.classList.remove("is-active"));
    button.classList.add("is-active");

    noteCards.forEach((card) => {
      const shouldShow =
        selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

function hasStudioSession() {
  try {
    const raw = localStorage.getItem(studioSessionKey);
    if (!raw) return false;
    const session = JSON.parse(raw);
    if (!session.expiresAt || Date.now() > session.expiresAt) {
      localStorage.removeItem(studioSessionKey);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getStudioManageHref() {
  const inPostPage = window.location.pathname.includes("/posts/") || window.location.href.includes("/dist/posts/");
  return `${inPostPage ? "../" : "./"}studio/panel.html?panel=library`;
}

function mountPrivateManageEntry() {
  if (!hasStudioSession()) return;

  const link = document.createElement("a");
  link.className = "private-manage-link";
  link.href = getStudioManageHref();
  link.textContent = "管理文章";
  link.setAttribute("aria-label", "打開私密文章管理");
  document.body.appendChild(link);
}

mountPrivateManageEntry();
