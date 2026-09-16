import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import semver from 'semver';
import type { MirrorFileEntry, StoredData } from '../../types';
import { fetchJson } from '../../utils/api';
import { BASE_URL, FILE_SIZE_OPTS, gameTargets } from '../../utils/constants';
import math from '../../utils/math';
import { generateDownloadLinks } from '../../utils/ui';
import './global.css';

interface Props {
  mirrorFileDb: MirrorFileEntry[];
}

interface PatchItem {
  version: string;
  reqVersion: string;
  format?: 'Format v2' | 'Format v3';
  dateStr: string;
  packedSizeStr: string;
  unpackedSizeStr: string;
  isPrePatch: boolean;
  files: Array<{
    fileName: string;
    md5: string;
    sizeStr: string;
    url: string;
  }>;
}

interface PatchData {
  targetName: string;
  region: 'os' | 'cn';
  dirName: string;
  patches: PatchItem[];
}

const getFormat = (
  diskType?: number,
  patches?: Array<{ url: string }>,
  mainUrl?: string,
): 'Format v2' | 'Format v3' | undefined => {
  if (diskType === 1) return 'Format v3';
  if (diskType === 0) return 'Format v2';
  const urls = [...(patches ?? []).map((p) => p.url), mainUrl ?? ''].join(' ');
  if (urls.includes('/v3/')) return 'Format v3';
  if (urls.includes('/v2/')) return 'Format v2';
  return undefined;
};

