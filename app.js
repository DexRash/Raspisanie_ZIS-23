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

// Fixed min/max scale values
const MIN_SCALE = 1.0; // Can't zoom out smaller than 100%
const MAX_SCALE = 3.0; // Max zoom level (e.g., 3x original size, adjust as needed)

let pngViewerContainer;

// Function to update transformation (scale and translate)
const updateTransform = () => {
    if (pngViewerContainer) {
        const containerWidth = pngViewerContainer.clientWidth;
        const containerHeight = pngViewerContainer.clientHeight;
        
        // Get the actual scrollable width and height of the content before scaling
        // offsetWidth/offsetHeight includes padding and border
        const contentWidth = pngViewerContainer.scrollWidth;
        const contentHeight = pngViewerContainer.scrollHeight;

        const scaledContentWidth = contentWidth * currentScale;
        const scaledContentHeight = contentHeight * currentScale;

        // Calculate boundaries for translation (panning)
        let maxX = Math.max(0, scaledContentWidth - containerWidth) / 2;
        let minX = -maxX;
        // If scaled content is smaller than container, center it
        if (scaledContentWidth < containerWidth) {
            translateX = (containerWidth - scaledContentWidth) / 2;
        } else {
            translateX = Math.max(-maxX, Math.min(maxX, translateX));
        }

        let maxY = Math.max(0, scaledContentHeight - containerHeight) / 2;
        let minY = -maxY;
        // If scaled content is smaller than container, center it
        if (scaledContentHeight < containerHeight) {
            translateY = (containerHeight - scaledContentHeight) / 2;
        } else {
            translateY = Math.max(-maxY, Math.min(maxY, translateY));
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

// Touch start handler
const handleTouchStart = (event) => {
    const touches = event.touches;
    
    if (touches.length === 2) {
        isPinching = true;
        startDistance = getDistance(touches[0], touches[1]);
        lastScale = currentScale;
        
        // Get initial mid-point for zoom origin
        lastX = (touches[0].clientX + touches[1].clientX) / 2;
        lastY = (touches[0].clientY + touches[1].clientY) / 2;

        startTranslateX = translateX;
        startTranslateY = translateY;
        
        event.preventDefault(); // Prevent default browser zoom/scroll
    } else if (touches.length === 1 && currentScale > MIN_SCALE) { // Only allow dragging if zoomed in
        isDragging = true;
        isSingleTouch = true;
        lastX = touches[0].clientX;
        lastY = touches[0].clientY;
        startTranslateX = translateX;
        startTranslateY = translateY;
        event.preventDefault(); // Prevent default browser scroll
    }
};

// Touch move handler
const handleTouchMove = (event) => {
    const touches = event.touches;
    if (isPinching && touches.length === 2) {
        const currentDistance = getDistance(touches[0], touches[1]);
        const scaleFactor = currentDistance / startDistance;
        let newScale = lastScale * scaleFactor;

        // Apply scale limits
        newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
        
        // Calculate new translation to keep the zoom origin centered
        const containerRect = pngViewerContainer.getBoundingClientRect();
        const zoomPointX = (lastX - containerRect.left - startTranslateX) / lastScale;
        const zoomPointY = (lastY - containerRect.top - startTranslateY) / lastScale;

        translateX = startTranslateX + (lastX - (touches[0].clientX + touches[1].clientX) / 2) - (zoomPointX * (newScale - lastScale));
        translateY = startTranslateY + (lastY - (touches[0].clientY + touches[1].clientY) / 2) - (zoomPointY * (newScale - lastScale));
        
        currentScale = newScale;
        updateTransform();
        event.preventDefault();

    } else if (isDragging && touches.length === 1 && isSingleTouch) {
        const dx = touches[0].clientX - lastX;
        const dy = touches[0].clientY - lastY;
        
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


// Function to load and display all PNG images
const loadAllPngs = () => {
    if (pngViewerContainer) {
        pngViewerContainer.innerHTML = ''; // Clear container
        currentScale = MIN_SCALE; // Reset scale to minimum (100% width)
        translateX = 0;
        translateY = 0;
        
        // Use a Promise.all to ensure all images are loaded before calculating initial scale
        const imageLoadPromises = schedulePngsUrls.map((url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.alt = `Расписание - Страница`; // Removed index for generic alt
                img.classList.add('schedule-png-image');
                img.onload = () => {
                    pngViewerContainer.appendChild(img); // Append after load to get correct dimensions
                    resolve();
                };
                img.onerror = () => {
                    console.error(`Ошибка загрузки изображения: ${url}`);
                    // Optionally append a placeholder or error message
                    const errorDiv = document.createElement('div');
                    errorDiv.textContent = `Не удалось загрузить изображение: ${url}`;
                    errorDiv.style.color = 'red';
                    pngViewerContainer.appendChild(errorDiv);
                    resolve(); // Resolve even on error to not block Promise.all
                };
            });
        });

        Promise.all(imageLoadPromises).then(() => {
            // After all images are appended and rendered, calculate initial scale
            // The initial scale will fit the images to the container width,
            // which is effectively `MIN_SCALE` (1.0).
            // No need to explicitly calculate `minScale` based on `originalImageWidth` here
            // because `max-width: 100%` in CSS already handles initial fitting.
            // We just ensure currentScale starts at MIN_SCALE.
            updateTransform(); // Apply initial transform
        }).catch((error) => {
            console.error("Ошибка при загрузке всех изображений:", error);
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

  // Removed resize listener, as the scale limits are now fixed.
  // The initial `max-width: 100%` will handle initial fitting.
});
