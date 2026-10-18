import { useEffect, useState } from 'react';
import AboutTab from './components/tabs/AboutTab';
import GamePackagesTab from './components/tabs/GamePackagesTab';
import LauncherTab from './components/tabs/LauncherTab';
import OverviewTab from './components/tabs/OverviewTab';
import PatchesTab from './components/tabs/PatchesTab';
import ResourcesTab from './components/tabs/ResourcesTab';
import WebTab from './components/tabs/WebTab';
import type { LauncherWebMainBgImage, MirrorFileEntry, StoredData } from './types';
import { fetchJson, preloadData } from './utils/api';
import { BASE_URL } from './utils/constants';

const navigation = [
  { id: 'overview', label: 'Overview', code: '01', icon: '◈', group: 'ARCHIVE' },
  { id: 'game', label: 'Packages', code: '02', icon: '▤', group: 'ARCHIVE' },
  { id: 'patch', label: 'Patches', code: '03', icon: '⌁', group: 'ARCHIVE' },
  { id: 'resources', label: 'Resources', code: '04', icon: '◫', group: 'ARCHIVE' },
  { id: 'launcher', label: 'Launcher', code: '05', icon: '⏵', group: 'ARCHIVE' },
  { id: 'announcement', label: 'News', code: '06', icon: '▤', group: 'WEB ARCHIVE' },
  { id: 'media', label: 'Media', code: '07', icon: '▶', group: 'WEB ARCHIVE' },
  { id: 'banner', label: 'Banners', code: '08', icon: '▧', group: 'WEB ARCHIVE' },
  { id: 'main-bg-image', label: 'Backgrounds', code: '09', icon: '◫', group: 'WEB ARCHIVE' },
  { id: 'single-ent', label: 'Entity', code: '10', icon: '◈', group: 'WEB ARCHIVE' },
  { id: 'sidebar', label: 'Sidebar', code: '11', icon: '▥', group: 'WEB ARCHIVE' },
  { id: 'operator', label: 'Operators', code: '12', icon: '✳', group: 'WEB ARCHIVE' },
  { id: 'about', label: 'About', code: '13', icon: 'ⓘ', group: 'ABOUT' },
];

const pageCopy: Record<string, { title: string; description: string }> = {
  overview: { title: 'Overview', description: 'Current deployments and resource indexes across the Endfield archive.' },
  game: { title: 'Game packages', description: 'Build history, package manifests, checksums, and distribution links.' },
  patch: { title: 'Patch archive', description: 'Version-to-version updates and patch package manifests.' },
  resources: { title: 'Game resources', description: 'Platform resource indexes and regional release history.' },
  launcher: { title: 'Launcher', description: 'Launcher packages and installer releases by channel.' },
  announcement: { title: 'News', description: 'Notices and event announcements from the official web client.' },
  media: { title: 'Media', description: 'Featured trailers, videos, and image archive.' },
  banner: { title: 'Banners', description: 'Promotional artwork and campaign banners.' },
  'main-bg-image': { title: 'Backgrounds', description: 'Launcher background images and video environments.' },
  'single-ent': { title: 'Single entity', description: 'Standalone client content and version assets.' },
  sidebar: { title: 'Sidebar', description: 'Launcher sidebar artwork and destination links.' },
  operator: { title: 'Operators', description: 'Character artwork and visual records from the web archive.' },
  about: { title: 'About this archive', description: 'Project details, data sources, and archive status.' },
};

const getInitialTab = () => {
  const requestedTab = window.location.hash.slice(1);
  if (requestedTab === 'information') return 'media';
  return Object.hasOwn(pageCopy, requestedTab) ? requestedTab : 'overview';
};

const getMirrorUrl = (url: string) => {
  try {
    const u = new URL(url);
    return `https://raw.githubusercontent.com/horoyoi-san/Endfield/refs/heads/main/output/raw/${u.hostname}${u.pathname}`;
  } catch {
    return url;
  }
};

