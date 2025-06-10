// Function for rendering schedule (unchanged)
const renderSchedule = (containerId, scheduleData) => {
  const listContainer = document.getElementById(containerId);
  if (listContainer) {
    const groupedSchedule = scheduleData.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = [];
      }
      if (item.subject) {
        acc[item.date].push(item);
      }
      return acc;
    }, {});

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
  
let currentPage = "page-main";

// --- Pinch-to-Zoom variables ---
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
let isSingleTouch = false;

// Dynamic min/max scale values will be calculated in loadAllPngs
let calculatedMinScale = 1.0; 
const FIXED_MAX_ZOOM_MULTIPLIER = 3.0; // Например, можно увеличить до 3-х раз от начального размера

let pngViewerContainer;

// Function to update transformation (scale and translate)
const updateTransform = () => {
    if (pngViewerContainer) {
        const containerWidth = pngViewerContainer.clientWidth;
        const containerHeight = pngViewerContainer.clientHeight;
        
        // Get the actual scrollable width and height of the content before scaling
        const contentWidth = pngViewerContainer.scrollWidth;
        const contentHeight = pngViewerContainer.scrollHeight;

        const scaledContentWidth = contentWidth * currentScale;
        const scaledContentHeight = contentHeight * currentScale;

        // Calculate actual boundaries for translation (panning)
        // This calculates how much extra space there is *beyond* the container on each side
        let maxTranslateX = Math.max(0, (scaledContentWidth - containerWidth) / 2);
        let maxTranslateY = Math.max(0, (scaledContentHeight - containerHeight) / 2);

        // Apply limits for translateX and translateY
        // If content is smaller than container, center it
        if (scaledContentWidth <= containerWidth) {
            translateX = (containerWidth - scaledContentWidth) / 2;
        } else {
            translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
        }

        if (scaledContentHeight <= containerHeight) {
            translateY = (containerHeight - scaledContentHeight) / 2;
        } else {
            translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
        }

        // Apply transformation
        pngViewerContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
    }
};


// Calculate distance between two touch points
const getDistance = (touch1, touch2) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
};

// Touch start handler (unchanged logic)
const handleTouchStart = (event) => {
    const touches = event.touches;
    
    if (touches.length === 2) {
        isPinching = true;
        startDistance = getDistance(touches[0], touches[1]);
        lastScale = currentScale;
        
        // Save touch points for pinch origin
        lastX = (touches[0].clientX + touches[1].clientX) / 2;
        lastY = (touches[0].clientY + touches[1].clientY) / 2;

        startTranslateX = translateX;
        startTranslateY = translateY;
        
        event.preventDefault(); 
    } else if (touches.length === 1 && currentScale > calculatedMinScale - 0.01) { // Allow dragging slightly below minScale to ensure movement
        isDragging = true;
        isSingleTouch = true;
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        event.preventDefault(); 
    }
};

// Touch move handler (CRUCIAL CHANGES HERE)
const handleTouchMove = (event) => {
    const touches = event.touches;
    if (isPinching && touches.length === 2) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / startDistance;
        let newScale = lastScale * scaleFactor;

        // Apply scale limits using dynamically calculated minScale
        const maxScale = calculatedMinScale * FIXED_MAX_ZOOM_MULTIPLIER;
        newScale = Math.max(calculatedMinScale, Math.min(maxScale, newScale));
        
        // Calculate new translation to keep the zoom origin centered
        const containerRect = pngViewerContainer.getBoundingClientRect();
        
        // Get the current mid-point of the touches relative to the viewport
        const currentMidX = (touches[0].clientX + touches[1].clientX) / 2;
        const currentMidY = (touches[0].clientY + touches[1].clientY) / 2;

        // Calculate the relative position of the zoom origin within the container,
        // considering the *current* scale and translation.
        // This is the point on the *unscaled* content that we want to keep under our fingers.
        const originX = (lastX - containerRect.left - startTranslateX) / lastScale;
        const originY = (lastY - containerRect.top - startTranslateY) / lastScale;

        // Calculate the new translation so that the origin point remains under the new mid-point of fingers
        translateX = currentMidX - containerRect.left - (originX * newScale);
        translateY = currentMidY - containerRect.top - (originY * newScale);
        
        currentScale = newScale; 
        updateTransform();
        event.preventDefault();

    } else if (isDragging && touches.length === 1 && isSingleTouch) {
        const dx = touches[0].clientX - lastX;
        const dy = touches[0].clientY - lastY;
        
        // Just directly update translateX/Y, updateTransform will handle limits
        translateX = startTranslateX + dx;
        translateY = startTranslateY + dy;
        
        updateTransform();
        event.preventDefault();
    }
};

// Touch end handler
const handleTouchEnd = (event) => {
    if (event.touches.length === 0) {
        isPinching = false;
        isDragging = false;
        isSingleTouch = false;
        updateTransform(); // Re-apply boundaries after zoom/pan ends
    }
};


