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

const portfolioGrid = document.querySelector("#portfolio-grid");
const portfolioStatus = document.querySelector("#portfolio-status");
const estadoFilterGroup = document.querySelector("#filtro-estado");
const distritoFilterGroup = document.querySelector("#filtro-distrito");

if (portfolioGrid && portfolioStatus) {
  const ETIQUETAS_ESTADO = {
    planificacion: "Planificación",
    ejecucion: "Ejecución",
    cerrada: "Cerrada",
    paralizada: "Paralizada",
  };

  let proyectos = [];
  let estadoActivo = "all";
  let distritoActivo = "all";

  const nombreEstado = (estado) => ETIQUETAS_ESTADO[estado] ?? estado;

  const construirFiltros = (grupo, valores, contenedor) => {
    if (!contenedor) return;
    contenedor.replaceChildren();

    const crearBoton = (valor, etiqueta) => {
      const boton = document.createElement("button");
      boton.type = "button";
      const activo = valor === "all";
      boton.className = `filter-button${activo ? " is-active" : ""}`;
      boton.dataset.value = valor;
      boton.setAttribute("aria-pressed", String(activo));
      boton.textContent = etiqueta;
      boton.addEventListener("click", () => {
        if (grupo === "estado") estadoActivo = valor;
        else distritoActivo = valor;

        [...contenedor.children].forEach((item) => {
          const seleccionado = item.dataset.value === valor;
          item.classList.toggle("is-active", seleccionado);
          item.setAttribute("aria-pressed", String(seleccionado));
        });

        renderProyectos();
      });
      return boton;
    };

    contenedor.append(crearBoton("all", "Todo"));
    valores
      .slice()
      .sort((a, b) => a.localeCompare(b, "es"))
      .forEach((valor) => {
        contenedor.append(crearBoton(valor, grupo === "estado" ? nombreEstado(valor) : valor));
      });
  };

  const crearTarjeta = (proyecto) => {
    const articulo = document.createElement("article");
    articulo.className = "project-card";

    const detalleUrl = `/proyectos/${proyecto.id}`;

    const arte = document.createElement("a");
    arte.className = "project-art project-art-building";
    arte.href = detalleUrl;
    arte.setAttribute("aria-label", `Ver detalle de ${proyecto.nombre}`);
    arte.innerHTML =
      '<svg viewBox="0 0 480 230"><path d="M54 193h372M95 193V93l70-42 70 42v100M235 193V72l71-34 70 34v121"/><path d="M117 112h24v29h-24zm52 0h24v29h-24zm89-18h25v31h-25zm53 0h25v31h-25zm-53 57h25v31h-25zm53 0h25v31h-25z"/><path class="art-accent" d="m90 86 75-45 74 45M230 65l76-36 76 36"/></svg>';
    const etiqueta = document.createElement("span");
    etiqueta.className = "art-label";
    etiqueta.textContent = proyecto.codigo || "OBRA";
    arte.append(etiqueta);

    const contenido = document.createElement("div");
    contenido.className = "project-content";

    const meta = document.createElement("div");
    meta.className = "card-meta";
    const metaPrograma = document.createElement("span");
    metaPrograma.textContent = proyecto.programa || "SIN PROGRAMA";
    const metaEstado = document.createElement("span");
    metaEstado.textContent = nombreEstado(proyecto.estado).toUpperCase();
    meta.append(metaPrograma, metaEstado);

    const titulo = document.createElement("h3");
    const tituloEnlace = document.createElement("a");
    tituloEnlace.className = "project-title-link";
    tituloEnlace.href = detalleUrl;
    tituloEnlace.textContent = proyecto.nombre;
    titulo.append(tituloEnlace);

    const distrito = document.createElement("p");
    distrito.textContent = `Distrito de ${proyecto.distrito || "—"}`;

    const avance = Math.max(0, Math.min(100, Number(proyecto.avance) || 0));
    const progreso = document.createElement("div");
    progreso.className = "project-progress";
    progreso.setAttribute("role", "img");
    progreso.setAttribute("aria-label", `Avance físico ${avance}%`);
    const pista = document.createElement("span");
    pista.className = "project-progress-track";
    const barra = document.createElement("span");
    barra.className = "project-progress-bar";
    barra.style.width = `${avance}%`;
    pista.append(barra);
    const progresoTexto = document.createElement("span");
    progresoTexto.className = "project-progress-value";
    progresoTexto.textContent = `${avance}%`;
    progreso.append(pista, progresoTexto);

    const enlace = document.createElement("a");
    enlace.className = "project-link";
    enlace.href = detalleUrl;
    enlace.innerHTML = 'Ver detalle de la obra <span aria-hidden="true">↗</span>';

    contenido.append(meta, titulo, distrito, progreso, enlace);
    articulo.append(arte, contenido);

    return articulo;
  };

  const renderProyectos = () => {
    const visibles = proyectos.filter(
      (proyecto) =>
        (estadoActivo === "all" || proyecto.estado === estadoActivo) &&
        (distritoActivo === "all" || proyecto.distrito === distritoActivo),
    );

    portfolioGrid.replaceChildren();
    portfolioGrid.setAttribute("aria-busy", "false");

    if (!visibles.length) {
      portfolioStatus.hidden = false;
      portfolioStatus.textContent = proyectos.length
        ? "No hay proyectos que coincidan con los filtros seleccionados."
        : "Aún no hay proyectos registrados.";
      return;
    }

    portfolioStatus.hidden = true;
    const fragmento = document.createDocumentFragment();
    visibles.forEach((proyecto) => fragmento.append(crearTarjeta(proyecto)));
    portfolioGrid.append(fragmento);
  };

  const mostrarError = () => {
    portfolioGrid.replaceChildren();
    portfolioGrid.setAttribute("aria-busy", "false");
    portfolioStatus.hidden = false;
    portfolioStatus.textContent = "No fue posible cargar los proyectos.";
    const reintentar = document.createElement("button");
    reintentar.type = "button";
    reintentar.className = "button button-dark portfolio-retry";
    reintentar.textContent = "Reintentar";
    reintentar.addEventListener("click", cargarProyectos);
    portfolioStatus.append(" ", reintentar);
  };

  async function cargarProyectos() {
    portfolioStatus.hidden = false;
    portfolioStatus.textContent = "Cargando proyectos…";
    portfolioGrid.setAttribute("aria-busy", "true");

    try {
      const respuesta = await fetch("/api/v1/proyectos", {
        headers: { Accept: "application/json" },
      });
      if (!respuesta.ok) throw new Error("Respuesta no válida");

      const cuerpo = await respuesta.json();
      proyectos = Array.isArray(cuerpo.data) ? cuerpo.data : [];

      construirFiltros(
        "estado",
        [...new Set(proyectos.map((proyecto) => proyecto.estado).filter(Boolean))],
        estadoFilterGroup,
      );
      construirFiltros(
        "distrito",
        [...new Set(proyectos.map((proyecto) => proyecto.distrito).filter(Boolean))],
        distritoFilterGroup,
      );

      renderProyectos();
    } catch {
      mostrarError();
    }
  }

  cargarProyectos();
}

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

const backToTop = document.querySelector("[data-back-to-top]");

if (backToTop) {
  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const syncBackToTop = () => {
    backToTop.hidden = window.scrollY < 400;
  };

  backToTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", syncBackToTop, { passive: true });
  syncBackToTop();
}


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
