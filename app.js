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
  
// Текущая активная страница для отслеживания истории
let currentPage = "page-main";

// --- Переменные для Pinch-to-Zoom ---
let currentScale = 1.0;
let lastScale = 1.0;
let startDistance = 0;
let lastX = 0;
let lastY = 0;
let translateX = 0;
let translateY = 0;
let startTranslateX = 0;
let startTranslateY = 0;
let isPinching = false;
let isDragging = false;

const minScale = 0.5;
const maxScale = 4.0;

let pngViewerContainer; // Будет инициализирован при DOMContentLoaded

// Функция для обновления трансформации (масштаб и смещение)
const updateTransform = () => {
    if (pngViewerContainer) {
        pngViewerContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    }
};

// Вычисление расстояния между двумя точками касания
const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

// Обработчик начала касания
const handleTouchStart = (event) => {
    const touches = event.touches;
    if (touches.length === 2) {
        isPinching = true;
        startDistance = getDistance(touches[0], touches[1]);
        lastScale = currentScale; // Запоминаем текущий масштаб
        
        // Отменяем стандартное поведение, чтобы предотвратить прокрутку/зум браузера
        event.preventDefault(); 
    } else if (touches.length === 1 && currentScale > 1.0) { // Только для панорамирования при увеличении
        isDragging = true;
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        event.preventDefault(); // Отменяем стандартное поведение
    }
};

// Обработчик движения касания
const handleTouchMove = (event) => {
    const touches = event.touches;
    if (isPinching && touches.length === 2) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / startDistance;
        let newScale = lastScale * scaleFactor;

        // Ограничиваем масштаб
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        currentScale = newScale;

        // Также попробуем центрировать зум на средней точке между пальцами
        // Это более сложная часть, требующая смещения центра трансформации
        // Для простоты пока просто масштабируем, а панорамирование отдельным движением
        updateTransform();
        event.preventDefault();

    } else if (isDragging && touches.length === 1) {
        const dx = touches[0].clientX - lastX;
        const dy = touches[0].clientY - lastY;
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        updateTransform();
        event.preventDefault();
    }
};

// Обработчик окончания касания
const handleTouchEnd = () => {
    isPinching = false;
    isDragging = false;
    // При отпускании пальцев можно "привязать" изображение к границам, если оно вышло за них
    // (опционально, для более продвинутой реализации)
};


// Функция для загрузки и отображения всех PNG изображений
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; // Очищаем контейнер
        currentScale = 1.0; // Сбрасываем масштаб при каждой новой загрузке
        translateX = 0;
        translateY = 0;
        updateTransform(); // Применяем сброс

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
  // Скрываем все страницы
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.remove("active");
  });

  // Показываем нужную страницу
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Обновляем текущую страницу
  currentPage = pageId;

  // Если переходим на страницу PDF, загружаем все картинки
  if (pageId === 'page-pdf') {
      loadAllPngs(); // Загружаем все PNG изображения
  }

  // Управление историей браузера
  if (pushState) {
    // Добавляем состояние в историю браузера, чтобы работала кнопка "назад"
    history.pushState({ page: pageId }, "", `#${pageId}`);
  }

  // Управление кнопкой "назад" в Telegram Mini App
  // Только если Telegram.WebApp инициализирован
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    if (pageId === "page-main") {
      Telegram.WebApp.BackButton.hide();
    } else {
      Telegram.WebApp.BackButton.show();
      Telegram.WebApp.BackButton.onClick(() => {
        // Имитируем нажатие кнопки "назад" в браузере
        history.back();
      });
    }
    // Скрываем основную кнопку, если она была показана
    Telegram.WebApp.MainButton.hide();
  }
};

// Обработчик события popstate для навигации по истории браузера
window.onpopstate = (event) => {
  if (event.state && event.state.page) {
    showPage(event.state.page, false); // false, чтобы не добавлять новое состояние в историю
  } else {
    // Если состояние пустое (например, при первом заходе на страницу и нажатии назад)
    showPage("page-main", false);
  }
};


// --- Инициализация приложения при загрузке DOM ---
document.addEventListener("DOMContentLoaded", () => {
  // 1. Инициализация Telegram WebApp API (если доступно)
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.ready();
    // Устанавливаем цвет заголовка Mini App (верхней полосы)
    if (parseFloat(Telegram.WebApp.version) >= 6.1) {
      Telegram.WebApp.setHeaderColor("secondary_bg_color");
    }
  }


  // Изначально добавляем главную страницу в историю
  history.replaceState({ page: "page-main" }, "", "#page-main");


  // 2. Изначально показываем главную страницу
  showPage("page-main", false); // false, чтобы не добавлять двойное состояние при загрузке

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
});
