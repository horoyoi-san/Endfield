import { useEffect, useState } from 'react';
import { fetchJson } from '../../../utils/api';
import type { StoredData } from '../../../types';

export default function OperatorSection() {
  const [data, setData] = useState<StoredData<any>[] | null>(null);
  const [loading, setLoading] = useState(false);

  // 🔥 NEW: modal state
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const url =
        'https://raw.githubusercontent.com/horoyoi-san/Endfield/refs/heads/main/output/characters.json';

      try {
        const res = await fetchJson<StoredData<any>[]>(url);
        setData(res);
      } catch (e) {
        console.error(e);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // 🔥 NEW: close modal with ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const latest = data?.length ? data[data.length - 1] : null;

  const getImg = (v: any) => {
    if (typeof v === 'string') return v;
    if (v?.url) return v.url;
    if (v?.src) return v.src;
    if (Array.isArray(v?.versions)) return v.versions[0];
    return '';
  };

  const isOperator = (key: string, url: string) => {
    const file = url.split('/').pop()?.toLowerCase() || '';

    if (/^\d+$/.test(key)) return false;

    const uiKeywords = [
      'appstore','googleplay','ps5','windows','epic','gpg',
      'button','theme','star','ring','timeline','title',
      'logo','copyright','switcher',
    ];

    if (uiKeywords.some(k => file.includes(k))) return false;

    const bgKeywords = [
      'bg','wave','texture','deco','block','kv_',
      'points','color-bar',
    ];

    if (bgKeywords.some(k => file.includes(k))) return false;

    if (file.endsWith('.mp4')) return false;

    return /\.(png|jpg|jpeg|webp)$/i.test(file);
  };

return (
  <>
    <div className="glass-card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center border-0">
        <h3 className="h4 mb-0 card-title">Operator</h3>
      </div>

      <div className="card-body">

        {loading && <div className="text-muted">Loading...</div>}

        {!loading && !latest && (
          <div className="text-muted">No data</div>
        )}

        {latest && (
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-3">

            {Object.entries(latest.rsp || {})
              .filter(([key, value]: any) =>
                isOperator(key, getImg(value))
              )
              .map(([name, imgUrl]: any) => {
                const img = getImg(imgUrl);

                return (
                  <div key={name} className="col">
                    
                    {/* 🔥 IMAGE CARD */}
                    <div
                      className="glass-card h-100 p-1 operator-card"
                      style={{
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                      }}
                      onClick={() => setPreview(img)}
                    >
                      <div
                        style={{
                          overflow: 'hidden',
                          borderRadius: '14px',
                        }}
                      >
                        <img
                          src={img}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          style={{
                            width: '100%',
                            height: '140px',
                            objectFit: 'cover',
                            transition: 'transform 0.3s ease',
                          }}
                          className="operator-img"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.opacity = '0.2';
                          }}
                        />
                      </div>

                      {/* 🔥 NAME */}
                      <div
                        className="text-center mt-2"
                        style={{
                          fontSize: '0.75rem',
                          color: '#dfe6ff',
                          textShadow: '0 0 6px rgba(120,160,255,0.25)',
                        }}
                      >
                        {name}
                      </div>
                    </div>

                  </div>
                );
              })}

          </div>
        )}

      </div>
    </div>

    {/* 🔥 MODAL */}
    {preview && (
      <div
        onClick={() => setPreview(null)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(10px)',
        }}
      >
        <img
          src={preview}
          style={{
            maxWidth: '90%',
            maxHeight: '90%',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
  </>
);

}
