import { useEffect, useState } from 'react';
import { fetchJson } from '../../../utils/api';
import type { StoredData } from '../../../types';

export default function OperatorSection() {
  const [data, setData] = useState<StoredData<any>[] | null>(null);
  const [loading, setLoading] = useState(false);

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

  const latest = data?.length ? data[data.length - 1] : null;

  // ✅ กันทุก format (string / object)
  const getImg = (v: any) => {
    if (typeof v === 'string') return v;
    if (v?.url) return v.url;
    if (v?.src) return v.src;
    return '';
  };

  // ❌ filter เฉพาะ operator
  const isOperator = (key: string) => {
    const banned = new Set([
      'appStore',
      'googlePlay',
      'ps5',
      'windows',
      'title',
      'star',
      'timeline',
      'ring',
      'operator',
      'epic',
      'gpg'
    ]);

    if (/^\d+$/.test(key)) return false;

    return !banned.has(key);
  };

  return (
    <div className="card mb-3">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="h4 mb-0">Operator</h3>
      </div>

      <div className="card-body">

        {loading && <div className="text-muted">Loading...</div>}

        {!loading && !latest && (
          <div className="text-muted">No data</div>
        )}

        {latest && (
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-2">

            {Object.entries(latest.rsp || {})
              .filter(([key]) => isOperator(key))
              .map(([name, imgUrl]) => {
                const img = getImg(imgUrl);

                return (
                  <div key={name} className="col">
                    <div className="card border-0 shadow-sm h-100">

                      <img
                        src={img}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="card-img-top"
                        style={{
                          objectFit: 'cover',
                          width: '100%',
                          height: '120px'
                        }}
                        onError={(e) => {
                          console.log('Image failed:', name, imgUrl);
                          (e.target as HTMLImageElement).style.opacity = '0.2';
                        }}
                      />

                      <div
                        className="card-body p-1 text-center"
                        style={{ fontSize: '0.7rem' }}
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
  );
}
