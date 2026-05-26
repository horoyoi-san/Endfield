import { useEffect, useState } from 'react';
import { gameTargets, launcherWebApiLang } from '../../utils/constants';

import AnnouncementSection from './web/AnnouncementSection';
import BannerSection from './web/BannerSection';
import InformationSection from './web/InformationSection';
import MainBgImageSection from './web/MainBgImageSection';
import SidebarSection from './web/SidebarSection';
import SingleEntSection from './web/SingleEntSection';
import OperatorSection from './web/OperatorSection';
import './global.css';

export default function WebTab() {
  const [targetIdx, setTargetIdx] = useState(0);
  const [lang, setLang] = useState('');

  const target = gameTargets[targetIdx]!;
  const langs = launcherWebApiLang[target.region] || [];

  useEffect(() => {
    const defaultLang = target.region === 'os' ? 'en-us' : 'zh-cn';
    if (langs.includes(defaultLang as any)) {
      setLang(defaultLang);
    } else if (langs.length > 0) {
      setLang(langs[0]);
    }
  }, [targetIdx, target.region, langs]);

  return (
      <div className="overview-container">
      {/* <div className='card'>
        <div className='card-body'> */}
      <div className='row g-3 mb-3 glass-card p-3'>
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

      <div
        className='d-flex flex-wrap gap-2 mb-3'
        style={{ position: 'sticky', top: '1rem', zIndex: 5 }}
      >
        <span className='fw-bold align-self-center'>Jump to:</span>
        <a href='#announcement' className='btn btn-sm btn-outline-primary'>Announcement</a>
        <a href='#banner' className='btn btn-sm btn-outline-primary'>Banner</a>
        <a href='#main-bg-image' className='btn btn-sm btn-outline-primary'>Main Background</a>
        <a href='#single-ent' className='btn btn-sm btn-outline-primary'>Single Ent.</a>
        <a href='#sidebar' className='btn btn-sm btn-outline-primary'>Sidebar</a>
        <a href='#information' className='btn btn-sm btn-outline-primary'>Information</a>
        <a href='#operator' className='btn btn-sm btn-outline-primary'>Operator</a>
      </div>

      <div id='announcement' style={{ scrollMarginTop: '5.5rem' }}>
        <AnnouncementSection target={target} lang={lang} />
      </div>
      <div id='banner' style={{ scrollMarginTop: '5.5rem' }}>
        <BannerSection target={target} lang={lang} />
      </div>
      <div id='main-bg-image' style={{ scrollMarginTop: '5.5rem' }}>
        <MainBgImageSection target={target} lang={lang} />
      </div>
      <div id='single-ent' style={{ scrollMarginTop: '5.5rem' }}>
        <SingleEntSection target={target} lang={lang} />
      </div>
      <div id='sidebar' style={{ scrollMarginTop: '5.5rem' }}>
        <SidebarSection target={target} lang={lang} />
      </div>
      <div id='information' style={{ scrollMarginTop: '5.5rem' }}>
        <InformationSection />
      </div>
      <div id='operator' style={{ scrollMarginTop: '5.5rem' }}>
        <OperatorSection />
      </div>
    </div>
  );
}

