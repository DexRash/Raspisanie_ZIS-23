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

// --- Переменные для Pinch-to-Zoom ---
let currentScale = 1.0;
let lastScale = 1.0;
let startDistance = 0; // Для pinch-to-zoom
let lastX = 0; // Для панорамирования
let lastY = 0; // Для панорамирования
let translateX = 0; // Текущее смещение по X
let translateY = 0; // Текущее смещение по Y
let startTranslateX = 0; // Начальное смещение при начале панорамирования
let startTranslateY = 0; // Начальное смещение при начале панорамирования
let isPinching = false;
let isDragging = false;
let isSingleTouch = false; // Флаг для определения одиночного касания
let originalImageWidth = 0; // Ширина первого изображения (предполагаем, что все одинаковые)
let originalImageHeight = 0; // Высота первого изображения (предполагаем, что все одинаковые)
let contentTotalHeight = 0; // Общая высота всех изображений (с отступами)

let pngViewerContainer; // Будет инициализирован при DOMContentLoaded

// Функция для обновления трансформации (масштаб и смещение)
const updateTransform = () => {
    if (pngViewerContainer) {
        // Ограничиваем смещение, чтобы изображение не уходило за границы
        const scaledContentWidth = pngViewerContainer.scrollWidth * currentScale;
        const scaledContentHeight = contentTotalHeight * currentScale; // Общая высота масштабированного контента
        
        const containerWidth = pngViewerContainer.clientWidth;
        const containerHeight = pngViewerContainer.clientHeight; // Высота видимой части контейнера

        // Горизонтальные ограничения
        let maxX = Math.max(0, scaledContentWidth - containerWidth);
        let minX = -maxX;
        if (scaledContentWidth < containerWidth) { // Если содержимое меньше контейнера, центрируем
            minX = maxX = (containerWidth - scaledContentWidth) / 2;
        }

        // Вертикальные ограничения
        let maxY = Math.max(0, scaledContentHeight - containerHeight);
        let minY = -maxY;
        if (scaledContentHeight < containerHeight) { // Если содержимое меньше контейнера, центрируем
            minY = maxY = (containerHeight - scaledContentHeight) / 2;
        }
        
        translateX = Math.max(minX, Math.min(maxX, translateX));
        translateY = Math.max(minY, Math.min(maxY, translateY));

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
        
        // Получаем начальные координаты центра между пальцами
        lastX = (touches[0].clientX + touches[1].clientX) / 2;
        lastY = (touches[0].clientY + touches[1].clientY) / 2;

        startTranslateX = translateX;
        startTranslateY = translateY;
        
        event.preventDefault(); // Отменяем стандартное поведение, чтобы предотвратить прокрутку/зум браузера
    } else if (touches.length === 1 && currentScale > 1.0) { // Только для панорамирования при увеличении
        isDragging = true;
        isSingleTouch = true; // Флаг для одного касания
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
        const minScale = pngViewerContainer.clientWidth / originalImageWidth; // 100% ширины контейнера
        const maxScale = 1.0; // Оригинальный размер изображения (1.0 относительно его naturalWidth)
        
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        // Вычисляем изменение смещения относительно центра зума
        const currentMidX = (touches[0].clientX + touches[1].clientX) / 2;
        const currentMidY = (touches[0].clientY + touches[1].clientY) / 2;

        // Смещение относительно точки трансформации (верхний левый угол контейнера)
        const dx = currentMidX - lastX;
        const dy = currentMidY - lastY;
        
        // Корректируем translateX и translateY так, чтобы зум был относительно центра касания
        // Это более сложная часть, которая позволяет "прилипать" к точке зума
        // Простой вариант:
        // translateX = startTranslateX + dx;
        // translateY = startTranslateY + dy;

        // Более продвинутый вариант, чтобы зум был по центру пальцев:
        const oldScale = currentScale;
        currentScale = newScale;

        // Определяем точку зума относительно контейнера
        const containerRect = pngViewerContainer.getBoundingClientRect();
        const zoomPointX = (lastX - containerRect.left - translateX) / oldScale;
        const zoomPointY = (lastY - containerRect.top - translateY) / oldScale;

        translateX += dx - (zoomPointX * (currentScale - oldScale));
        translateY += dy - (zoomPointY * (currentScale - oldScale));
        
        lastX = currentMidX;
        lastY = currentMidY;

        updateTransform();
        event.preventDefault();

    } else if (isDragging && touches.length === 1 && isSingleTouch) {
        const dx = touches[0].clientX - lastX;
        const dy = touches[0].clientY - lastY;
        translateX += dx;
        translateY += dy;
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
        updateTransform();
        event.preventDefault();
    }
};

// Обработчик окончания касания
const handleTouchEnd = (event) => {
    if (event.touches.length === 0) { // Если нет пальцев на экране
        isPinching = false;
        isDragging = false;
        isSingleTouch = false;
        // После окончания движения, можно снова вызвать updateTransform
        // чтобы "прижать" изображение к границам, если оно вышло за них
        updateTransform(); 
    }
};