const deduplicatePatches = (list: PatchItem[]): PatchItem[] => {
  const seen = new Set<string>();
  return list.filter((p) => {
    const md5List = p.files.map((f) => f.md5).join(',');
    const sig = `${p.isPrePatch ? 'pre' : 'norm'}_${p.reqVersion}_${p.version}_${p.format ?? ''}_${md5List}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
};

const sortPatches = (list: PatchItem[]): PatchItem[] => {
  return [...list].sort((a, b) => {
    if (a.isPrePatch !== b.isPrePatch) {
      return a.isPrePatch ? -1 : 1;
    }

    const vA = semver.coerce(a.version)?.version ?? '0.0.0';
    const vB = semver.coerce(b.version)?.version ?? '0.0.0';
    const vCompare = semver.rcompare(vA, vB);
    if (vCompare !== 0) return vCompare;

    const reqA = semver.coerce(a.reqVersion)?.version ?? '0.0.0';
    const reqB = semver.coerce(b.reqVersion)?.version ?? '0.0.0';
    const reqCompare = semver.rcompare(reqA, reqB);
    if (reqCompare !== 0) return reqCompare;

    return (b.format ?? '').localeCompare(a.format ?? '');
  });
};

export default function PatchesTab({ mirrorFileDb }: Props) {
  const [patchesData, setPatchesData] = useState<PatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const promises = gameTargets.map(async (target): Promise<PatchData | null> => {
        const patchUrl = `${BASE_URL}/akEndfield/launcher/game/${target.dirName}/all_patch.json`;
        const prePatchUrl = `${BASE_URL}/akEndfield/launcher/game/${target.dirName}/all_pre_patch.json`;

        let patchesRaw: StoredData<any>[] = [];
        let prePatchesRaw: StoredData<any>[] = [];

        try {
          patchesRaw = await fetchJson<StoredData<any>[]>(patchUrl);
        } catch {}
        try {
          prePatchesRaw = await fetchJson<StoredData<any>[]>(prePatchUrl);
        } catch {}

        if (patchesRaw.length === 0 && prePatchesRaw.length === 0) return null;

        const prePatches: PatchItem[] = [...prePatchesRaw]
          .reverse()
          .map((e) => {
            if (!e || !e.rsp) return null;
            const version = e.rsp.version;
            const reqVersion = e.req?.version ?? 'Current';
            const dateStr = DateTime.fromISO(e.updatedAt).toFormat('yyyy/MM/dd HH:mm:ss');
            const format = getFormat(e.req?.diskType, e.rsp.patches, e.rsp.url);

            let packedSize = 0;
            if (e.rsp.patches) {
              packedSize = math.arrayTotal(e.rsp.patches.map((f: any) => parseInt(f.package_size)));
            } else if (e.rsp.package_size) {
              packedSize = parseInt(e.rsp.package_size);
            }

            const totalSize = parseInt(e.rsp.total_size || '0');
            const unpackedSize = totalSize > packedSize ? totalSize - packedSize : 0;

            const files = [];
            if (e.rsp.url) {
              files.push({
                fileName: new URL(e.rsp.url).pathname.split('/').pop() ?? '',
                md5: e.rsp.md5 || '',
                sizeStr: math.formatFileSize(packedSize, FILE_SIZE_OPTS),
                url: e.rsp.url,
              });
            }
            if (e.rsp.patches) {
              e.rsp.patches.forEach((f: any) => {
                files.push({
                  fileName: new URL(f.url).pathname.split('/').pop() ?? '',
                  md5: f.md5,
                  sizeStr: math.formatFileSize(parseInt(f.package_size), FILE_SIZE_OPTS),
                  url: f.url,
                });
              });
            }

            return {
              version,
              reqVersion,
              format,
              dateStr,
              packedSizeStr: math.formatFileSize(packedSize, FILE_SIZE_OPTS),
              unpackedSizeStr: math.formatFileSize(unpackedSize, FILE_SIZE_OPTS),
              isPrePatch: true,
              files,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        const normalPatches: PatchItem[] = [...patchesRaw]
          .reverse()
          .map((e) => {
            if (!e.rsp.patch) return null;
            const version = e.rsp.version;
            const reqVersion = e.rsp.request_version;
            const dateStr = DateTime.fromISO(e.updatedAt).toFormat('yyyy/MM/dd HH:mm:ss');
            const format = getFormat(e.req?.diskType, e.rsp.patch.patches, e.rsp.patch.url);

            let packedSize = 0;
            if (e.rsp.patch.patches) {
              packedSize = math.arrayTotal(e.rsp.patch.patches.map((f: any) => parseInt(f.package_size)));
            }

            const totalSize = parseInt(e.rsp.patch.total_size);
            const unpackedSize = totalSize - packedSize;

            const files = [];
            if (e.rsp.patch.url) {
              files.push({
                fileName: new URL(e.rsp.patch.url).pathname.split('/').pop() ?? '',
                md5: e.rsp.patch.md5,
                sizeStr: math.formatFileSize(parseInt(e.rsp.patch.package_size), FILE_SIZE_OPTS),
                url: e.rsp.patch.url,
              });
            }
            if (e.rsp.patch.patches) {
              e.rsp.patch.patches.forEach((f: any) => {
                files.push({
                  fileName: new URL(f.url).pathname.split('/').pop() ?? '',
                  md5: f.md5,
                  sizeStr: math.formatFileSize(parseInt(f.package_size), FILE_SIZE_OPTS),
                  url: f.url,
                });
              });
            }

            return {
              version,
              reqVersion,
              format,
              dateStr,
              packedSizeStr: math.formatFileSize(packedSize, FILE_SIZE_OPTS),
              unpackedSizeStr: math.formatFileSize(unpackedSize, FILE_SIZE_OPTS),
              isPrePatch: false,
              files,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        return {
          targetName: target.name,
          region: target.region,
          dirName: target.dirName,
          patches: sortPatches(deduplicatePatches([...prePatches, ...normalPatches])),
        };
      });

      const results = await Promise.all(promises);
      const validResults = results.filter((r): r is PatchData => r !== null);

      const sortedResults: PatchData[] = [];
      for (const t of gameTargets) {
        const found = validResults.find((r) => r.dirName === t.dirName);
        if (found) sortedResults.push(found);
      }

      setPatchesData(sortedResults);
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className='text-center p-5'>
        <div className='spinner-border' role='status'></div>
      </div>
    );
  }

  return (
      <div className="overview-container">
      {patchesData.map((pkg) => (
        <div key={pkg.dirName} className='mb-5'>
          <h3 className='mb-3 neon-title'>
            {pkg.region === 'cn' ? 'China' : 'Global'}, {pkg.targetName}
          </h3>
          <div className='accordion glass-accordion' id={`accordion-patch-${pkg.dirName}`}>
            {pkg.patches.map((ver, idx) => {
              const itemId = `patch-${pkg.dirName}-${idx}`;
              return (
                <div className='accordion-item glass-card' key={itemId}>
                  <h2 className='accordion-header' id={`heading-${itemId}`}>
                    <button
                      className='accordion-button collapsed glass-accordion-btn'
                      type='button'
                      data-bs-toggle='collapse'
                      data-bs-target={`#collapse-${itemId}`}
                      aria-expanded='false'
                      aria-controls={`collapse-${itemId}`}
                    >
                      <div className='d-flex w-100 justify-content-between me-3 align-items-center'>
                        <span className='fw-bold'>
                          {ver.isPrePatch && (
                            <span className='badge bg-warning text-dark me-2'>PRE-PATCH</span>
                          )}
                          {ver.format && (
                            <span
                              className={`badge ${
                                ver.format === 'Format v3' ? 'bg-primary' : 'bg-secondary'
                              } me-2`}
                            >
                              {ver.format}
                            </span>
                          )}
                          {ver.reqVersion} → {ver.version}
                        </span>
                        <span className='text-muted small align-bottom'>{ver.dateStr}</span>
                      </div>
                    </button>
                  </h2>
                  <div
                    id={`collapse-${itemId}`}
                    className='accordion-collapse collapse'
                    aria-labelledby={`heading-${itemId}`}
                    data-bs-parent={`#accordion-patch-${pkg.dirName}`}
                  >
                    <div className='accordion-body glass-body'>
                      <table className='table table-sm table-borderless w-auto mb-2'>
                        <tbody>
                          {ver.format && (
                            <tr>
                              <td>Patch Format</td>
                              <td className='text-end fw-bold'>{ver.format}</td>
                            </tr>
                          )}
                          <tr>
                            <td>Unpacked Size</td>
                            <td className='text-end fw-bold'>{ver.unpackedSizeStr}</td>
                          </tr>
                          <tr>
                            <td>Packed Size</td>
                            <td className='text-end fw-bold'>{ver.packedSizeStr}</td>
                          </tr>
                        </tbody>
                      </table>
                      <div className='table-responsive'>
                        <table className='table table-striped table-bordered table-sm align-middle text-nowrap glass-table'>
                          <thead>
                            <tr>
                              <th>File</th>
                              <th>MD5 Checksum</th>
                              <th className='text-end'>Size</th>
                              <th className='text-center'>DL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ver.files.map((file, pIdx) => (
                              <tr key={pIdx}>
                                <td>{file.fileName}</td>
                                <td>
                                  <code>{file.md5}</code>
                                </td>
                                <td className='text-end'>{file.sizeStr}</td>
                                <td
                                  className='text-center'
                                  dangerouslySetInnerHTML={{ __html: generateDownloadLinks(file.url, mirrorFileDb) }}
                                ></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
