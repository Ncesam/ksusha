import "./styles.css";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initScrollReveal() {
  const blocks = document.querySelectorAll("[data-reveal]");
  if (!blocks.length) return;

  const revealBlock = (el) => {
    el.classList.add("is-inview");
    const scripts = el.querySelectorAll("[data-script-reveal]");
    if (prefersReducedMotion()) {
      scripts.forEach((n) => n.classList.add("is-script-visible"));
      return;
    }
    scripts.forEach((node, i) => {
      window.setTimeout(() => node.classList.add("is-script-visible"), 80 + i * 110);
    });
  };

  if (prefersReducedMotion()) {
    blocks.forEach(revealBlock);
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        revealBlock(e.target);
        io.unobserve(e.target);
      }
    },
    { root: null, rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );

  for (const el of blocks) io.observe(el);
}

function initHeroScriptReveal() {
  const heroScripts = document.querySelectorAll(".hero [data-script-reveal]");
  if (!heroScripts.length) return;

  if (prefersReducedMotion()) {
    heroScripts.forEach((n) => n.classList.add("is-script-visible"));
    return;
  }

  heroScripts.forEach((node, i) => {
    window.setTimeout(() => node.classList.add("is-script-visible"), 200 + i * 140);
  });
}

function initParallax() {
  if (prefersReducedMotion()) return;

  const layers = document.querySelectorAll(".parallax-layer[data-parallax]");
  if (!layers.length) return;

  let ticking = false;
  const y = () => window.scrollY || window.pageYOffset;

  const update = () => {
    ticking = false;
    const scroll = y();
    for (const layer of layers) {
      const k = Number(layer.getAttribute("data-parallax")) || 0.12;
      const offset = scroll * k * -1;
      layer.style.transform = `translate3d(0, ${offset}px, 0) rotate(${layer.classList.contains("decor__pearls--1") ? -8 : layer.classList.contains("decor__pearls--2") ? 6 : 3}deg)`;
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function initQuiz() {
  const form = document.getElementById("wedding-quiz");
  const note = document.getElementById("quiz-note");
  const steps = Array.from(document.querySelectorAll("[data-quiz-step]"));
  const prevBtn = document.querySelector("[data-quiz-prev]");
  const nextBtn = document.querySelector("[data-quiz-next]");
  const stepLabel = document.getElementById("quiz-step-label");
  const progressFill = document.querySelector(".quizProgress__fill");
  const progressDots = Array.from(document.querySelectorAll(".quizProgress__dot"));

  if (!(form instanceof HTMLFormElement) || !(note instanceof HTMLElement)) return;

  const setNote = (text) => {
    note.textContent = text;
  };

  let currentStep = 1;
  const totalSteps = steps.length || 3;

  const setStep = (step) => {
    currentStep = Math.max(1, Math.min(totalSteps, step));

    for (const el of steps) {
      const s = Number(el.getAttribute("data-quiz-step"));
      el.hidden = s !== currentStep;
    }

    if (stepLabel) stepLabel.textContent = `Шаг ${currentStep} из ${totalSteps}`;

    if (progressFill instanceof HTMLElement) {
      progressFill.style.width = `${Math.round((currentStep / totalSteps) * 100)}%`;
    }

    for (let i = 0; i < progressDots.length; i++) {
      const dot = progressDots[i];
      if (!(dot instanceof HTMLElement)) continue;
      dot.classList.toggle("quizProgress__dot--active", i === currentStep - 1);
    }

    if (prevBtn instanceof HTMLButtonElement) prevBtn.disabled = currentStep === 1;
    if (nextBtn instanceof HTMLButtonElement) nextBtn.hidden = currentStep === totalSteps;
  };

  const stepHasInvalid = (step) => {
    const root = steps.find((el) => Number(el.getAttribute("data-quiz-step")) === step);
    if (!root) return false;
    const controls = Array.from(root.querySelectorAll("input, select, textarea"));
    for (const c of controls) {
      if (c instanceof HTMLInputElement || c instanceof HTMLSelectElement || c instanceof HTMLTextAreaElement) {
        if (!c.checkValidity()) return true;
      }
    }
    return false;
  };

  const reportStepValidity = (step) => {
    const root = steps.find((el) => Number(el.getAttribute("data-quiz-step")) === step);
    if (!root) return;
    const firstInvalid = root.querySelector(":invalid");
    if (firstInvalid instanceof HTMLElement) {
      firstInvalid.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      if ("reportValidity" in firstInvalid && typeof firstInvalid.reportValidity === "function") {
        firstInvalid.reportValidity();
      }
    }
  };

  if (prevBtn instanceof HTMLButtonElement) {
    prevBtn.addEventListener("click", () => {
      setNote("");
      setStep(currentStep - 1);
    });
  }

  if (nextBtn instanceof HTMLButtonElement) {
    nextBtn.addEventListener("click", () => {
      setNote("");
      if (stepHasInvalid(currentStep)) {
        reportStepValidity(currentStep);
        return;
      }
      setStep(currentStep + 1);
    });
  }

  setStep(1);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (stepHasInvalid(currentStep)) {
      reportStepValidity(currentStep);
      return;
    }

    const data = new FormData(form);
    const payload = {};

    for (const [key, value] of data.entries()) {
      if (key === "drinks") {
        payload.drinks ??= [];
        payload.drinks.push(String(value));
      } else {
        payload[key] = String(value);
      }
    }

    const persistLocal = () => {
      try {
        localStorage.setItem("wedding_quiz_answer", JSON.stringify(payload));
        return true;
      } catch {
        return false;
      }
    };

    const apiBase =
      typeof import.meta.env.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL.trim() : "";

    if (apiBase) {
      const url = `${apiBase.replace(/\/$/, "")}/api/responses`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          persistLocal();
          setNote("Спасибо! Ответ отправлен.");
          return;
        }
        persistLocal();
        let msg = `Сервер ответил с кодом ${res.status}. Ответ сохранён только на этом устройстве.`;
        try {
          const errBody = await res.json();
          if (errBody && typeof errBody.error === "string") msg = `${errBody.error} Ответ сохранён только на этом устройстве.`;
        } catch {
          /* ignore */
        }
        setNote(msg);
        return;
      } catch {
        persistLocal();
        setNote("Нет соединения с сервером. Ответ сохранён только на этом устройстве.");
        return;
      }
    }

    if (persistLocal()) {
      setNote("Сохранено на этом устройстве. Спасибо!");
    } else {
      setNote("Не удалось сохранить (проверь настройки браузера).");
    }
  });
}

initParallax();
initScrollReveal();
initHeroScriptReveal();
initQuiz();