// Function to load and display all PNG images (unchanged logic, minor variable change)
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; 
        currentScale = 1.0; // Reset scale for initial loading
        translateX = 0;
        translateY = 0;
        
        const imageLoadPromises = schedulePngsUrls.map((url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.alt = `Расписание - Страница`; 
                img.classList.add('schedule-png-image');
                
                img.onload = () => {
                    pngViewerContainer.appendChild(img); 
                    resolve(img); 
                };
                img.onerror = () => {
                    console.error(`Ошибка загрузки изображения: ${url}`);
                    const errorDiv = document.createElement('div');
                    errorDiv.textContent = `Не удалось загрузить изображение: ${url}`;
                    errorDiv.style.color = 'red';
                    pngViewerContainer.appendChild(errorDiv);
                    resolve(null); 
                };
            });
        });

        Promise.all(imageLoadPromises).then((images) => {
            let widestRenderedWidth = 0;
            images.forEach(img => {
                if (img && img.offsetWidth > widestRenderedWidth) {
                    widestRenderedWidth = img.offsetWidth;
                }
            });
            
            if (widestRenderedWidth > 0) {
                // The calculatedMinScale is the ratio of the container's width to the widest image's *rendered* width.
                // This ensures that when currentScale = calculatedMinScale, the widest image fits the container.
                calculatedMinScale = pngViewerContainer.clientWidth / widestRenderedWidth;
                
                // If calculatedMinScale is less than 1.0 (meaning image was shrunk to fit), it's fine.
                // If calculatedMinScale is greater than 1.0 (meaning container is wider than natural image size, and image is at natural size),
                // then we cap it at 1.0, because we don't want to initially *stretch* the image.
                if (calculatedMinScale > 1.0) {
                     calculatedMinScale = 1.0;
                }
            } else {
                calculatedMinScale = 1.0; 
            }

            currentScale = calculatedMinScale; 
            updateTransform(); 
        }).catch((error) => {
            console.error("Ошибка при загрузке всех изображений:", error);
            calculatedMinScale = 1.0; 
            currentScale = calculatedMinScale;
            updateTransform();
        });

    }
};


// Function to switch pages (unchanged, except loadAllPngs call)
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

// Popstate handler (unchanged)
window.onpopstate = (event) => {
  if (event.state && event.state.page) {
    showPage(event.state.page, false);
  } else {
    showPage("page-main", false);
  }
};


// DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", () => {
  if (typeof Telegram !== 'undefined' && Telegram.WebApp) {
    Telegram.WebApp.ready();
    if (parseFloat(Telegram.WebApp.version) >= 6.1) {
      Telegram.WebApp.setHeaderColor("secondary_bg_color");
    }
    // Здесь отсутствовал applyTelegramTheme(); и Telegram.WebApp.onEvent("themeChanged", applyTelegramTheme);
    // если они были в исходном коде, их нужно вернуть.
    // Я верну только то, что влияет на кнопки и зум.
  }

  pngViewerContainer = document.getElementById('png-viewer-container');
  if (pngViewerContainer) {
    // Touch event listeners for mobile (unchanged)
    pngViewerContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    pngViewerContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    pngViewerContainer.addEventListener('touchend', handleTouchEnd);
    pngViewerContainer.addEventListener('touchcancel', handleTouchEnd); 

    // DOUBLE CLICK FOR DESKTOP
    pngViewerContainer.addEventListener('dblclick', (event) => {
        // Only apply if not currently pinching (avoids conflicts on touch screens that might also send dblclick)
        // Check for event.touches ensures it's likely a non-touch device or no active touch
        if (event.touches && event.touches.length > 0) {
            return; 
        }

        const containerRect = pngViewerContainer.getBoundingClientRect();
        
        // Calculate click position relative to the container's content (unscaled)
        const clickX = (event.clientX - containerRect.left - translateX) / currentScale;
        const clickY = (event.clientY - containerRect.top - translateY) / currentScale;

        if (currentScale.toFixed(2) === calculatedMinScale.toFixed(2) || currentScale < calculatedMinScale) { // Добавлено сравнение currentScale < calculatedMinScale
            // If currently at min scale, zoom to max
            currentScale = calculatedMinScale * FIXED_MAX_ZOOM_MULTIPLIER;
        } else {
            // If already zoomed in, zoom out to min
            currentScale = calculatedMinScale;
        }

        // Adjust translateX/Y to keep the clicked point under the mouse
        translateX = event.clientX - containerRect.left - (clickX * currentScale);
        translateY = event.clientY - containerRect.top - (clickY * currentScale);

        updateTransform();
    });
  }

  // Set initial state for history
  history.replaceState({ page: "page-main" }, "", "#page-main");
  // Show initial page
  showPage("page-main", false); // false, чтобы не добавлять двойное состояние при загрузке

  renderSchedule("schedule-list-zis231", scheduleZis231Data);
  renderSchedule("schedule-list-zis232", scheduleZis232Data);

  // ВОТ ЭТОТ БЛОК БЫЛ УДАЛЕН ИЛИ НЕ ВОССТАНОВЛЕН ПОЛНОСТЬЮ!
  document.querySelectorAll("[data-target-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
      const targetPageId = `page-${event.target.dataset.targetPage}`;
      showPage(targetPageId);
    });
  });
  
  // No resize listener here, as the scale limits are now dynamic based on content fitting
  // and the container width at load time. If the container changes width AFTER loading,
  // the minScale won't re-adjust, but the user can still zoom.
  // For simplicity, we assume the container width is stable after initial load.
});