function App() {
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [mirrorFileDb, setMirrorFileDb] = useState<MirrorFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgVideo, setBgVideo] = useState<string | null>(null);
  const [bgVisible, setBgVisible] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        await preloadData();
      } catch (e) {
        console.warn('Preload failed', e);
      }

      // Fetch mirror list
      try {
        const db = await fetchJson<MirrorFileEntry[]>(`${BASE_URL}/mirror_file_list.json`);
        setMirrorFileDb(db);
      } catch (e) {
        console.warn('Failed to fetch mirror list', e);
      } finally {
        setLoading(false);
      }

      // Fetch latest background image / video
      try {
        const url = `${BASE_URL}/akEndfield/launcher/web/6/main_bg_image/en-us/all.json`;
        const data = await fetchJson<StoredData<LauncherWebMainBgImage>[]>(url);
        if (data.length > 0) {
          // Sort by updatedAt descending
          const sorted = data.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          const latest = sorted.find((entry) => entry.rsp?.main_bg_image?.url || entry.rsp?.main_bg_image?.video_url);
          if (latest?.rsp?.main_bg_image) {
            const mainBg = latest.rsp.main_bg_image;
            const mirrorImgUrl = mainBg.url ? getMirrorUrl(mainBg.url) : null;
            const mirrorVidUrl = mainBg.video_url ? getMirrorUrl(mainBg.video_url) : null;

            setBgImage(mirrorImgUrl);
            setBgVideo(mirrorVidUrl);

            if (mirrorVidUrl) {
              // Video will trigger setBgVisible on load/canplay or fallback timer safety
              setTimeout(() => setBgVisible(true), 500);
            } else if (mirrorImgUrl) {
              const img = new Image();
              img.src = mirrorImgUrl;
              img.onload = () => {
                setTimeout(() => setBgVisible(true), 1);
              };
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch background image/video', e);
      }
    };
    init();
  }, []);

  const renderContent = () => {
    if (loading) {
      return (
        <div className='ef-loading'>
          <div className='spinner-border' role='status'></div>
          <p>Establishing archive uplink…</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <OverviewTab mirrorFileDb={mirrorFileDb} />;
      case 'game':
        return <GamePackagesTab mirrorFileDb={mirrorFileDb} />;
      case 'patch':
        return <PatchesTab mirrorFileDb={mirrorFileDb} />;
      case 'resources':
        return <ResourcesTab />;
      case 'launcher':
        return <LauncherTab mirrorFileDb={mirrorFileDb} />;
      case 'about':
        return <AboutTab />;
      case 'announcement':
      case 'media':
      case 'banner':
      case 'main-bg-image':
      case 'single-ent':
      case 'sidebar':
      case 'operator':
        return <WebTab moduleId={activeTab} />;
      default:
        return null;
    }
  };

  return (
    <>
      {(() => {
        const blurRadius = 4;
        const opacity = 0.3;

        const opacityAnimSec = 1;
        const blurAnimSec = 1;

        const blurRadiusTmp = bgVisible ? blurRadius : blurRadius * 2;
        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
              opacity: bgVisible ? opacity : 0,
              transition: `opacity ${opacityAnimSec}s ease-in-out`,
              overflow: 'hidden',
            }}
          >
            {bgVideo ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                poster={bgImage || undefined}
                onLoadedData={() => setTimeout(() => setBgVisible(true), 1)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              >
                <source src={bgVideo} type='video/mp4' />
              </video>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
            )}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backdropFilter: `blur(${blurRadiusTmp}px)`,
                WebkitBackdropFilter: `blur(${blurRadiusTmp}px)`,
                transition: `backdrop-filter ${blurAnimSec}s ease-in-out`,
              }}
            />
          </div>
        );
      })()}
      <div className='ef-app' id='mainContainer'>
        <aside className='ef-sidebar'>
          <div className='ef-brand'>
            <div className='ef-brand-mark'>E<span>F</span></div>
            <div><strong>ENDFIELD</strong><small>API ARCHIVE / 01</small></div>
          </div>
          <div className='ef-sidebar-rule'><span>TERMINAL ACCESS</span><span>● ONLINE</span></div>
          <nav aria-label='Archive sections'>
          {['ARCHIVE', 'WEB ARCHIVE', 'ABOUT'].map((group) => (
            <div className='ef-nav-group' key={group}>
              <div className='ef-nav-heading'>{group}</div>
              {navigation.filter((item) => item.group === group).map((item) => (
                <button key={item.id} type='button' title={item.label} aria-current={activeTab === item.id ? 'page' : undefined} className={`ef-nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => { setActiveTab(item.id); window.history.replaceState(null, '', `#${item.id}`); }}>
                  <span className='ef-nav-icon'>{item.icon}</span><span>{item.label}</span><small>{item.code}</small>
                </button>
              ))}
            </div>
          ))}
          </nav>
          <div className='ef-sidebar-bottom'><span className='ef-status-dot' /> MIRROR LINK ESTABLISHED<small>ENDFIELD ARCHIVE NODE // ASIA</small></div>
        </aside>

        <main className='ef-main'>
          <header className='ef-topbar'>
            <div><span className='ef-breadcrumb'>FIELD SYSTEMS</span><span className='ef-breadcrumb-sep'>/</span><span>{pageCopy[activeTab].title.toUpperCase()}</span></div>
            <div className='ef-topbar-status'><span className='ef-status-dot' /> SYSTEM NOMINAL <span className='ef-topbar-divider' /> ARCHIVE NODE 01</div>
          </header>
          <div className='ef-page-heading'>
            <div><div className='ef-eyebrow'>ENDFIELD INDUSTRIES <span>//</span> DATA ARCHIVE</div><h1>{pageCopy[activeTab].title}</h1><p>{pageCopy[activeTab].description}</p></div>
            <div className='ef-heading-index'><span>ACTIVE MODULE</span><strong>{navigation.find((item) => item.id === activeTab)?.code}</strong></div>
          </div>
          <section id='content' className='ef-content'>{renderContent()}</section>
          <footer className='ef-footer'><span>© HOROYOI-SAN AND CONTRIBUTORS</span><span>ENDFIELD API ARCHIVE <i>•</i> DATA IS PROVIDED AS COLLECTED</span></footer>
        </main>

        <div className='modal fade' id='debug-log-modal' tabIndex={-1}>
          <div className='modal-dialog modal-dialog-centered modal-dialog-scrollable'>
            <div className='modal-content'>
              <div className='modal-header'><h1 className='modal-title fs-5' id='debug-log-modal-label'>Debug Panel</h1><button type='button' className='btn-close' data-bs-dismiss='modal'></button></div>
              <div className='modal-body'><section><p>Debug Log</p><pre id='debug-log'><code id='debug-log-inner'></code></pre></section></div>
            </div>
          </div>
        </div>
        <button id='debug-log-openBtn' className='d-none btn btn-secondary btn-sm' data-bs-toggle='modal' data-bs-target='#debug-log-modal'>Open Debug Log</button>
      </div>
    </>
  );
}

export default App;
