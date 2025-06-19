import { getCurrentPageId } from "./navigation.js";

// Состояние и элементы, относящиеся к просмотрщику
const viewerState = {
  isOpen: false,
  scale: 1,
  maxScale: 4,
  isDragging: false,
  isPinching: false,
  startX: 0,
  startY: 0,
  translateX: 0,
  translateY: 0,
  initialPinchDistance: null,
};

let modal;
let modalImg;
let tg; // Объект Telegram
let lastTapTime = 0;

// --- Внутренние функции ---

function applyTransform() {
  modalImg.style.transform = `translate(${viewerState.translateX}px, ${viewerState.translateY}px) scale(${viewerState.scale})`;
}

function resetImageViewerState() {
  Object.assign(viewerState, {
    scale: 1,
    translateX: 0,
    translateY: 0,
    isDragging: false,
    isPinching: false,
    initialPinchDistance: null,
  });
  applyTransform();
  modalImg.classList.remove("zoomed");
}

function getDistance(touches) {
  return Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY
  );
}

function constrainPan() {
  const imgWidthScaled = modalImg.offsetWidth * viewerState.scale;
  const imgHeightScaled = modalImg.offsetHeight * viewerState.scale;
  const containerWidth = modal.clientWidth;
  const containerHeight = modal.clientHeight;
  const boundaryX = Math.max(0, (imgWidthScaled - containerWidth) / 2);
  const boundaryY = Math.max(0, (imgHeightScaled - containerHeight) / 2);
  viewerState.translateX = Math.max(-boundaryX, Math.min(boundaryX, viewerState.translateX));
  viewerState.translateY = Math.max(-boundaryY, Math.min(boundaryY, viewerState.translateY));
}

// --- Обработчики событий жестов ---

function onPointerDown(e) {
  if (!viewerState.isOpen || viewerState.isPinching) return;
  if (viewerState.scale > 1) {
    e.preventDefault();
    viewerState.isDragging = true;
    viewerState.startX = e.clientX - viewerState.translateX;
    viewerState.startY = e.clientY - viewerState.translateY;
    modalImg.classList.add("zoomed");
  }
}

function onPointerMove(e) {
  if (viewerState.isDragging && !viewerState.isPinching) {
    e.preventDefault();
    viewerState.translateX = e.clientX - viewerState.startX;
    viewerState.translateY = e.clientY - viewerState.startY;
    constrainPan();
    applyTransform();
  }
}

function onPointerUp() {
  viewerState.isDragging = false;
}

function onTouchStart(e) {
  if (!viewerState.isOpen) return;
  if (e.touches.length === 2) {
    e.preventDefault();
    viewerState.isPinching = true;
    viewerState.isDragging = false;
    viewerState.initialPinchDistance = getDistance(e.touches);
  }
}

function onTouchMove(e) {
  if (viewerState.isPinching && e.touches.length === 2) {
    e.preventDefault();
    const newDist = getDistance(e.touches);
    const scaleFactor = newDist / viewerState.initialPinchDistance;
    viewerState.scale = Math.max(
      1,
      Math.min(viewerState.scale * scaleFactor, viewerState.maxScale)
    );
    viewerState.initialPinchDistance = newDist;
    constrainPan();
    applyTransform();
  }
}

function onTouchEnd(e) {
  if (e.touches.length < 2) viewerState.isPinching = false;
  if (viewerState.scale <= 1) {
    resetImageViewerState();
  } else {
    constrainPan();
    applyTransform();
  }
}

function onWheel(e) {
  if (!viewerState.isOpen) return;
  e.preventDefault();
  const oldScale = viewerState.scale;
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  const newScale = Math.max(1, Math.min(oldScale + delta, viewerState.maxScale));
  if (newScale === oldScale) return;
  const rect = modal.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  viewerState.translateX = mouseX - (mouseX - viewerState.translateX) * (newScale / oldScale);
  viewerState.translateY = mouseY - (mouseY - viewerState.translateY) * (newScale / oldScale);
  viewerState.scale = newScale;
  if (newScale <= 1) {
    resetImageViewerState();
  } else {
    constrainPan();
    applyTransform();
    modalImg.classList.add("zoomed");
  }
}

function handleImageTap(e) {
  if (!viewerState.isOpen || viewerState.isDragging || viewerState.isPinching) return;
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTapTime;
  if (tapLength < 300 && tapLength > 0) {
    e.preventDefault();
    if (viewerState.scale > 1) {
      resetImageViewerState();
    } else {
      viewerState.scale = viewerState.maxScale;
      constrainPan();
      applyTransform();
      modalImg.classList.add("zoomed");
    }
    lastTapTime = 0;
  }
  lastTapTime = currentTime;
}

// --- Экспортируемые функции ---

export function openImageViewer(imageUrl) {
  history.pushState({ modal: true }, "", "#viewer");
  viewerState.isOpen = true;
  modal.style.display = "flex";
  tg.BackButton.show();
  modalImg.src = ""; // Сброс для гарантированного срабатывания onload
  modalImg.src = imageUrl;
  modalImg.onload = () => {
    const displayedWidth = modalImg.offsetWidth;
    const naturalWidth = modalImg.naturalWidth;
    viewerState.maxScale =
      displayedWidth > 0 && naturalWidth > 0 ? Math.max(1, naturalWidth / displayedWidth) : 4;
  };
}

export function closeImageViewer() {
  viewerState.isOpen = false;
  modal.style.display = "none";
  resetImageViewerState();
  if (getCurrentPageId() === "page-main") {
    tg.BackButton.hide();
  } else {
    tg.BackButton.show();
  }
}

export function isImageViewerOpen() {
  return viewerState.isOpen;
}

export function initImageViewer(telegramApp) {
  modal = document.getElementById("image-viewer-modal");
  modalImg = document.getElementById("image-viewer-content");
  tg = telegramApp;

  modal.addEventListener("click", (e) => {
    if (e.target === modal) history.back();
  });
  modal.addEventListener("wheel", onWheel, { passive: false });
  modalImg.addEventListener("click", handleImageTap);
  modalImg.addEventListener("pointerdown", onPointerDown);
  modalImg.addEventListener("pointermove", onPointerMove);
  modalImg.addEventListener("pointerup", onPointerUp);
  modalImg.addEventListener("pointercancel", onPointerUp);
  modalImg.addEventListener("pointerleave", onPointerUp);
  modalImg.addEventListener("touchstart", onTouchStart, { passive: false });
  modalImg.addEventListener("touchmove", onTouchMove, { passive: false });
  modalImg.addEventListener("touchend", onTouchEnd);
  modalImg.addEventListener("touchcancel", onTouchEnd);

  document.addEventListener("keydown", (e) => {
    if (viewerState.isOpen && e.key === "Escape") history.back();
  });
}
