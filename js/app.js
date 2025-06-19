import { initNavigation } from "./navigation.js";
import { renderSchedule, renderOriginalSchedule } from "./render.js";
import { initImageViewer, closeImageViewer, isImageViewerOpen } from "./image-viewer.js";

const DATA_PATHS = {
  ZIS_231: "../data/zis_231.json",
  ZIS_232: "../data/zis_232.json",
  ORIGINAL_SCHEDULE: "../data/original_schedule.json",
};

async function fetchJsonData(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching JSON:", error);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const tg = window.Telegram && window.Telegram.WebApp; // Проверяем существование window.Telegram

  if (tg) {
    try {
      tg.ready();
      tg.expand();
      initImageViewer(tg);
      initNavigation(tg, closeImageViewer, isImageViewerOpen);
    } catch (e) {
      console.error("Telegram WebApp API: Ошибка инициализации или недоступен.", e);
    }
  } else {
    console.warn("Telegram WebApp API не обнаружен. Некоторые функции могут быть недоступны.");
  }

  try {
    const [zis231Data, zis232Data, originalScheduleData] = await Promise.all([
      fetchJsonData(DATA_PATHS.ZIS_231),
      fetchJsonData(DATA_PATHS.ZIS_232),
      fetchJsonData(DATA_PATHS.ORIGINAL_SCHEDULE),
    ]);

    renderSchedule("schedule-zis-231-list", zis231Data);
    renderSchedule("schedule-zis-232-list", zis232Data);
    renderOriginalSchedule(originalScheduleData);
  } catch (error) {
    console.error("Не удалось загрузить все необходимые данные:", error);
  }
});
