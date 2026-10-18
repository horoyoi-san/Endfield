import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '../../../utils/api';
import type { StoredData } from '../../../types';

function getImage(value: any): string {
  if (typeof value === 'string') return value;
  if (value?.url) return value.url;
  if (value?.src) return value.src;
  if (Array.isArray(value?.versions)) return value.versions[0] ?? '';
  return '';
}

function isCharacterAsset(name: string, image: string) {
  const file = image.split('/').pop()?.split('?')[0]?.toLowerCase() ?? '';
  if (!image || /^\d+(?:\.\d+)*\*?$/.test(name.trim())) return false;
  if (/appstore|googleplay|ps5|windows|epic|gpg|button|theme|star|ring|timeline|title|logo|copyright|switcher/.test(file)) return false;
  if (/bg|wave|texture|deco|block|kv_|points|color-bar/.test(file)) return false;
  return /\.(png|jpe?g|webp)$/i.test(file);
}

export default function OperatorSection() {
  const [data, setData] = useState<StoredData<Record<string, unknown>>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    fetchJson<StoredData<Record<string, unknown>>[]>(
      'https://raw.githubusercontent.com/horoyoi-san/Endfield/refs/heads/main/output/characters.json',
    ).then(setData).catch((error) => {
      console.error('Failed to load operator archive', error);
      setData(null);
    }).finally(() => setLoading(false));
  }, []);

  const operators = useMemo(() => {
    const latest = data?.at(-1);
    return Object.entries(latest?.rsp ?? {})
      .map(([name, value]) => ({ name: name.trim(), image: getImage(value) }))
      .filter((entry) => isCharacterAsset(entry.name, entry.image));
  }, [data]);

  const selected = operators[selectedIndex];
  const changeSelected = (step: number) => setSelectedIndex((current) => (current + step + operators.length) % operators.length);

  useEffect(() => {
    if (!operators.length) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') changeSelected(1);
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') changeSelected(-1);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [operators.length]);

  if (loading) return <div className='ef-operator-loading'><span className='spinner-border' role='status' />LOADING OPERATOR ARCHIVE</div>;
  if (!selected) return <div className='ef-media-empty'>NO OPERATOR ART FOUND IN THE CURRENT ARCHIVE SNAPSHOT</div>;

  return (
    <section className='ef-operator-showcase' aria-label='Operator art archive'>
      <div className='ef-operator-backdrop' style={{ backgroundImage: `url("${selected.image}")` }} />
      <div className='ef-operator-scanlines' />
      <div className='ef-operator-rail'>
        <button type='button' aria-label='Previous operator' className='ef-operator-arrow' onClick={() => changeSelected(-1)}>⌃</button>
        <div className='ef-operator-list' aria-label='Select operator'>
          {operators.map((operator, index) => <button key={operator.name} type='button' aria-label={operator.name} aria-pressed={selectedIndex === index} className={`ef-operator-thumb ${selectedIndex === index ? 'active' : ''}`} onClick={() => setSelectedIndex(index)}><img src={operator.image} alt='' loading='lazy' referrerPolicy='no-referrer' /><span>{String(index + 1).padStart(2, '0')}</span></button>)}
        </div>
        <button type='button' aria-label='Next operator' className='ef-operator-arrow' onClick={() => changeSelected(1)}>⌄</button>
      </div>

      <div className='ef-operator-copy'>
        <div className='ef-operator-rec'><span>[</span> REC <span>]</span><small>CHARACTER ASSET // ENDFIELD ARCHIVE</small></div>
        <div className='ef-operator-counter'>{String(selectedIndex + 1).padStart(2, '0')} <i>/</i> {String(operators.length).padStart(2, '0')}</div>
        <div className='ef-operator-sigil'>ENDFIELD</div>
        <div className='ef-operator-nameplate'><span>OPERATOR ARCHIVE</span><h2>{selected.name}</h2></div>
        <div className='ef-operator-tags'><span>CHARACTER ART</span><span>ASSET VERIFIED</span><span>WEB SOURCE</span></div>
        <p className='ef-operator-description'>Archived visual asset from the Endfield Industries official web client. Select another operator from the roster to inspect its artwork.</p>
        <div className='ef-operator-record'><span>RECORD ID</span><strong>EF-OP-{String(selectedIndex + 1).padStart(3, '0')}</strong><span>ASSET FORMAT</span><strong>{selected.image.split('?')[0]?.split('.').pop()?.toUpperCase() || 'IMAGE'}</strong></div>
      </div>

      <img className='ef-operator-art' src={selected.image} alt={`${selected.name} character artwork`} referrerPolicy='no-referrer' onError={(event) => { event.currentTarget.style.opacity = '0'; }} />
      <div className='ef-operator-2d'>2D</div>
      <div className='ef-operator-edge-label'>ENDFIELD INDUSTRIES <i>//</i> VISUAL ARCHIVE</div>
      <div className='ef-operator-controls'><span>ROSTER NAVIGATION</span><kbd>↑</kbd><kbd>↓</kbd><span>OR SELECT A PORTRAIT</span></div>
    </section>
  );
}
