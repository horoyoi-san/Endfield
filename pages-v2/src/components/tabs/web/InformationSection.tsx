import { useEffect, useState } from 'react';
import type {
  InformationBulletinItem,
  InformationPageData,
  InformationVideoItem,
} from '../../../types';

import informationData from '../../../../../output/information.json';

interface PreviewState {
  type: 'image' | 'video';
  mode: 'embed' | 'external';
  url: string;
  title: string;
  externalUrl?: string;
  externalLabel?: string;
  isMp4?: boolean;
}

function normalizeVideoUrl(video: string) {
  if (!video) return '';

  if (video.includes('youtube.com/embed/')) {
    return video;
  }

  const match = video.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^?&]+)/
  );

  if (match?.[1]) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }

  return video;
}

function getYoutubeWatchUrl(video: string) {
  if (!video) return undefined;

  const match = video.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/)([^?&]+)/
  );

  if (!match?.[1]) {
    return undefined;
  }

  return `https://www.youtube.com/watch?v=${match[1]}`;
}

function getPreviewTargets(video: string) {
  const embedUrl = normalizeVideoUrl(video);
  const youtubeWatchUrl = getYoutubeWatchUrl(video);

  return {
    embedUrl,
    externalUrl: youtubeWatchUrl ?? video,
    externalLabel: youtubeWatchUrl
      ? 'ดูใน YouTube'
      : 'เปิดลิงก์ต้นทาง',
  };
}

function formatDisplayTime(value: string | number) {
  const date = new Date(
    typeof value === 'number'
      ? value * 1000
      : value
  );

  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
}

