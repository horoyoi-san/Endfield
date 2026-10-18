import { useMemo, useState } from 'react';
import informationData from '../../../../../output/information.json';
import type { InformationPageData, InformationVideoItem, InformationBulletinItem } from '../../../types';

type MediaItem = {
  id: string;
  kind: 'video' | 'image';
  title: string;
  subtitle: string;
  date: string;
  image: string;
  mediaUrl?: string;
};

function normalizeVideoUrl(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/);
  return match ? `https://www.youtube-nocookie.com/embed/${match[1]}` : url;
}

function displayDate(value: string | number) {
  const date = new Date(typeof value === 'number' ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? 'ARCHIVE DATE UNKNOWN' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export default function MediaSection() {
  const latest = (Array.isArray(informationData) && informationData.length ? informationData[informationData.length - 1] : null) as InformationPageData | null;
  const media = useMemo(() => {
    if (!latest) return [];
    const videos: MediaItem[] = (latest.videos ?? []).map((video: InformationVideoItem) => ({
      id: `video-${video.cid}`,
      kind: 'video',
      title: video.content.title || video.name,
      subtitle: video.name,
      date: displayDate(video.content.displayTime),
      image: video.content.cover.url,
      mediaUrl: video.content.video,
    }));
    const images: MediaItem[] = (latest.bulletins ?? []).filter((entry: InformationBulletinItem) => entry.cover).map((entry: InformationBulletinItem) => ({
      id: `image-${entry.cid}`,
      kind: 'image',
      title: entry.title,
      subtitle: entry.brief,
      date: displayDate(entry.displayTime),
      image: entry.cover,
      mediaUrl: entry.url,
    }));
    return [...videos, ...images];
  }, [latest]);

  const [filter, setFilter] = useState<'all' | 'video' | 'image'>('all');
  const [selectedId, setSelectedId] = useState('');
  const [playingId, setPlayingId] = useState('');
  const visibleMedia = media.filter((item) => filter === 'all' || item.kind === filter);
  const selected = visibleMedia.find((item) => item.id === selectedId) ?? visibleMedia[0];

  if (!selected) {
    return <div className='ef-media-empty'>NO MEDIA RECORDS FOUND IN THE CURRENT ARCHIVE SNAPSHOT</div>;
  }

  const isPlaying = playingId === selected.id && selected.kind === 'video';
  const isMp4 = selected.mediaUrl?.toLowerCase().includes('.mp4') ?? false;

  return (
    <div className='ef-media-gallery'>
      <div className='ef-media-toolbar'>
        <div><span>ARCHIVE MEDIA</span><small>{String(visibleMedia.length).padStart(2, '0')} RECORDS</small></div>
        <div className='ef-media-filters' role='group' aria-label='Filter media'>
          {(['all', 'video', 'image'] as const).map((value) => <button type='button' key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setSelectedId(''); setPlayingId(''); }}>{value === 'all' ? 'ALL MEDIA' : value === 'video' ? 'VIDEOS' : 'IMAGES'}</button>)}
        </div>
      </div>

      <section className='ef-media-feature' aria-label='Selected media'>
        {selected.kind === 'video' && isPlaying && selected.mediaUrl ? (
          isMp4 ? <video className='ef-media-player' src={selected.mediaUrl} poster={selected.image} controls autoPlay playsInline /> :
            <iframe className='ef-media-player' src={`${normalizeVideoUrl(selected.mediaUrl)}${normalizeVideoUrl(selected.mediaUrl).includes('?') ? '&' : '?'}autoplay=1&rel=0`} title={selected.title} allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share' allowFullScreen />
        ) : (
          <button className='ef-media-frame' type='button' onClick={() => selected.kind === 'video' ? setPlayingId(selected.id) : selected.mediaUrl && window.open(selected.mediaUrl, '_blank', 'noopener,noreferrer')} aria-label={selected.kind === 'video' ? `Play ${selected.title}` : `Open ${selected.title}`}>
            <img src={selected.image} alt={selected.title} referrerPolicy='no-referrer' />
            {selected.kind === 'video' && <span className='ef-media-play'><i>▶</i><small>PLAY FEATURE</small></span>}
            <span className='ef-media-frame-label'>{selected.kind === 'video' ? 'VIDEO FEATURE' : 'IMAGE FEATURE'} <b>//</b> {selected.date}</span>
          </button>
        )}
        <div className='ef-media-feature-caption'>
          <div><span className='ef-media-type'>{selected.kind === 'video' ? '▶ VIDEO' : '▧ IMAGE'} <i>•</i> {selected.date}</span><h3>{selected.title}</h3><p>{selected.subtitle}</p></div>
          <span className='ef-media-index'>{String(visibleMedia.findIndex((item) => item.id === selected.id) + 1).padStart(2, '0')} <i>/</i> {String(visibleMedia.length).padStart(2, '0')}</span>
        </div>
      </section>

      <div className='ef-media-strip-head'><span>SELECT A RECORD</span><small>SCROLL TO EXPLORE THE ARCHIVE</small></div>
      <div className='ef-media-strip' role='list' aria-label='Media archive items'>
        {visibleMedia.map((item, index) => <button type='button' role='listitem' key={item.id} className={`ef-media-thumb ${selected.id === item.id ? 'active' : ''}`} onClick={() => { setSelectedId(item.id); setPlayingId(''); }}>
          <span className='ef-media-thumb-image'><img src={item.image} alt='' loading='lazy' referrerPolicy='no-referrer' /><i>{item.kind === 'video' ? '▶' : '▧'}</i></span>
          <span className='ef-media-thumb-copy'><small>{String(index + 1).padStart(2, '0')} // {item.kind.toUpperCase()}</small><strong>{item.title}</strong><time>{item.date}</time></span>
        </button>)}
      </div>
    </div>
  );
}
