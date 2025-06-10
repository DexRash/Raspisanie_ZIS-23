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

// --- Переменные для Pinch-to-Zoom (мобильная версия) ---
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

// --- Добавленная функция для определения мобильного устройства ---
const isMobileDevice = () => {
    return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('Mobi') !== -1);
};


// Функция для обновления трансформации (масштаб и смещение)
const updateTransform = () => {
    if (pngViewerContainer) {
        // На десктопе, всегда показываем 100% ширины, без зума и панорамирования
        if (!isMobileDevice()) {
            pngViewerContainer.style.transform = `translate(0px, 0px) scale(1.0)`;
            pngViewerContainer.style.overflow = 'auto'; // Включаем скролл на десктопе
            pngViewerContainer.style.touchAction = 'auto'; // Возвращаем системный touch-action
            return; // Завершаем функцию, если это десктоп
        }

        // Логика для мобильных устройств (зум и панорамирование)
        pngViewerContainer.style.overflow = 'hidden'; // Скрываем скролл на мобиле
        pngViewerContainer.style.touchAction = 'none'; // Отключаем системный touch-action
        
        const scaledContentWidth = pngViewerContainer.scrollWidth * currentScale;
        const scaledContentHeight = contentTotalHeight * currentScale; 
        
        const containerWidth = pngViewerContainer.clientWidth;
        const containerHeight = pngViewerContainer.clientHeight; 

        // Горизонтальные ограничения
        let maxX = Math.max(0, scaledContentWidth - containerWidth);
        let minX = -maxX;
        if (scaledContentWidth < containerWidth) { 
            minX = maxX = (containerWidth - scaledContentWidth) / 2;
        }

        // Вертикальные ограничения
        let maxY = Math.max(0, scaledContentHeight - containerHeight);
        let minY = -maxY;
        if (scaledContentHeight < containerHeight) { 
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
    if (!isMobileDevice()) return; // Только для мобильных устройств

    const touches = event.touches;
    
    if (touches.length === 2) {
        isPinching = true;
        startDistance = getDistance(touches[0], touches[1]);
        lastScale = currentScale; 
        
        lastX = (touches[0].clientX + touches[1].clientX) / 2;
        lastY = (touches[0].clientY + touches[1].clientY) / 2;

        startTranslateX = translateX;
        startTranslateY = translateY;
        
        event.preventDefault(); 
    } else if (touches.length === 1 && currentScale > pngViewerContainer.clientWidth / originalImageWidth) { // Только для панорамирования при увеличении
        isDragging = true;
        isSingleTouch = true; 
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        event.preventDefault(); 
    }
};

// Обработчик движения касания
const handleTouchMove = (event) => {
    if (!isMobileDevice()) return; // Только для мобильных устройств

    const touches = event.touches;
    if (isPinching && touches.length === 2) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / startDistance;
        let newScale = lastScale * scaleFactor;

        // Ограничиваем масштаб
        const minScale = pngViewerContainer.clientWidth / originalImageWidth; 
        const maxScale = 1.0; // Оригинальный размер изображения
        
        newScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        const currentMidX = (touches[0].clientX + touches[1].clientX) / 2;
        const currentMidY = (touches[0].clientY + touches[1].clientY) / 2;

        const oldScale = currentScale;
        currentScale = newScale;

        const containerRect = pngViewerContainer.getBoundingClientRect();
        const zoomPointX = (lastX - containerRect.left - translateX) / oldScale;
        const zoomPointY = (lastY - containerRect.top - translateY) / oldScale;

        translateX += (currentMidX - lastX) - (zoomPointX * (currentScale - oldScale));
        translateY += (currentMidY - lastY) - (zoomPointY * (currentScale - oldScale));
        
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
    if (!isMobileDevice()) return; // Только для мобильных устройств

    if (event.touches.length === 0) { 
        isPinching = false;
        isDragging = false;
        isSingleTouch = false;
        updateTransform(); 
    }
};


// Функция для загрузки и отображения всех PNG изображений
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; 
        
        // Сбрасываем масштаб и позицию только для мобильных
        if (isMobileDevice()) {
            currentScale = 1.0; 
            translateX = 0;
            translateY = 0;
        } else {
            // На десктопе всегда сбрасываем, но не применяем transform,
            // т.к. updateTransform для десктопа уже игнорирует transform
            currentScale = 1.0;
            translateX = 0;
            translateY = 0;
        }
        
        originalImageWidth = 0; 
        originalImageHeight = 0;
        contentTotalHeight = 0; 
        
        if (schedulePngsUrls && schedulePngsUrls.length > 0) {
            let loadedImagesCount = 0;
            const images = [];

            schedulePngsUrls.forEach((url, index) => {
                const img = new Image(); 
                img.src = url;
                img.alt = `Расписание - Страница ${index + 1}`;
                img.classList.add('schedule-png-image'); 
                
                img.onload = () => {
                    loadedImagesCount++;
                    
                    if (index === 0) {
                        originalImageWidth = img.naturalWidth;
                        originalImageHeight = img.naturalHeight;
                    }
                    
                    // Для всех изображений, включая те, что уже в DOM
                    contentTotalHeight = Array.from(pngViewerContainer.children).reduce((sum, el) => {
                        return sum + el.offsetHeight + (el.nextElementSibling ? 10 : 0); // 10px - margin-bottom
                    }, 0);

                    if (loadedImagesCount === schedulePngsUrls.length) {
                        // Убираем лишний margin-bottom для последнего изображения
                        if (images.length > 0) {
                            images[images.length - 1].style.marginBottom = '0';
                        }
                        
                        // Инициализируем начальный масштаб только для мобильных
                        if (isMobileDevice()) {
                            currentScale = pngViewerContainer.clientWidth / originalImageWidth;
                            if (currentScale > 1.0) currentScale = 1.0; 
                        } else {
                            // На десктопе scale всегда 1.0 (CSS handles initial fit)
                            currentScale = 1.0; 
                        }
                        
                        updateTransform(); 
                    }
                };
                img.onerror = () => {
                    console.error(`Ошибка загрузки изображения: ${url}`);
                    loadedImagesCount++;
                    if (loadedImagesCount === schedulePngsUrls.length) {
                        if (isMobileDevice()) {
                            currentScale = pngViewerContainer.clientWidth / originalImageWidth;
                            if (currentScale > 1.0) currentScale = 1.0;
                        } else {
                            currentScale = 1.0;
                        }
                        updateTransform();
                    }
                };
                images.push(img); 
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
    // Прикрепляем/открепляем слушатели только для мобильных устройств
    if (isMobileDevice()) {
        pngViewerContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        pngViewerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        pngViewerContainer.addEventListener('touchend', handleTouchEnd);
        pngViewerContainer.addEventListener('touchcancel', handleTouchEnd); 
    } else {
        // Для десктопа убираем touch-action: none и overflow: hidden, чтобы браузер мог скроллить и зумить нативно
        pngViewerContainer.style.touchAction = 'auto';
        pngViewerContainer.style.overflow = 'auto';
    }
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

  window.addEventListener('resize', () => {
      if (currentPage === 'page-pdf' && pngViewerContainer.children.length > 0) {
          // При изменении размера окна, пересчитываем minScale и применяем его
          if (originalImageWidth > 0) {
              if (isMobileDevice()) {
                  currentScale = pngViewerContainer.clientWidth / originalImageWidth;
                  if (currentScale > 1.0) currentScale = 1.0;
                  translateX = 0; 
                  translateY = 0;
              } else {
                  // На десктопе всегда сбрасываем до 1.0 и 0 смещений
                  currentScale = 1.0;
                  translateX = 0;
                  translateY = 0;
              }
              updateTransform();
          }
      }
  });
});