export default function InformationSection() {
  const [preview, setPreview] =
    useState<PreviewState | null>(null);

  useEffect(() => {
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        setPreview(null);
      }
    };

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener(
        'keydown',
        handler
      );
    };
  }, []);

  const latest =
    Array.isArray(informationData) &&
    informationData.length > 0
      ? (informationData[
          informationData.length - 1
        ] as InformationPageData)
      : null;

  const bulletins =
    latest?.bulletins ?? [];

  const videos =
    latest?.videos ?? [];

  return (
    <>
      <div className="glass-card mb-3">
        <div
          className="card-header d-flex justify-content-between align-items-center border-0"
          style={{
            cursor: 'pointer',
          }}
          data-bs-toggle="collapse"
          data-bs-target="#collapseInformation"
          role="button"
        >
          <div>
            <h3 className="h4 mb-0 card-title">
              Information
            </h3>

            <div
              className="text-muted"
              style={{
                fontSize: '0.9rem',
              }}
            >
              Videos & media from the official
              information page
            </div>
          </div>

          <span className="badge bg-primary-subtle text-primary-emphasis">
            {latest?.total ?? 0} items
          </span>
        </div>

        <div
          id="collapseInformation"
          className="collapse show"
        >
          <div className="card-body">
            {!latest && (
              <div className="text-muted">
                No information data
              </div>
            )}

            {latest && (
              <div className="d-flex flex-column gap-4">
                {/* VIDEOS */}
                <section>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="h5 mb-0">
                      Videos
                    </h4>

                    <span className="text-muted">
                      {videos.length} videos
                    </span>
                  </div>

                  {videos.length === 0 ? (
                    <div className="text-muted">
                      No videos found.
                    </div>
                  ) : (
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                      {videos.map(
                        (
                          video: InformationVideoItem
                        ) => {
                          const previewTargets =
                            getPreviewTargets(
                              video.content.video
                            );

                          const mp4Url =
                            video.content.preview
                              ?.url;

                          return (
                            <div
                              key={video.cid}
                              className="col"
                            >
                              <div className="card h-100 glass-card border-0">
                                <button
                                  type="button"
                                  className="btn p-0 border-0 bg-transparent text-start"
                                  style={{
                                    cursor:
                                      'pointer',
                                  }}
                                  onClick={() =>
                                    setPreview({
                                      type:
                                        'video',

                                      mode:
                                        'embed',

                                      // ใช้ mp4 ก่อน
                                      url:
                                        mp4Url ||
                                        previewTargets.embedUrl,

                                      // เช็ค mp4 จริง
                                      isMp4:
                                        !!mp4Url &&
                                        mp4Url.endsWith(
                                          '.mp4'
                                        ),

                                      title:
                                        video
                                          .content
                                          .title,

                                      // youtube link จริง
                                      externalUrl:
                                        previewTargets.externalUrl,

                                      externalLabel:
                                        'ดูใน YouTube',
                                    })
                                  }
                                >
                                  <img
                                    src={
                                      video.content
                                        .cover.url
                                    }
                                    alt={
                                      video.content
                                        .title
                                    }
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                    style={{
                                      width:
                                        '100%',
                                      aspectRatio:
                                        '16 / 9',
                                      objectFit:
                                        'cover',
                                      borderTopLeftRadius:
                                        '0.75rem',
                                      borderTopRightRadius:
                                        '0.75rem',
                                    }}
                                  />
                                </button>

                                <div className="card-body d-flex flex-column gap-2">
                                  <div className="d-flex justify-content-between align-items-start gap-2">
                                    <span className="badge bg-secondary-subtle text-secondary-emphasis">
                                      {
                                        video
                                          .content
                                          .cate
                                      }
                                    </span>

                                    <span
                                      className="text-muted"
                                      style={{
                                        fontSize:
                                          '0.8rem',
                                      }}
                                    >
                                      {formatDisplayTime(
                                        video
                                          .content
                                          .displayTime
                                      )}
                                    </span>
                                  </div>

                                  <h5 className="h6 mb-0">
                                    {
                                      video
                                        .content
                                        .title
                                    }
                                  </h5>

                                  <p
                                    className="text-muted mb-0"
                                    style={{
                                      fontSize:
                                        '0.9rem',
                                    }}
                                  >
                                    {video.name}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}
                </section>

                {/* IMAGES */}
                <section>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="h5 mb-0">
                      Images & Highlights
                    </h4>

                    <span className="text-muted">
                      {bulletins.length} posts
                    </span>
                  </div>

                  {bulletins.length === 0 ? (
                    <div className="text-muted">
                      No images found.
                    </div>
                  ) : (
                    <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-3">
                      {bulletins.map(
                        (
                          bulletin: InformationBulletinItem
                        ) => (
                          <div
                            key={bulletin.cid}
                            className="col"
                          >
                            <div className="card h-100 glass-card border-0">
                              <button
                                type="button"
                                className="btn p-0 border-0 bg-transparent text-start"
                                style={{
                                  cursor:
                                    'pointer',
                                }}
                                onClick={() =>
                                  setPreview({
                                    type:
                                      'image',

                                    mode:
                                      bulletin.url
                                        ? 'external'
                                        : 'embed',

                                    url:
                                      bulletin.cover,

                                    title:
                                      bulletin.title,

                                    externalUrl:
                                      bulletin.url,

                                    externalLabel:
                                      'เปิดข่าวต้นทาง',
                                  })
                                }
                              >
                                <img
                                  src={
                                    bulletin.cover
                                  }
                                  alt={
                                    bulletin.title
                                  }
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  style={{
                                    width:
                                      '100%',
                                    aspectRatio:
                                      '16 / 9',
                                    objectFit:
                                      'cover',
                                    borderTopLeftRadius:
                                      '0.75rem',
                                    borderTopRightRadius:
                                      '0.75rem',
                                  }}
                                />
                              </button>

                              <div className="card-body d-flex flex-column gap-2">
                                <div className="d-flex justify-content-between align-items-center gap-2">
                                  <span className="badge bg-info-subtle text-info-emphasis">
                                    {
                                      bulletin.tab
                                    }
                                  </span>

                                  <span
                                    className="text-muted"
                                    style={{
                                      fontSize:
                                        '0.8rem',
                                    }}
                                  >
                                    {formatDisplayTime(
                                      bulletin.displayTime
                                    )}
                                  </span>
                                </div>

                                <h5 className="h6 mb-0">
                                  {
                                    bulletin.title
                                  }
                                </h5>

                                <p
                                  className="text-muted mb-0"
                                  style={{
                                    fontSize:
                                      '0.9rem',
                                  }}
                                >
                                  {
                                    bulletin.brief
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVIEW */}
      {preview && (
        <div
          onClick={() =>
            setPreview(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            background:
              'rgba(0,0,0,0.88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            backdropFilter:
              'blur(10px)',
          }}
        >
          {preview.type === 'image' ? (
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <img
                src={preview.url}
                alt={preview.title}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '82vh',
                  borderRadius: '18px',
                  objectFit:
                    'contain',
                  boxShadow:
                    '0 24px 80px rgba(0,0,0,0.5)',
                }}
              />

              {preview.externalUrl && (
                <a
                  href={
                    preview.externalUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-light"
                >
                  {
                    preview.externalLabel
                  }
                </a>
              )}
            </div>
          ) : (
            <div
              onClick={(e) =>
                e.stopPropagation()
              }
              style={{
                width:
                  'min(100%, 1120px)',
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#111',
                boxShadow:
                  '0 24px 80px rgba(0,0,0,0.5)',
              }}
            >
              {/* HEADER */}
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  padding:
                    '0.75rem 1rem',
                  background:
                    'rgba(12,15,24,0.95)',
                }}
              >
                <div
                  style={{
                    color: '#fff',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow:
                      'ellipsis',
                    whiteSpace:
                      'nowrap',
                  }}
                >
                  {preview.title}
                </div>

                {preview.externalUrl && (
                  <a
                    href={
                      preview.externalUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-danger"
                  >
                    {
                      preview.externalLabel
                    }
                  </a>
                )}
              </div>

              {/* PLAYER */}
              <div
                style={{
                  width: '100%',
                  aspectRatio:
                    '16 / 9',
                  background: '#000',
                }}
              >
                {preview.isMp4 &&
                preview.url.includes(
                  '.mp4'
                ) ? (
                  <video
                    src={preview.url}
                    controls
                    autoPlay
                    playsInline
                    onError={() => {
                      if (
                        preview.externalUrl
                      ) {
                        setPreview({
                          ...preview,

                          // fallback ไป youtube
                          isMp4: false,

                          url: normalizeVideoUrl(
                            preview.externalUrl
                          ),
                        });
                      }
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      background:
                        '#000',
                    }}
                  />
                ) : (
                  <iframe
                    src={preview.url}
                    title={preview.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 0,
                    }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
