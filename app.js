document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;

    const appState = {
        currentPage: "page-main",
        imageViewer: {
            isOpen: false,
            scale: 1,
            isDragging: false,
            startX: 0,
            startY: 0,
            translateX: 0,
            translateY: 0,
            initialPinchDistance: null,
        },
    };

    const modal = document.getElementById("image-viewer-modal");
    const modalImg = document.getElementById("image-viewer-content");

    function applyTelegramTheme() {
        document.body.style.backgroundColor = tg.themeParams.bg_color;
        document.body.style.color = tg.themeParams.text_color;
        
        const style = document.documentElement.style;
        style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
        style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
        style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
        style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
        style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
        style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
        style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);
    }

    function showPage(pageId, pushState = true) {
        document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add("active");
        }

        appState.currentPage = pageId;

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
        appState.imageViewer.isOpen = true;
        modalImg.src = imageUrl;
        modal.style.display = "flex";
        tg.BackButton.hide();
    }

    function closeImageViewer() {
        modal.style.display = "none";
        appState.imageViewer.isOpen = false;
        resetImageViewerState();
        if (appState.currentPage !== 'page-main') {
            tg.BackButton.show();
        }
    }

    function resetImageViewerState() {
        const viewerState = appState.imageViewer;
        viewerState.scale = 1;
        viewerState.translateX = 0;
        viewerState.translateY = 0;
        viewerState.isDragging = false;
        viewerState.initialPinchDistance = null;
        applyTransform();
        modalImg.classList.remove('zoomed');
    }
    
    function applyTransform() {
        const viewerState = appState.imageViewer;
        modalImg.style.transform = `translate(${viewerState.translateX}px, ${viewerState.translateY}px) scale(${viewerState.scale})`;
    }
    
    function getDistance(touches) {
        return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    }
    
    // --- Event Handlers ---

    function onPointerDown(e) {
        if (!appState.imageViewer.isOpen) return;
        e.preventDefault();
        const viewerState = appState.imageViewer;

        if (e.pointerType === 'touch' && e.touches.length === 2) {
            viewerState.initialPinchDistance = getDistance(e.touches);
        } else if (viewerState.scale > 1) {
            viewerState.isDragging = true;
            viewerState.startX = e.clientX - viewerState.translateX;
            viewerState.startY = e.clientY - viewerState.translateY;
            modalImg.classList.add('zoomed');
        }
    }
    
    function onPointerMove(e) {
        if (!appState.imageViewer.isOpen) return;
        e.preventDefault();
        const viewerState = appState.imageViewer;

        if (e.pointerType === 'touch' && e.touches.length === 2 && viewerState.initialPinchDistance) {
            const newDist = getDistance(e.touches);
            const scaleFactor = newDist / viewerState.initialPinchDistance;
            viewerState.scale *= scaleFactor;
            viewerState.scale = Math.max(1, Math.min(viewerState.scale, 5));
            viewerState.initialPinchDistance = newDist;
            applyTransform();
        } else if (viewerState.isDragging) {
            viewerState.translateX = e.clientX - viewerState.startX;
            viewerState.translateY = e.clientY - viewerState.startY;
            applyTransform();
        }
    }

    function onPointerUp(e) {
        if (!appState.imageViewer.isOpen) return;
        const viewerState = appState.imageViewer;
        viewerState.isDragging = false;
        viewerState.initialPinchDistance = null;
        if (viewerState.scale <= 1) {
            modalImg.classList.remove('zoomed');
        }
    }
    
    function onDoubleClick(e) {
        if (!appState.imageViewer.isOpen) return;
        const viewerState = appState.imageViewer;
        if(viewerState.scale > 1) {
             resetImageViewerState();
        } else {
            viewerState.scale = 2.5;
            applyTransform();
            modalImg.classList.add('zoomed');
        }
    }
    
    // --- Initialization ---

    tg.ready();
    tg.expand();
    applyTelegramTheme();
    tg.onEvent("themeChanged", applyTelegramTheme);
    tg.onEvent("backButtonClicked", () => history.back());

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
        const page = (event.state && event.state.page) ? event.state.page : "page-main";
        if (appState.imageViewer.isOpen) {
             closeImageViewer();
        }
        showPage(page, false);
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeImageViewer();
        }
    });
    
    // Listeners for both Mouse and Touch
    modalImg.addEventListener('mousedown', onPointerDown);
    modalImg.addEventListener('mousemove', onPointerMove);
    modal.addEventListener('mouseup', onPointerUp);
    modal.addEventListener('mouseleave', onPointerUp);
    
    modalImg.addEventListener('touchstart', onPointerDown, { passive: false });
    modalImg.addEventListener('touchmove', onPointerMove, { passive: false });
    modalImg.addEventListener('touchend', onPointerUp);

    modalImg.addEventListener('dblclick', onDoubleClick);

    document.addEventListener('keydown', (e) => {
        if (appState.imageViewer.isOpen && e.key === 'Escape') {
             closeImageViewer();
        }
    });
});
