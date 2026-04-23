import { useEffect, useState } from 'react';
import { fetchJson } from '../../../utils/api';
import type { StoredData } from '../../types.js';
import { BASE_URL, gameTargets, launcherWebApiLang } from '../../../utils/constants';

interface Props {
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function Operator() {
  const [targetIndex, setTargetIndex] = useState(0);
  const [lang, setLang] = useState('');
  const [data, setData] = useState<StoredData<any>[] | null>(null);
  const [loading, setLoading] = useState(false);

  const target = gameTargets[targetIndex];
  const langs = launcherWebApiLang[target.region] || [];

  const defaultLang = target.region === 'os' ? 'en-us' : 'zh-cn';

  // update language when target changes
  useEffect(() => {
    const firstLang = langs.includes(defaultLang) ? defaultLang : langs[0];
    setLang(firstLang || '');
  }, [targetIndex]);

  // fetch data
  useEffect(() => {
    if (!lang) return;

    const load = async () => {
      setLoading(true);

      const url = `https://raw.githubusercontent.com/horoyoi-san/Endfield/refs/heads/main/output/characters.json`;

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
  }, [lang, targetIndex]);

  const latest = data?.length ? data[data.length - 1] : null;

  return (
    <div className="card mb-3">
      {/* Header */}
      <div className="card-header d-flex justify-content-between align-items-center">
        <h3 className="h4 mb-0">Operator</h3>
      </div>

      <div className="card-body">
        {/* Controls */}
        <div className="row g-3 mb-4">
          {/* Target */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Target</label>
            <select
              className="form-select"
              value={targetIndex}
              onChange={(e) => setTargetIndex(Number(e.target.value))}
            >
              {gameTargets.map((t, i) => (
                <option key={i} value={i}>
                  {t.region === 'cn' ? 'China' : 'Global'} - {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Language */}
          <div className="col-md-6">
            <label className="form-label fw-bold">Language</label>
            <select
              className="form-select"
              value={lang}
              onChange={(e) => setLang(e.target.value)}
            >
              {langs.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading && <div className="text-muted">Loading...</div>}

        {!loading && !latest && (
          <div className="text-muted">No data</div>
        )}

        {latest && (
          <div className="row row-cols-2 row-cols-md-4 row-cols-lg-6 g-2">
            {Object.entries(latest.rsp).map(([name, imgUrl]) => (
              <div key={name} className="col">
                <div className="card border-0 shadow-sm h-100">
                  <img
                    src={imgUrl as string}
                    className="card-img-top"
                    style={{ objectFit: 'cover' }}
                  />
                  <div className="card-body p-1 text-center" style={{ fontSize: '0.7rem' }}>
                    {name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
