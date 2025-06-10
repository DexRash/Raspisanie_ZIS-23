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

      const [day, month, year] = date.split(".").map(Number);
      const dateObject = new Date(year, month - 1, day);
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
  
// Текущая активная страница для отслеживания истории
let currentPage = "page-main";
let pngViewerContainer; // Объявляем, но не используем для зума

// Функция для применения темы Telegram Web App
const applyTelegramTheme = () => {
    if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
        document.body.className = Telegram.WebApp.colorScheme === 'dark' ? 'telegram-dark' : 'telegram-light';
    }
};

// Функция для загрузки и отображения всех PNG изображений
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; // Очищаем контейнер
        
        if (schedulePngsUrls && schedulePngsUrls.length > 0) {
            schedulePngsUrls.forEach((url, index) => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = `Расписание - Страница ${index + 1}`;
                img.classList.add('schedule-png-image'); // Добавляем класс для стилизации
                pngViewerContainer.appendChild(img);
            });
        } else {
            pngViewerContainer.innerHTML = '<p>Изображения расписания отсутствуют.</p>';
        }
    }
};

// Функция для переключения страниц
const showPage = (pageId, pushState = true) => {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  currentPage = pageId;

  // Если переходим на страницу с PNG, загружаем их
  if (pageId === 'page-pdf') {
      loadAllPngs(); 
  }

  // Обновляем историю браузера для навигации
  if (pushState) {
    history.pushState({ page: pageId }, "", `#${pageId}`);
  }

  // Управление кнопкой "Назад" в Telegram Web App
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    if (pageId === "page-main") {
      Telegram.WebApp.BackButton.hide();
    } else {
      Telegram.WebApp.BackButton.show();
      Telegram.WebApp.BackButton.onClick(() => {
        history.back();
      });
    }
    // Скрываем основную кнопку, если она была показана (на этом приложении она не используется)
    Telegram.WebApp.MainButton.hide();
  }
};

// Обработчик события 'popstate' для навигации по истории браузера (кнопка "Назад" в браузере/Telegram)
window.onpopstate = (event) => {
  if (event.state && event.state.page) {
    showPage(event.state.page, false); // false, чтобы не добавлять новое состояние в историю
  } else {
    showPage("page-main", false);
  }
};


// --- Инициализация приложения при загрузке DOM ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Инициализация Telegram WebApp API
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.ready();
    applyTelegramTheme(); // Применяем начальную тему
    Telegram.WebApp.onEvent("themeChanged", applyTelegramTheme); // Слушаем изменения темы
    if (parseFloat(Telegram.WebApp.version) >= 6.1) {
      Telegram.WebApp.setHeaderColor("secondary_bg_color");
    }
  }

  // Получаем контейнер для PNG изображений
  pngViewerContainer = document.getElementById('png-viewer-container');

  // 2. Устанавливаем начальное состояние истории для главной страницы
  history.replaceState({ page: "page-main" }, "", "#page-main");
  // Изначально показываем главную страницу
  showPage("page-main", false); // false, чтобы не добавлять двойное состояние при загрузке

  // 3. Динамически рендерим расписание для групп
  renderSchedule("schedule-list-zis231", scheduleZis231Data);
  renderSchedule("schedule-list-zis232", scheduleZis232Data);

  // 4. Привязываем слушатели кликов на кнопки навигации
  document.querySelectorAll("[data-target-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetPageId = `page-${event.target.dataset.targetPage}`;
      showPage(targetPageId);
    });
  });
});
