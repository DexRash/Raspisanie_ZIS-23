document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;

    const viewerState = {
        isOpen: false, scale: 1, maxScale: 4, isDragging: false,
        isPinching: false, startX: 0, startY: 0, translateX: 0,
        translateY: 0, initialPinchDistance: null,
    };

    const modal = document.getElementById("image-viewer-modal");
    const modalImg = document.getElementById("image-viewer-content");
    let currentPageId = "page-main";
    const initialTitle = "Расписание";
    let lastTapTime = 0;

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

    function showPage(pageId, title, push = true) {
        document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add("active");
            // Прокрутка страницы вверх при переходе
            targetPage.scrollTop = 0;
        }
        currentPageId = pageId;
        document.title = title || initialTitle;

        // Обновляем текст в "липком" заголовке
        const headerTitleElement = document.querySelector(`#${pageId} .page-title`);
        if (headerTitleElement) {
            headerTitleElement.textContent = title;
        }

        if (push) {
            history.pushState({ page: pageId, title: title }, title, `#${pageId}`);
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
                <div class="schedule-date"><h3>${dayOfWeek}</h3><h3>${date}</h3></div>
                <ul class="schedule-day-list">`;
            if (items.some(item => item.subject)) {
                items.forEach(item => {
                    if (!item.subject) return;
                    
                    // Собираем информацию, оборачивая тип в span для стилизации
                    const infoParts = [item.classroom, item.teacher];
                    if (item.type) {
                        infoParts.push(`<span class="schedule-item-type">${item.type}</span>`);
                    }

                    htmlContent += `
                        <li class="schedule-item">
                            <div class="schedule-item-time">${item.time.replace(/-/g, '<br>')}</div>
                            <div class="schedule-item-details">
                                <div class="schedule-item-subject">${item.subject}</div>
                                <div class="schedule-item-info">${infoParts.filter(Boolean).join(' &bull; ')}</div>
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
        history.pushState({ modal: true }, "", "#viewer");
        viewerState.isOpen = true;
        modal.style.display = "flex";
        tg.BackButton.show();
        modalImg.src = "";
        modalImg.src = imageUrl;
        modalImg.onload = () => {
            const displayedWidth = modalImg.offsetWidth;
            const naturalWidth = modalImg.naturalWidth;
            viewerState.maxScale = (displayedWidth > 0 && naturalWidth > 0) ? Math.max(1, naturalWidth / displayedWidth) : 4;
        };
    }

    function closeImageViewer() {
        viewerState.isOpen = false;
        modal.style.display = "none";
        resetImageViewerState();
        if (currentPageId === 'page-main') {
            tg.BackButton.hide();
        } else {
            tg.BackButton.show();
        }
    }

    function resetImageViewerState() {
        Object.assign(viewerState, {
            scale: 1, translateX: 0, translateY: 0,
            isDragging: false, isPinching: false, initialPinchDistance: null
        });
        applyTransform();
        modalImg.classList.remove('zoomed');
    }
    
    function applyTransform() {
        modalImg.style.transform = `translate(${viewerState.translateX}px, ${viewerState.translateY}px) scale(${viewerState.scale})`;
    }
    
    function getDistance(touches) {
        return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    }
    
    function constrainPan() {
        const imgWidthScaled = modalImg.offsetWidth * viewerState.scale;
        const imgHeightScaled = modalImg.offsetHeight * viewerState.scale;
        const containerWidth = modal.clientWidth;
        const containerHeight = modal.clientHeight;
        const boundaryX = Math.max(0, (imgWidthScaled - containerWidth) / 2);
        const boundaryY = Math.max(0, (imgHeightScaled - containerHeight) / 2);
        viewerState.translateX = Math.max(-boundaryX, Math.min(boundaryX, viewerState.translateX));
        viewerState.translateY = Math.max(-boundaryY, Math.min(boundaryY, viewerState.translateY));
    }

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
            constrainPan();
            applyTransform();
        }
    }

    function onPointerUp() { viewerState.isDragging = false; }

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
            viewerState.scale = Math.max(1, Math.min(viewerState.scale * scaleFactor, viewerState.maxScale));
            viewerState.initialPinchDistance = newDist;
            constrainPan();
            applyTransform();
        }
    }

    function onTouchEnd(e) {
        if (e.touches.length < 2) viewerState.isPinching = false;
        if (viewerState.scale <= 1) resetImageViewerState();
        else { constrainPan(); applyTransform(); }
    }

    function onWheel(e) {
        if (!viewerState.isOpen) return;
        e.preventDefault();
        const oldScale = viewerState.scale;
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        const newScale = Math.max(1, Math.min(oldScale + delta, viewerState.maxScale));
        if (newScale === oldScale) return;
        const rect = modal.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        viewerState.translateX = mouseX - (mouseX - viewerState.translateX) * (newScale / oldScale);
        viewerState.translateY = mouseY - (mouseY - viewerState.translateY) * (newScale / oldScale);
        viewerState.scale = newScale;
        if (newScale <= 1) resetImageViewerState();
        else { constrainPan(); applyTransform(); modalImg.classList.add('zoomed'); }
    }

    function handleImageTap(e) {
        if (!viewerState.isOpen || viewerState.isDragging || viewerState.isPinching) return;
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        if (tapLength < 300 && tapLength > 0) {
            e.preventDefault();
            if (viewerState.scale > 1) {
                resetImageViewerState();
            } else {
                viewerState.scale = viewerState.maxScale;
                constrainPan();
                applyTransform();
                modalImg.classList.add('zoomed');
            }
            lastTapTime = 0;
        }
        lastTapTime = currentTime;
    }
    
    // --- Инициализация ---
    try {
        tg.ready();
        tg.expand();
        applyTelegramTheme();
        tg.onEvent("themeChanged", applyTelegramTheme);
        tg.onEvent("backButtonClicked", () => history.back());
    } catch(e) {
        console.error("Telegram WebApp API not available.", e);
    }

    document.getElementById("session-title").textContent = sessionInfo.title;
    document.getElementById("session-dates").textContent = sessionInfo.dates;
    document.getElementById("last-updated-date").textContent = lastUpdatedDate;

    history.replaceState({ page: "page-main", title: initialTitle }, initialTitle, "#page-main");
    showPage("page-main", initialTitle, false);

    renderSchedule("schedule-list-zis231", scheduleZis231Data);
    renderSchedule("schedule-list-zis232", scheduleZis232Data);
    loadPngList();

    document.querySelectorAll("[data-target-page]").forEach(button => {
        button.addEventListener("click", (event) => {
            const targetPageId = `page-${event.currentTarget.dataset.targetPage}`;
            const targetTitle = event.currentTarget.dataset.title;
            showPage(targetPageId, targetTitle);
        });
    });

    window.onpopstate = (event) => {
        if (viewerState.isOpen) {
            closeImageViewer();
        } else if (event.state && event.state.page) {
            showPage(event.state.page, event.state.title, false);
        } else {
            showPage("page-main", initialTitle, false);
        }
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal) history.back();
    });
    modal.addEventListener('wheel', onWheel, { passive: false });
    modalImg.addEventListener('click', handleImageTap);
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
        if (viewerState.isOpen && e.key === 'Escape') history.back();
    });
});
