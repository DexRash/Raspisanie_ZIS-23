import { openImageViewer } from "./image-viewer.js";

/* Расписание */
export function renderSchedule(containerId, scheduleData) {
  const listContainer = document.getElementById(containerId);
  if (!listContainer) return;
  const groupedSchedule = scheduleData.reduce((acc, item) => {
    (acc[item.date] = acc[item.date] || []).push(item);
    return acc;
  }, {});
  const sortedDates = Object.keys(groupedSchedule).sort(
    (a, b) =>
      new Date(a.split(".").reverse().join("-")) - new Date(b.split(".").reverse().join("-"))
  );
  const today = new Date();
  const todayString = `${String(today.getDate()).padStart(2, "0")}.${String(
    today.getMonth() + 1
  ).padStart(2, "0")}.${today.getFullYear()}`;
  let htmlContent = "";
  sortedDates.forEach((date) => {
    const isToday = date === todayString;
    const items = groupedSchedule[date];
    const dateObject = new Date(date.split(".").reverse().join("-"));
    let dayOfWeek = dateObject.toLocaleDateString("ru-RU", { weekday: "long" });
    dayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    htmlContent += `<li class="schedule-day-block ${isToday ? "schedule-day-today" : ""}">
              <div class="schedule-date"><h3>${dayOfWeek}</h3><h3>${date}</h3></div>
              <ul class="schedule-day-list">`;
    if (items.some((item) => item.subject)) {
      items.forEach((item) => {
        if (!item.subject) return;

        let typeClass = "";
        if (item.type) {
          const lowerCaseType = item.type.toLowerCase();
          if (
            lowerCaseType.includes("экзамен") ||
            lowerCaseType.includes("зачет") ||
            lowerCaseType.includes("защита")
          ) {
            typeClass = "type-exam";
          } else {
            typeClass = "type-info";
          }
        }

        const typeSpan = item.type
          ? `<span class="schedule-item-type ${typeClass}">${item.type}</span>`
          : "";
        const infoParts = [item.classroom, item.teacher, typeSpan].filter(Boolean).join(" &bull; ");

        htmlContent += `
                      <li class="schedule-item">
                          <div class="schedule-item-time">${item.time.replace(/-/g, "<br>")}</div>
                          <div class="schedule-item-details">
                              <div class="schedule-item-subject">${item.subject}</div>
                              <div class="schedule-item-info">${infoParts}</div>
                          </div>
                      </li>`;
      });
    } else {
      htmlContent += `<li class="schedule-item-no-subjects">В этот день нет пар!</li>`;
    }
    htmlContent += `</ul></li>`;
  });
  listContainer.innerHTML = htmlContent;
}

/* Оригинальное расписание */
export function renderOriginalSchedule(schedulePngsUrls) {
  const container = document.getElementById("original-schedule-list");
  if (!container) return;
  container.innerHTML = "";
  schedulePngsUrls.forEach((url, index) => {
    const img = document.createElement("img");
    img.src = url;
    img.classList.add("png-list-item");
    img.addEventListener("click", () => openImageViewer(url));
    container.appendChild(img);
  });
}
