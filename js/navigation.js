let currentPageId = "page-main";
const initialTitle = "Расписание ЗИС-231";

/**
 * Показывает указанную страницу и обновляет заголовок.
 * @param {string} pageId - ID страницы для отображения.
 * @param {string} title - Новый заголовок страницы.
 * @param {boolean} push - Нужно ли добавлять состояние в историю браузера.
 * @param {object} tg - Объект window.Telegram.WebApp.
 */
export function showPage(pageId, title, push = true, tg) {
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("active"));
  const targetPage = document.getElementById(pageId);

  if (targetPage) {
    targetPage.classList.add("active");
    targetPage.scrollTop = 0; // Прокрутка вверх при смене страницы
  }

  currentPageId = pageId;
  document.title = title || initialTitle;

  const headerTitleElement = document.querySelector(`#${pageId} .page-title`);
  if (headerTitleElement) {
    headerTitleElement.textContent = title;
  }

  if (push) {
    history.pushState({ page: pageId, title: title }, title, `#${pageId}`);
  }

  // Управление кнопкой "Назад" в Telegram
  if (pageId === "page-main") {
    tg.BackButton.hide();
  } else {
    tg.BackButton.show();
  }
}

/**
 * Инициализирует навигацию, обрабатывает кнопки браузера и Telegram.
 * @param {object} tg - Объект window.Telegram.WebApp.
 * @param {function} closeImageViewer - Функция для закрытия модального окна с изображением.
 * @param {function} isImageViewerOpen - Функция, возвращающая состояние модального окна.
 */
export function initNavigation(tg, closeImageViewer, isImageViewerOpen) {
  history.replaceState({ page: "page-main", title: initialTitle }, initialTitle, "#page-main");
  showPage("page-main", initialTitle, false, tg);

  // Обработка кликов по навигационным кнопкам
  document.querySelectorAll("[data-target-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetPageId = `page-${event.currentTarget.dataset.targetPage}`;
      const targetTitle = event.currentTarget.dataset.title;
      showPage(targetPageId, targetTitle, true, tg);
    });
  });

  // Обработка кнопки "Назад" в Telegram
  tg.onEvent("backButtonClicked", () => history.back());

  // Обработка кнопок "назад/вперед" в браузере
  window.onpopstate = (event) => {
    if (isImageViewerOpen()) {
      closeImageViewer();
    } else if (event.state && event.state.page) {
      showPage(event.state.page, event.state.title, false, tg);
    } else {
      showPage("page-main", initialTitle, false, tg);
    }
  };
}

/**
 * Возвращает ID текущей активной страницы.
 * @returns {string}
 */
export function getCurrentPageId() {
  return currentPageId;
}
