// Функция для применения темы Telegram
const applyTelegramTheme = () => {
  const themeParams = Telegram.WebApp.themeParams;
  const body = document.body;

  if (themeParams) {
    for (const key in themeParams) {
      if (themeParams.hasOwnProperty(key)) {
        body.style.setProperty(`--tg-theme-${key.replace(/_color/, "-color")}`, themeParams[key]);
      }
    }

    if (themeParams.bg_color === "#ffffff" || themeParams.bg_color === "#f0f0f0") {
      body.classList.remove("telegram-dark");
      body.classList.add("telegram-light");
    } else {
      body.classList.remove("telegram-light");
      body.classList.add("telegram-dark");
    }
  } else {
    body.classList.add("telegram-light");
    console.warn("Telegram WebApp themeParams not available. Using default light theme.");
  }
};

// Функция для рендеринга списка расписания
const renderSchedule = (containerId, scheduleData) => {
  const listContainer = document.getElementById(containerId);
  if (listContainer) {
    // Группируем расписание по дате
    const groupedSchedule = scheduleData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = [];
      }
      // Только добавляем предмет, если он существует
      if (item.subject) {
        acc[item.date].push(item);
      }
      return acc;
    }, {});

    // Добавляем даты, которые могут не иметь предметов, но присутствуют в исходных данных
    scheduleData.forEach((item) => {
      if (!groupedSchedule[item.date]) {
        groupedSchedule[item.date] = [];
      }
    });

    const today = new Date();
    const todayString = `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${today.getFullYear()}`;

    let htmlContent = "";
    const sortedDates = Object.keys(groupedSchedule).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split(".").map(Number);
      const [dayB, monthB, yearB] = b.split(".").map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA - dateB;
    });

    sortedDates.forEach((date) => {
      const isToday = date === todayString;
      const todayClass = isToday ? "schedule-day-today" : "";
      const items = groupedSchedule[date];

      // --- НОВЫЙ КОД ДЛЯ ПОЛУЧЕНИЯ ДНЯ НЕДЕЛИ ---
      const [day, month, year] = date.split(".").map(Number);
      // Важно: в Date конструкторе месяцы идут с 0 по 11
      const dateObject = new Date(year, month - 1, day);

      // Опции для форматирования дня недели (полное название)
      const options = { weekday: "long" };
      let dayOfWeek = dateObject.toLocaleDateString("ru-RU", options);
      dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

      htmlContent += `
                <li class="schedule-day-block ${todayClass}">
                    <div class="schedule-date">
                        <h3>${dayOfWeek}</h3>
                        <h3>${date} г.</h3>
                    </div>
                    <ul class="schedule-day-list">
            `;

      if (items && items.length > 0) {
        items.forEach((item) => {
          htmlContent += `
                        <li class="schedule-item">
                            <div class="schedule-item-time">${formatTime(item.time)}</div>
                            <div class="schedule-item-subject">${item.subject}</div>
                            <div class="schedule-item-info">
                                <div class="schedule-item-classroom">${item.classroom}</div>
                                <div class="schedule-item-teacher">${item.teacher}</div>
                            </div>
                        </li>
                    `;
        });
      } else {
        htmlContent += `
                    <li class="schedule-item-no-subjects">
                        <p>В этот день нет пар!</p>
                    </li>
                `;
      }

      htmlContent += `
                    </ul>
                </li>
            `;
    });

    listContainer.innerHTML = htmlContent;
  }
};

const formatTime = (timeString) => {
    const timeParts = timeString.replace(/\./g, ":").split("-");
  
    return `
        <span class="schedule-item-time-start">${timeParts[0]}</span>
        <span class="schedule-item-time-end">${timeParts[1]}</span>
      `;
  };
  

// Функция для переключения страниц
const showPage = (pageId) => {
  // Скрываем все страницы
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Показываем нужную страницу
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Управление кнопкой "назад" в Telegram Mini App
  // Проверяем, поддерживается ли BackButton в текущей версии WebApp
  if (parseFloat(Telegram.WebApp.version) >= 6.1) {
    // BackButton was introduced in 6.1
    if (pageId === "page-main") {
      Telegram.WebApp.BackButton.hide();
    } else {
      Telegram.WebApp.BackButton.show();
    }
    // Назначаем обработчик для кнопки "назад" Telegram
    Telegram.WebApp.BackButton.onClick(() => showPage("page-main"));
  }

  // Устанавливаем цвет заголовка Mini App (верхней полосы)
  // Проверяем, поддерживается ли setHeaderColor в текущей версии WebApp
  if (parseFloat(Telegram.WebApp.version) >= 6.1) {
    // setHeaderColor was introduced in 6.1
    Telegram.WebApp.setHeaderColor("secondary_bg_color");
  }

  // Скрываем основную кнопку, если она была показана
  Telegram.WebApp.MainButton.hide();
};

// --- Инициализация приложения при загрузке DOM ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Инициализация Telegram WebApp API
  Telegram.WebApp.ready();
  applyTelegramTheme();
  Telegram.WebApp.onEvent("themeChanged", applyTelegramTheme); // Слушаем изменения темы

  // 2. Изначально показываем главную страницу
  showPage("page-main");

  // 3. Динамически рендерим расписание
  renderSchedule("schedule-list-zis231", scheduleZis231Data);
  renderSchedule("schedule-list-zis232", scheduleZis232Data);

  // 4. Привязываем слушатели кликов на кнопки навигации
  document.querySelectorAll("[data-target-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetPageId = `page-${event.target.dataset.targetPage}`;
      showPage(targetPageId);
    });
  });

  const openPdfButton = document.getElementById("open-pdf-button");
  if (openPdfButton) {
    openPdfButton.addEventListener("click", () => {
      Telegram.WebApp.openLink(pdf);
    });
  }
});
