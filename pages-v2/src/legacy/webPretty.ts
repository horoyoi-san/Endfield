import { renderAnnouncement } from './webPretty/announcement.js';
import { renderBanner } from './webPretty/banner.js';
import { renderMainBgImage } from './webPretty/mainBgImage.js';
import { renderSidebar } from './webPretty/sidebar.js';
import { renderSingleEnt } from './webPretty/singleEnt.js';


function createSection(id: string) {
  const div = document.createElement('div');
  div.id = id;
  return div;
}

export async function renderWebPretty(container: HTMLElement) {
  container.innerHTML = '';

  // 🔹 สร้าง section แยก
  const announcementSec = createSection('announcement');
  const bannerSec = createSection('banner');
  const mainBgSec = createSection('mainbg');
  const singleSec = createSection('single');
  const sidebarSec = createSection('sidebar');


  // 🔹 append ก่อน
  container.appendChild(announcementSec);
  container.appendChild(bannerSec);
  container.appendChild(mainBgSec);
  container.appendChild(singleSec);
  container.appendChild(sidebarSec);


  // 🔹 แล้วค่อย render ลง “ของตัวเอง”
  await renderAnnouncement(announcementSec);
  await renderBanner(bannerSec);
  await renderMainBgImage(mainBgSec);
  await renderSingleEnt(singleSec);
  await renderSidebar(sidebarSec);

}
