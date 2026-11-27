import { tripError, message } from "./trip.js";
const base = new URL(".", import.meta.url).pathname;
const key = base + "avalanche.trip",
  params = new URLSearchParams(location.search);
function stored() {
  try {
    return JSON.parse(sessionStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}
let trip = stored();
for (const k of ["service", "start", "end", "pickup", "dropoff"])
  if (params.has(k)) trip[k] = params.get(k);
if (params.has("pickup") && !params.has("dropoff")) trip.dropoff = trip.pickup;
if (!["self", "driver"].includes(trip.service)) trip.service = "self";
let category = "";
const form = document.querySelector("[data-trip]"),
  car = document.querySelector("[data-car]");
const panel = document.querySelector("#enquiry");
function save() {
  try {
    sessionStorage.setItem(key, JSON.stringify(trip));
  } catch {}
}
function refresh() {
  let visible = 0;
  for (const card of document.querySelectorAll(".card")) {
    card.hidden =
      (card.dataset.services && !card.dataset.services.split(" ").includes(trip.service)) ||
      Boolean(category && card.dataset.category !== category);
    if (!card.hidden) visible++;
    const price = card.querySelector("[data-self]");
    if (price) {
      const rate = price.dataset[trip.service];
      price.textContent = rate + (rate === "Request a quote" ? "" : " / day");
    }
    for (const a of card.querySelectorAll("a"))
      a.href =
        base + "fleet/" + card.dataset.slug + "/?" + new URLSearchParams(trip);
  }
  const empty = document.querySelector("[data-empty]");
  if (empty) empty.hidden = visible > 0;
}
document.querySelectorAll("[data-filter]").forEach(
  (b) =>
    (b.onclick = () => {
      category = b.dataset.filter;
      document
        .querySelectorAll("[data-filter]")
        .forEach((other) =>
          other.setAttribute("aria-pressed", String(other === b)),
        );
      refresh();
    }),
);
if (form) {
  const f = form.elements;
  const supported = car?.dataset.services ? car.dataset.services.split(" ") : ["self", "driver"];
  if (!supported.includes(trip.service)) trip.service = supported[0];
  for (const input of f.service) {
    input.checked = input.value === trip.service;
    input.disabled = !supported.includes(input.value);
  }
  for (const k of ["start", "end", "pickup", "dropoff"])
    f[k].value = trip[k] || "";
  f.different.checked = !!trip.dropoff && trip.dropoff !== trip.pickup;
  function sync() {
    form.querySelector(".return-field").hidden = !f.different.checked;
    f.dropoff.required = f.different.checked;
    trip = {
      service: f.service.value,
      start: f.start.value,
      end: f.end.value,
      pickup: f.pickup.value.trim(),
      dropoff: (f.different.checked ? f.dropoff.value : f.pickup.value).trim(),
    };
    f.start.min = new Date(Date.now() + 10800000).toISOString().slice(0, 16);
    f.end.min = trip.start || f.start.min;
    f.end.setCustomValidity(
      trip.start && trip.end && trip.end <= trip.start
        ? "Return must be after pickup."
        : "",
    );
    save();
    refresh();
    if (panel) panel.hidden = true;
  }
  sync();
  form.addEventListener("input", sync);
  form.addEventListener("change", sync);
  form.onsubmit = (ev) => {
    ev.preventDefault();
    sync();
    const error = tripError(trip);
    if (error) {
      f.start.setCustomValidity(error);
      f.start.reportValidity();
      f.start.setCustomValidity("");
      return;
    }
    if (!car) {
      location.assign(base + "fleet/?" + new URLSearchParams(trip));
      return;
    }
    const text = message(car.dataset.name, trip);
    panel.hidden = false;
    panel.querySelector("pre").textContent = text;
    const wa = document.body.dataset.wa,
      send = panel.querySelector("[data-send]"),
      status = panel.querySelector("[role=status]");
    send.hidden = !wa;
    if (wa)
      send.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent(text);
    status.textContent = wa
      ? "Tap Send in WhatsApp to deliver your enquiry."
      : "Preview mode. You can copy the enquiry while the business number is being confirmed.";
    panel.querySelector("[data-copy]").onclick = async () => {
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = "Enquiry copied.";
      } catch {
        const range = document.createRange();
        range.selectNodeContents(panel.querySelector("pre"));
        const selection = getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        status.textContent = "Message selected. Use your device’s Copy action.";
      }
    };
    const apply = panel.querySelector("[data-apply]");
    if (apply)
      apply.href =
        base +
        "account/?" +
        new URLSearchParams({ ...trip, car: car.dataset.car });
    panel.scrollIntoView({ block: "nearest" });
  };
}
refresh();
// Progressive enhancement: content stays visible without JS or animation support.
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileViewport = window.matchMedia("(max-width: 900px)");
const menu = document.querySelector(".mobile-menu");
if (menu) {
  const trigger = menu.querySelector("summary");
  const navigation = menu.querySelector("nav");
  const header = menu.closest("header");
  const background = [...document.querySelectorAll("main, footer, .head > .brand, .head > .contact")];
  let previousFocus;
  let closing = false;
  let scrollY = 0;
  let locked = false;
  const inertState = new Map();
  function syncMenu() {
    const open = menu.open && mobileViewport.matches;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
    if (open === locked) return;
    locked = open;
    if (open) {
      previousFocus = document.activeElement;
      scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
      document.body.classList.add("menu-open");
      header.classList.add("menu-active");
      menu.setAttribute("role", "dialog");
      menu.setAttribute("aria-label", "Mobile navigation");
      menu.setAttribute("aria-modal", "true");
      for (const element of background) {
        inertState.set(element, element.inert);
        element.inert = true;
      }
      trigger.focus();
    } else {
      document.body.classList.remove("menu-open");
      document.body.style.top = "";
      header.classList.remove("menu-active");
      menu.removeAttribute("role");
      menu.removeAttribute("aria-label");
      menu.removeAttribute("aria-modal");
      for (const [element, inert] of inertState) element.inert = inert;
      inertState.clear();
      window.scrollTo(0, scrollY);
      previousFocus?.focus({ preventScroll: true });
    }
  }
  async function closeMenu() {
    if (closing || !menu.open) return;
    closing = true;
    menu.classList.add("is-closing");
    if (!reducedMotion.matches && navigation.animate) {
      const animation = navigation.animate(
        [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-16px)" }],
        { duration: 200, easing: "ease-in", fill: "forwards" },
      );
      await animation.finished.catch(() => {});
      animation.cancel();
    }
    menu.open = false;
    menu.classList.remove("is-closing");
    closing = false;
    syncMenu();
  }
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    if (menu.open) closeMenu();
    else {
      menu.open = true;
      syncMenu();
    }
  });
  menu.addEventListener("toggle", syncMenu);
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (!locked) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    }
    if (event.key !== "Tab") return;
    const controls = [trigger, ...navigation.querySelectorAll("a[href]")];
    const index = controls.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) {
      event.preventDefault();
      controls.at(-1).focus();
    } else if (!event.shiftKey && (index === controls.length - 1 || index === -1)) {
      event.preventDefault();
      trigger.focus();
    }
  });
  mobileViewport.addEventListener("change", () => {
    if (!mobileViewport.matches) menu.open = false;
    syncMenu();
  });
}
if (!reducedMotion.matches && "IntersectionObserver" in window && Element.prototype.animate) {
  const animations = new Set();
  const observer = new IntersectionObserver((entries) => {
    let stagger = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      if (element.matches(".card") && mobileViewport.matches) continue;
      if (element.contains(document.activeElement)) continue;
      const animation = element.animate(
        [
          { opacity: 0, transform: "translateY(20px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: 480,
          delay: Math.min(stagger++ * 80, 240),
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        },
      );
      animations.add(animation);
      const cleanup = () => animations.delete(animation);
      animation.onfinish = cleanup;
      animation.oncancel = cleanup;
    }
  }, { threshold: 0.08 });
  document.querySelectorAll(
    ".card, .steps > li, .section-head, .inner > h1, .car-view, .panel",
  ).forEach((element) => observer.observe(element));
  // Never obscure a keyboard-focused control or ignore a changed motion preference.
  document.addEventListener("focusin", () => {
    for (const animation of animations)
      if (animation.effect.target.contains(document.activeElement)) animation.finish();
  });
  reducedMotion.addEventListener("change", (event) => {
    if (!event.matches) return;
    observer.disconnect();
    for (const animation of animations) animation.cancel();
  });
}
if ("serviceWorker" in navigator && isSecureContext)
  navigator.serviceWorker.register(base + "sw.js").catch(() => {});
