import { useEffect, useState } from 'react';
import { gameTargets, launcherWebApiLang } from '../../utils/constants';

import AnnouncementSection from './web/AnnouncementSection';
import BannerSection from './web/BannerSection';
import MainBgImageSection from './web/MainBgImageSection';
import SidebarSection from './web/SidebarSection';
import SingleEntSection from './web/SingleEntSection';
import OperatorSection from './web/OperatorSection';
import MediaSection from './web/MediaSection';
import './global.css';

const webModules = [
  { id: 'announcement', number: '01', icon: '▤', label: 'Announcements', detail: 'News, notices, and live-service messages' },
  { id: 'media', number: '02', icon: '▶', label: 'Media', detail: 'Featured trailers, videos, and image archive' },
  { id: 'banner', number: '03', icon: '▧', label: 'Banners', detail: 'Promotional art and campaign panels' },
  { id: 'main-bg-image', number: '04', icon: '◫', label: 'Environments', detail: 'Launcher backgrounds and video assets' },
  { id: 'single-ent', number: '05', icon: '◈', label: 'Single entity', detail: 'Standalone client content records' },
  { id: 'sidebar', number: '06', icon: '▥', label: 'Sidebar', detail: 'Launcher navigation artwork' },
  { id: 'operator', number: '07', icon: '✳', label: 'Operators', detail: 'Character art and operator records' },
];

export default function WebTab({ moduleId }: { moduleId: string }) {
  const [targetIdx, setTargetIdx] = useState(0);
  const [lang, setLang] = useState('');

  const target = gameTargets[targetIdx]!;
  const langs = launcherWebApiLang[target.region] || [];
  const activeSection = moduleId;
  const selectedModule = webModules.find((module) => module.id === activeSection) ?? webModules[0]!;

  useEffect(() => {
    const defaultLang = target.region === 'os' ? 'en-us' : 'zh-cn';
    if (langs.includes(defaultLang as any)) {
      setLang(defaultLang);
    } else if (langs.length > 0) {
      setLang(langs[0]);
    }
  }, [targetIdx, target.region, langs]);

  return (
      <div className="overview-container ef-module-page ef-web-view">
      <div className='ef-web-controls row g-3 mb-3 glass-card p-3'>
        <div className='col-md-6'>
          <label className='form-label fw-bold'>Target</label>
          <select className='form-select glass-select' value={targetIdx} onChange={(e) => setTargetIdx(parseInt(e.target.value))}>
            {gameTargets.map((t, idx) => (
              <option key={idx} value={idx}>
                {t.region === 'cn' ? 'China' : 'Global'} - {t.name}
              </option>
            ))}
          </select>
        </div>
        {langs.length > 1 && (
          <div className='col-md-6'>
            <label className='form-label fw-bold'>Language</label>
            <select className='form-select glass-select' value={lang} onChange={(e) => setLang(e.target.value)}>
              {langs.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <section className='ef-web-module-stage'>
          <header className='ef-web-stage-head'><div><span className='ef-record-kicker'>WEB ASSET DATABASE // {selectedModule.number}</span><h2><span>{selectedModule.icon}</span>{selectedModule.label}</h2><p>{selectedModule.detail}</p></div><div className='ef-web-stage-state'><span className='ef-status-dot' /> MODULE READY</div></header>
          <div className='ef-web-stage-content' key={activeSection}>
            {activeSection === 'announcement' && <AnnouncementSection target={target} lang={lang} />}
            {activeSection === 'media' && <MediaSection />}
            {activeSection === 'banner' && <BannerSection target={target} lang={lang} />}
            {activeSection === 'main-bg-image' && <MainBgImageSection target={target} lang={lang} />}
            {activeSection === 'single-ent' && <SingleEntSection target={target} lang={lang} />}
            {activeSection === 'sidebar' && <SidebarSection target={target} lang={lang} />}
            {activeSection === 'operator' && <OperatorSection />}
          </div>
      </section>
    </div>
  );
}

