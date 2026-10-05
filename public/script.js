const menuToggle = document.querySelector(".menu-toggle");
const primaryNavigation = document.querySelector("#primary-navigation");

if (menuToggle && primaryNavigation) {
  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    primaryNavigation.classList.remove("is-open");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    primaryNavigation.classList.toggle("is-open", !isOpen);
  });

  primaryNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

const filterButtons = [...document.querySelectorAll("[data-filter]")];
const projectCards = [...document.querySelectorAll(".project-card[data-category]")];

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((item) => {
      const selected = item === button;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-pressed", String(selected));
    });

    projectCards.forEach((card) => {
      card.hidden = filter !== "all" && card.dataset.category !== filter;
    });
  });
});

const inquirySelect = document.querySelector("#contact-interest");
const messageField = document.querySelector("#contact-message");
document.querySelectorAll("[data-inquiry]").forEach((link) => {
  link.addEventListener("click", () => {
    if (inquirySelect) inquirySelect.value = link.dataset.inquiry === "edificacion" || link.dataset.inquiry === "infraestructura" || link.dataset.inquiry === "equipamiento" ? "proyectos" : "otro";
    if (messageField) messageField.value = `Me interesa conversar sobre la tipología de ${link.dataset.inquiry}.`;
  });
});

const contactForm = document.querySelector("#contact-form");
const preparedMessage = document.querySelector("#prepared-message");
const messageOutput = document.querySelector("#message-output");
const copyButton = document.querySelector("#copy-message");
const copyStatus = document.querySelector("#copy-status");

if (contactForm && preparedMessage && messageOutput) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    const formData = new FormData(contactForm);
    const inquiry = [
      "CONSULTA PARA CONSORCIO PILLCO MARCA",
      "",
      `Nombre: ${formData.get("name")}`,
      `Correo: ${formData.get("email")}`,
      `Tema: ${contactForm.querySelector("#contact-interest").selectedOptions[0].text}`,
      "",
      "Mensaje:",
      formData.get("message"),
    ].join("\n");

    messageOutput.value = inquiry;
    preparedMessage.hidden = false;
    if (copyStatus) copyStatus.textContent = "Mensaje preparado. Puedes copiarlo o seleccionarlo manualmente.";
    preparedMessage.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

if (copyButton && messageOutput && copyStatus) {
  copyButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(messageOutput.value);
      copyStatus.textContent = "Consulta copiada al portapapeles.";
    } catch {
      messageOutput.focus();
      messageOutput.select();
      copyStatus.textContent = "No fue posible copiar automáticamente. El texto quedó seleccionado para copiarlo manualmente.";
    }
  });
}

const year = document.querySelector("#current-year");
if (year) year.textContent = String(new Date().getFullYear());


const ambientVideos = [...document.querySelectorAll("[data-ambient-video]")];

if (ambientVideos.length && typeof window.matchMedia === "function") {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const visibleVideos = new Set();
  const programmaticPauses = new WeakSet();
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  const shouldKeepPaused = () => motionPreference.matches || document.hidden || connection?.saveData === true;
  const pauseAmbientVideo = (video) => {
    if (video.paused) return;
    programmaticPauses.add(video);
    video.pause();
  };
  const syncAmbientVideo = (video) => {
    const canPlay = visibleVideos.has(video)
      && !shouldKeepPaused()
      && video.dataset.userPaused !== "true"
      && video.dataset.playBlocked !== "true"
      && video.dataset.finished !== "true";

    if (canPlay && video.paused) {
      video.play().catch(() => {
        video.dataset.playBlocked = "true";
      });
    } else if (!canPlay) {
      pauseAmbientVideo(video);
    }
  };
  const syncAllAmbientVideos = () => ambientVideos.forEach(syncAmbientVideo);
  const toggleAmbientPlayback = (video) => {
    if (video.paused) {
      delete video.dataset.userPaused;
      delete video.dataset.playBlocked;
      video.play().catch(() => {
        video.dataset.playBlocked = "true";
      });
      return;
    }
    video.dataset.userPaused = "true";
    video.pause();
  };

  ambientVideos.forEach((video) => {
    video.addEventListener("play", () => {
      delete video.dataset.userPaused;
      delete video.dataset.playBlocked;
      delete video.dataset.finished;
    });
    video.addEventListener("pause", () => {
      if (programmaticPauses.has(video)) {
        programmaticPauses.delete(video);
        return;
      }
      video.dataset.userPaused = "true";
    });
    video.addEventListener("click", () => {
      toggleAmbientPlayback(video);
    });
    video.addEventListener("keydown", (event) => {
      if (event.repeat || (event.code !== "Space" && event.key !== "Enter")) return;
      event.preventDefault();
      toggleAmbientPlayback(video);
    });
    video.addEventListener("error", () => {
      video.dataset.assetState = "unavailable";
    });
  });

  if ("IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) visibleVideos.add(entry.target);
        else visibleVideos.delete(entry.target);
        syncAmbientVideo(entry.target);
      });
    }, { rootMargin: "100px 0px", threshold: 0.12 });

    ambientVideos.forEach((video) => videoObserver.observe(video));
  } else {
    ambientVideos.forEach((video) => visibleVideos.add(video));
    syncAllAmbientVideos();
  }

  document.addEventListener("visibilitychange", syncAllAmbientVideos);
  if (typeof motionPreference.addEventListener === "function") {
    motionPreference.addEventListener("change", syncAllAmbientVideos);
  } else if (typeof motionPreference.addListener === "function") {
    motionPreference.addListener(syncAllAmbientVideos);
  }
  connection?.addEventListener?.("change", syncAllAmbientVideos);
}
