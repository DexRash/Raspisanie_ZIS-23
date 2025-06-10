document.addEventListener("DOMContentLoaded", () => {
    const tg = window.Telegram.WebApp;

    const appState = {
        currentPage: "page-main",
        imageViewer: {
            isOpen: false,
            currentIndex: 0,
            scale: 1,
            isDragging: false,
            startX: 0,
            startY: 0,
            translateX: 0,
            translateY: 0,
        },
    };

    const modal = document.getElementById("image-viewer-modal");
    const modalImg = document.getElementById("image-viewer-content");
    const closeBtn = document.querySelector(".close-viewer-btn");
    const prevBtn = document.querySelector(".prev-viewer-btn");
    const nextBtn = document.querySelector(".next-viewer-btn");

    function applyTelegramTheme() {
        document.body.style.backgroundColor = tg.themeParams.bg_color;
        document.body.style.color = tg.themeParams.text_color;
        
        document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color);
        document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color);
        document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color);
        document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color);
        document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color);
        document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color);
        document.documentElement.style.setProperty('--tg-theme-secondary-bg-color', tg.themeParams.secondary_bg_color);

        if (tg.colorScheme === 'dark') {
            document.body.classList.add('telegram-dark');
            document.body.classList.remove('telegram-light');
        } else {
            document.body.classList.add('telegram-light');
            document.body.classList.remove('telegram-dark');
        }
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
            img.dataset.index = index;
            img.addEventListener('click', () => openImageViewer(index));
            container.appendChild(img);
        });
    }

    function openImageViewer(index) {
        appState.imageViewer.isOpen = true;
        appState.imageViewer.currentIndex = index;
        updateImageViewer();
        modal.style.display = "flex";
        tg.BackButton.hide();
    }

    function closeImageViewer() {
        resetImageViewerState();
        modal.style.display = "none";
        appState.imageViewer.isOpen = false;
        if (appState.currentPage !== 'page-main') {
            tg.BackButton.show();
        }
    }

    function resetImageViewerState() {
        appState.imageViewer.scale = 1;
        appState.imageViewer.translateX = 0;
        appState.imageViewer.translateY = 0;
        modalImg.style.transform = `translate(0px, 0px) scale(1)`;
        modalImg.classList.remove('zoomed');
    }
    
    function updateImageViewer() {
        resetImageViewerState();
        modalImg.src = schedulePngsUrls[appState.imageViewer.currentIndex];
    }
    
    function changeImage(direction) {
        const newIndex = appState.imageViewer.currentIndex + direction;
        const totalImages = schedulePngsUrls.length;
        appState.imageViewer.currentIndex = (newIndex + totalImages) % totalImages;
        updateImageViewer();
    }
    
    function handleZoom(event) {
        if (!appState.imageViewer.isOpen) return;
        event.preventDefault();

        const rect = modalImg.getBoundingClientRect();
        const delta = event.deltaY > 0 ? -0.2 : 0.2;
        const newScale = Math.max(1, Math.min(appState.imageViewer.scale + delta, 5));
        
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const newTranslateX = appState.imageViewer.translateX - (mouseX - appState.imageViewer.translateX) * (newScale / appState.imageViewer.scale - 1);
        const newTranslateY = appState.imageViewer.translateY - (mouseY - appState.imageViewer.translateY) * (newScale / appState.imageViewer.scale - 1);

        appState.imageViewer.scale = newScale;
        appState.imageViewer.translateX = newTranslateX;
        appState.imageViewer.translateY = newTranslateY;

        applyTransform();
    }

    function applyTransform() {
        if (appState.imageViewer.scale <= 1) {
            resetImageViewerState();
        } else {
             modalImg.style.transform = `translate(${appState.imageViewer.translateX}px, ${appState.imageViewer.translateY}px) scale(${appState.imageViewer.scale})`;
             modalImg.classList.add('zoomed');
        }
    }

    function handleMouseDown(event) {
        if (!appState.imageViewer.isOpen || appState.imageViewer.scale <= 1) return;
        event.preventDefault();
        appState.imageViewer.isDragging = true;
        appState.imageViewer.startX = event.clientX - appState.imageViewer.translateX;
        appState.imageViewer.startY = event.clientY - appState.imageViewer.translateY;
        modalImg.style.cursor = 'grabbing';
    }

    function handleMouseMove(event) {
        if (!appState.imageViewer.isDragging || !appState.imageViewer.isOpen) return;
        event.preventDefault();
        appState.imageViewer.translateX = event.clientX - appState.imageViewer.startX;
        appState.imageViewer.translateY = event.clientY - appState.imageViewer.startY;
        applyTransform();
    }

    function handleMouseUp() {
        appState.imageViewer.isDragging = false;
        modalImg.style.cursor = 'grab';
    }
    
    function handleDoubleClick() {
        if(appState.imageViewer.scale > 1) {
             resetImageViewerState();
        } else {
            appState.imageViewer.scale = 2.5;
            applyTransform();
        }
    }


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
        showPage(page, false);
    };

    closeBtn.addEventListener("click", closeImageViewer);
    prevBtn.addEventListener("click", () => changeImage(-1));
    nextBtn.addEventListener("click", () => changeImage(1));
    
    modalImg.addEventListener('wheel', handleZoom);
    modalImg.addEventListener('mousedown', handleMouseDown);
    modal.addEventListener('mousemove', handleMouseMove);
    modal.addEventListener('mouseup', handleMouseUp);
    modal.addEventListener('mouseleave', handleMouseUp);
    modalImg.addEventListener('dblclick', handleDoubleClick);

    document.addEventListener('keydown', (e) => {
        if (!appState.imageViewer.isOpen) return;
        if (e.key === 'Escape') closeImageViewer();
        if (e.key === 'ArrowLeft') changeImage(-1);
        if (e.key === 'ArrowRight') changeImage(1);
    });
});