// Функция для загрузки и отображения всех PNG изображений
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; // Очищаем контейнер
        currentScale = 1.0; // Сбрасываем масштаб при каждой новой загрузке
        translateX = 0;
        translateY = 0;
        
        originalImageWidth = 0; // Сбрасываем размеры
        originalImageHeight = 0;
        contentTotalHeight = 0; // Общая высота контента
        
        if (schedulePngsUrls && schedulePngsUrls.length > 0) {
            let loadedImagesCount = 0;
            const images = [];

            schedulePngsUrls.forEach((url, index) => {
                const img = new Image(); // Используем new Image() для предзагрузки
                img.src = url;
                img.alt = `Расписание - Страница ${index + 1}`;
                img.classList.add('schedule-png-image'); // Добавляем класс для стилизации
                
                img.onload = () => {
                    loadedImagesCount++;
                    // Для определения maxScale берем размер первой картинки,
                    // предполагая, что все картинки имеют одинаковое разрешение.
                    if (index === 0) {
                        originalImageWidth = img.naturalWidth;
                        originalImageHeight = img.naturalHeight;
                    }
                    
                    // Добавляем к общей высоте, учитывая margin-bottom
                    contentTotalHeight += img.offsetHeight + 10; // 10px - margin-bottom
                    
                    // После загрузки всех изображений, инициализируем зум
                    if (loadedImagesCount === schedulePngsUrls.length) {
                        // Убираем лишний margin-bottom для последнего изображения
                        if (images.length > 0) {
                            images[images.length - 1].style.marginBottom = '0';
                        }
                        // Инициализируем начальный масштаб
                        // minScale должен быть таким, чтобы изображение вписалось по ширине
                        currentScale = pngViewerContainer.clientWidth / originalImageWidth;
                        if (currentScale > 1.0) currentScale = 1.0; // Не увеличиваем сверх 100% при инициализации
                        
                        updateTransform(); // Применяем начальный масштаб
                    }
                };
                img.onerror = () => {
                    console.error(`Ошибка загрузки изображения: ${url}`);
                    // Можно добавить заглушку или сообщение об ошибке
                    loadedImagesCount++;
                    if (loadedImagesCount === schedulePngsUrls.length) {
                         // Если все загружены (или ошиблись), все равно пробуем обновить трансформ
                         currentScale = pngViewerContainer.clientWidth / originalImageWidth;
                         if (currentScale > 1.0) currentScale = 1.0;
                         updateTransform();
                    }
                };
                images.push(img); // Добавляем в массив для дальнейшего использования
                pngViewerContainer.appendChild(img); // Добавляем в DOM сразу
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

  if (pageId === 'page-pdf') {
      loadAllPngs(); 
  }

  if (pushState) {
    history.pushState({ page: pageId }, "", `#${pageId}`);
  }

  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    if (pageId === "page-main") {
      Telegram.WebApp.BackButton.hide();
    } else {
      Telegram.WebApp.BackButton.show();
      Telegram.WebApp.BackButton.onClick(() => {
        history.back();
      });
    }
    Telegram.WebApp.MainButton.hide();
  }
};

window.onpopstate = (event) => {
  if (event.state && event.state.page) {
    showPage(event.state.page, false);
  } else {
    showPage("page-main", false);
  }
};


document.addEventListener("DOMContentLoaded", () => {
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.ready();
    if (parseFloat(Telegram.WebApp.version) >= 6.1) {
      Telegram.WebApp.setHeaderColor("secondary_bg_color");
    }
  }

  pngViewerContainer = document.getElementById('png-viewer-container');
  if (pngViewerContainer) {
    pngViewerContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    pngViewerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    pngViewerContainer.addEventListener('touchend', handleTouchEnd);
    pngViewerContainer.addEventListener('touchcancel', handleTouchEnd); 
  }

  history.replaceState({ page: "page-main" }, "", "#page-main");
  showPage("page-main", false);
  renderSchedule("schedule-list-zis231", scheduleZis231Data);
  renderSchedule("schedule-list-zis232", scheduleZis232Data);

  document.querySelectorAll("[data-target-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetPageId = `page-${event.target.dataset.targetPage}`;
      showPage(targetPageId);
    });
  });

  // Добавляем обработчик изменения размера окна, чтобы пересчитывать масштаб
  window.addEventListener('resize', () => {
      if (currentPage === 'page-pdf' && pngViewerContainer.children.length > 0) {
          // При изменении размера окна, пересчитываем minScale и применяем его
          // Убедимся, что originalImageWidth уже определен
          if (originalImageWidth > 0) {
              currentScale = pngViewerContainer.clientWidth / originalImageWidth;
              if (currentScale > 1.0) currentScale = 1.0;
              translateX = 0; // Сбрасываем позицию при ресайзе
              translateY = 0;
              updateTransform();
          }
      }
  });
});
