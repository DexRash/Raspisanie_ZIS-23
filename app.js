document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;

    const viewerState = {
        isOpen: false,
        scale: 1,
        isDragging: false,
        isPinching: false,
        startX: 0,
        startY: 0,
        translateX: 0,
        translateY: 0,
        initialPinchDistance: null,
    };

    const modal = document.getElementById("image-viewer-modal");
    const modalImg = document.getElementById("image-viewer-content");
    let currentPage = "page-main";

    function applyTelegramTheme() {
        document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
        document.body.style.color = tg.themeParams.text_color || '#000000';
        
        const style = document.documentElement.style;
        style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
        style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
        style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
        style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#0000ff');
        style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#0088cc');
        style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
        style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color || '#f0f0f0');
    }

    function showPage(pageId, pushState = true) {
        document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        currentPage = pageId;

        if (pushState) {
            history.pushState({ page: pageId }, "", `#${pageId}`);
        }

        if (pageId === "page-main") {
            tg.BackButton.hide();
        } else {
            tg.BackButton.show();
        }
    }

    function renderSchedule(containerId, scheduleData) {
        const listContainer = document.getElementById(containerId);
        if (!listContainer) return;

        const groupedSchedule = scheduleData.reduce((acc, item) => {
            (acc[item.date] = acc[item.date] || []).push(item);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedSchedule).sort((a, b) => new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-')));
        
        const today = new Date();
        const todayString = `${String(today.getDate()).padStart(2, "0")}.${String(today.getMonth() + 1).padStart(2, "0")}.${today.getFullYear()}`;

        let htmlContent = "";
        sortedDates.forEach(date => {
            const isToday = date === todayString;
            const items = groupedSchedule[date];
            const dateObject = new Date(date.split('.').reverse().join('-'));
            let dayOfWeek = dateObject.toLocaleDateString("ru-RU", { weekday: "long" });
            dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);

            htmlContent += `<li class="schedule-day-block ${isToday ? "schedule-day-today" : ""}">
                <div class="schedule-date"><h3>${dayOfWeek}</h3><h3>${date} г.</h3></div>
                <ul class="schedule-day-list">`;

            if (items.some(item => item.subject)) {
                items.forEach(item => {
                    if (!item.subject) return;
                    htmlContent += `
                        <li class="schedule-item">
                            <div class="schedule-item-time">${item.time.replace(/-/g, '<br>')}</div>
                            <div class="schedule-item-details">
                                <div class="schedule-item-subject">${item.subject}</div>
                                <div class="schedule-item-info">${item.classroom} &bull; ${item.teacher}</div>
                            </div>
                        </li>`;
                });
            } else {
                htmlContent += `<li class="schedule-item-no-subjects"><p>В этот день нет пар!</p></li>`;
            }
            htmlContent += `</ul></li>`;
        });
        listContainer.innerHTML = htmlContent;
    }

    function loadPngList() {
        const container = document.getElementById("png-list-container");
        if (!container) return;
        container.innerHTML = "";
        schedulePngsUrls.forEach((url, index) => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = `Расписание - Страница ${index + 1}`;
            img.classList.add('png-list-item');
            img.addEventListener('click', () => openImageViewer(url));
            container.appendChild(img);
        });
    }

    function openImageViewer(imageUrl) {
        viewerState.isOpen = true;
        modalImg.src = imageUrl;
        modal.style.display = "flex";
        tg.BackButton.hide();
    }

    function closeImageViewer() {
        modal.style.display = "none";
        viewerState.isOpen = false;
        resetImageViewerState();
        if (currentPage !== 'page-main') {
            tg.BackButton.show();
        }
    }

    function resetImageViewerState() {
        viewerState.scale = 1;
        viewerState.translateX = 0;
        viewerState.translateY = 0;
        viewerState.isDragging = false;
        viewerState.isPinching = false;
        viewerState.initialPinchDistance = null;
        applyTransform();
        modalImg.classList.remove('zoomed');
    }
    
    function applyTransform() {
        modalImg.style.transform = `translate(${viewerState.translateX}px, ${viewerState.translateY}px) scale(${viewerState.scale})`;
    }
    
    function getDistance(touches) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }
    
    // --- Event Handlers ---

    function onPointerDown(e) {
        if (!viewerState.isOpen || viewerState.isPinching) return;
        
        if (viewerState.scale > 1) {
            e.preventDefault();
            viewerState.isDragging = true;
            viewerState.startX = e.clientX - viewerState.translateX;
            viewerState.startY = e.clientY - viewerState.translateY;
            modalImg.classList.add('zoomed');
        }
    }

    function onPointerMove(e) {
        if (viewerState.isDragging && !viewerState.isPinching) {
            e.preventDefault();
            viewerState.translateX = e.clientX - viewerState.startX;
            viewerState.translateY = e.clientY - viewerState.startY;
            applyTransform();
        }
    }

    function onPointerUp(e) {
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
            
            const newScale = Math.max(1, Math.min(viewerState.scale * scaleFactor, 5));
            
            viewerState.scale = newScale;
            viewerState.initialPinchDistance = newDist;
            
            applyTransform();
        }
    }

    function onTouchEnd(e) {
        if (e.touches.length < 2) {
            viewerState.isPinching = false;
            viewerState.initialPinchDistance = null;
             if (viewerState.scale <= 1) {
                resetImageViewerState();
            }
        }
    }
    
    // --- Initialization ---

    try {
        tg.ready();
        tg.expand();
        applyTelegramTheme();
        tg.onEvent("themeChanged", applyTelegramTheme);
        tg.onEvent("backButtonClicked", () => history.back());
    } catch(e) {
        console.error("Telegram WebApp API not available.", e);
    }


    history.replaceState({ page: "page-main" }, "", "#page-main");
    showPage("page-main", false);

    renderSchedule("schedule-list-zis231", scheduleZis231Data);
    renderSchedule("schedule-list-zis232", scheduleZis232Data);
    loadPngList();

    document.querySelectorAll("[data-target-page]").forEach(button => {
        button.addEventListener("click", (event) => {
            showPage(`page-${event.currentTarget.dataset.targetPage}`);
        });
    });

    window.onpopstate = (event) => {
        if (viewerState.isOpen) {
             closeImageViewer();
        }
        const page = (event.state && event.state.page) ? event.state.page : "page-main";
        showPage(page, false);
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageViewer();
        }
    });

    modalImg.addEventListener('pointerdown', onPointerDown);
    modalImg.addEventListener('pointermove', onPointerMove);
    modalImg.addEventListener('pointerup', onPointerUp);
    modalImg.addEventListener('pointercancel', onPointerUp);
    modalImg.addEventListener('pointerleave', onPointerUp);

    modalImg.addEventListener('touchstart', onTouchStart, { passive: false });
    modalImg.addEventListener('touchmove', onTouchMove, { passive: false });
    modalImg.addEventListener('touchend', onTouchEnd);
    modalImg.addEventListener('touchcancel', onTouchEnd);

    document.addEventListener('keydown', (e) => {
        if (viewerState.isOpen && e.key === 'Escape') {
             closeImageViewer();
        }
    });
});
