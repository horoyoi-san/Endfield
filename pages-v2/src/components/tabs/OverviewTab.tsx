import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { MirrorFileEntry, StoredData } from '../../types';
import { fetchJson } from '../../utils/api';
import { BASE_URL, FILE_SIZE_OPTS, gameTargets, launcherTargets } from '../../utils/constants';
import math from '../../utils/math';
import './global.css';


interface Props {
  mirrorFileDb: MirrorFileEntry[];
}

interface GameVersionData {
  version: string;
  date: string;
}

interface OverviewTableData {
  region: string;
  channelName: string;
  version: string;
  packedSize: string;
  unpackedSize: string;
}

interface ResourceVersionData {
  platform: string;
  version: string;
  date: string;
}

export default function OverviewTab({ mirrorFileDb }: Props) {
  const [globalPkg, setGlobalPkg] = useState<GameVersionData | null>(null);
  const [chinaPkg, setChinaPkg] = useState<GameVersionData | null>(null);
  const [tableData, setTableData] = useState<OverviewTableData[]>([]);
  const [resourceData, setResourceData] = useState<ResourceVersionData[]>([]);
  const [mirrorStats, setMirrorStats] = useState<string>('---');

  useEffect(() => {
    // 1. Latest Version Info
    const fetchLatestVersion = async (url: string) => {
      try {
        const dat = await fetchJson<StoredData<any>[]>(url);
        const latest = dat.at(-1);
        if (!latest) return { version: '---', date: '---' };
        return {
          version: latest.rsp.version,
          date: DateTime.fromISO(latest.updatedAt).toFormat('yyyy/MM/dd HH:mm:ss'),
        };
      } catch {
        return { version: '---', date: '---' };
      }
    };

    fetchLatestVersion(`${BASE_URL}/akEndfield/launcher/game/6/all.json`).then(setGlobalPkg);
    fetchLatestVersion(`${BASE_URL}/akEndfield/launcher/game/1/all.json`).then(setChinaPkg);

    // 2. Game Packages Table & Mirror Stats Calculation
    const calculateStatsAndTable = async () => {
      const mirrorOrigSet = new Set<string>();
      for (const m of mirrorFileDb) {
        try {
          const u = new URL(m.orig);
          u.search = '';
          mirrorOrigSet.add(u.toString());
        } catch {}
      }

      const countedUrls = new Set<string>();
      let totalMirrorSize = 0;

      const checkAndAddSize = (url: string, size: number) => {
        if (!url || isNaN(size)) return;
        try {
          const u = new URL(url);
          u.search = '';
          const cleanUrl = u.toString();
          if (countedUrls.has(cleanUrl)) return;
          if (mirrorOrigSet.has(cleanUrl)) {
            totalMirrorSize += size;
            countedUrls.add(cleanUrl);
          }
        } catch {}
      };

      const newTableData: OverviewTableData[] = [];

      // Game Packages
      for (const target of gameTargets) {
        const url = `${BASE_URL}/akEndfield/launcher/game/${target.dirName}/all.json`;
        try {
          const data = await fetchJson<StoredData<any>[]>(url);
          if (!data || data.length === 0) continue;

          const latest = data[data.length - 1];
          if (!latest) continue;

          const version = latest.rsp.version;
          const packSizes = latest.rsp.pkg?.packs
            ? latest.rsp.pkg.packs.map((f: any) => parseInt(f.package_size))
            : [];
          const packedSize = math.arrayTotal(packSizes);
          const totalSize = parseInt(latest.rsp.pkg?.total_size || '0');
          const unpackedSize = totalSize - packedSize;

          newTableData.push({
            region: target.region === 'cn' ? 'China' : 'Global',
            channelName: target.name,
            version: version,
            packedSize: math.formatFileSize(packedSize, FILE_SIZE_OPTS),
            unpackedSize: math.formatFileSize(unpackedSize, FILE_SIZE_OPTS),
          });

          for (const entry of data) {
            if (entry.rsp.pkg && entry.rsp.pkg.packs) {
              for (const pack of entry.rsp.pkg.packs) {
                checkAndAddSize(pack.url, parseInt(pack.package_size));
              }
            }
            if (entry.rsp.pre_patch?.patches) {
              for (const patch of entry.rsp.pre_patch.patches) {
                checkAndAddSize(patch.url, parseInt(patch.package_size));
              }
            }
          }
        } catch (e) {
          console.warn('Overview: Failed to fetch game data', target.name, e);
        }
      }
      setTableData(newTableData);

      // Patches (only for stats)
      for (const target of gameTargets) {
        const url = `${BASE_URL}/akEndfield/launcher/game/${target.dirName}/all_patch.json`;
        try {
          const data = await fetchJson<StoredData<any>[]>(url);
          for (const entry of data) {
            if (!entry.rsp.patch) continue;
            if (entry.rsp.patch.url) {
              checkAndAddSize(entry.rsp.patch.url, parseInt(entry.rsp.patch.package_size));
            }
            if (entry.rsp.patch.patches) {
              for (const p of entry.rsp.patch.patches) {
                checkAndAddSize(p.url, parseInt(p.package_size));
              }
            }
          }
        } catch {}

        const preUrl = `${BASE_URL}/akEndfield/launcher/game/${target.dirName}/all_pre_patch.json`;
        try {
          const data = await fetchJson<StoredData<any>[]>(preUrl);
          for (const entry of data) {
            if (!entry.rsp) continue;
            if (entry.rsp.url) {
              checkAndAddSize(entry.rsp.url, parseInt(entry.rsp.package_size || '0'));
            }
            if (entry.rsp.patches) {
              for (const p of entry.rsp.patches) {
                checkAndAddSize(p.url, parseInt(p.package_size));
              }
            }
          }
        } catch {}
      }

      // Launchers (only for stats)
      for (const region of launcherTargets) {
        for (const app of region.apps) {
          try {
            const urlZip = `${BASE_URL}/akEndfield/launcher/launcher/${app}/${region.channel}/all.json`;
            const dataZip = await fetchJson<StoredData<any>[]>(urlZip);
            for (const e of dataZip) {
              checkAndAddSize(e.rsp.zip_package_url, parseInt(e.rsp.package_size));
            }
          } catch {}
          try {
            const urlExe = `${BASE_URL}/akEndfield/launcher/launcherExe/${app}/${region.channel}/all.json`;
            const dataExe = await fetchJson<StoredData<any>[]>(urlExe);
            for (const e of dataExe) {
              checkAndAddSize(e.rsp.exe_url, parseInt(e.rsp.exe_size));
            }
          } catch {}
        }
      }

      setMirrorStats(math.formatFileSize(totalMirrorSize, { ...FILE_SIZE_OPTS, unit: 'G' }));
    };

    calculateStatsAndTable();

    // 3. Latest Game Resources
    const fetchResources = async () => {
      const resPlatforms = ['Windows', 'Android', 'iOS', 'PlayStation'];
      const resData = await Promise.all(
        resPlatforms.map(async (p) => {
          try {
            const url = `${BASE_URL}/akEndfield/launcher/game_resources/6/${p}/all.json`;
            const dat = await fetchJson<StoredData<any>[]>(url);
            return dat.at(-1);
          } catch {
            return undefined;
          }
        }),
      );

      const newResourceData = resPlatforms.map((p, i) => {
        const item = resData[i];
        if (!item) {
          return { platform: p, version: '---', date: '' };
        }
        const initialRes = item.rsp.resources.find((e: any) => e.name === 'initial');
        const mainRes = item.rsp.resources.find((e: any) => e.name === 'main');
        let version = '---';
        if (initialRes && mainRes) {
          version = initialRes.version === mainRes.version ? mainRes.version : item.rsp.res_version;
        }
        return {
          platform: p,
          version: version,
          date: DateTime.fromISO(item.updatedAt).toFormat('yyyy/MM/dd HH:mm:ss'),
        };
      });
      setResourceData(newResourceData);
    };
    fetchResources();
  }, [mirrorFileDb]);

  if (!globalPkg || !chinaPkg) {
    return (
      <div className='text-center'>
        <div className='spinner-border' role='status'></div>
        <p>Loading overview...</p>
      </div>
    );
  }

  return (
    <div className='ef-dashboard'>
      <section className='ef-hero-panel'>
        <div className='ef-hero-copy'>
          <div className='ef-panel-code'>ARCHIVE STATUS <span>•</span> OPERATIONAL</div>
          <h2>Arknights<br /><em>ENDFIELD</em></h2>
          <p>Current deployments and content indexes from the Endfield archive network.</p>
        </div>
        <div className='ef-hero-mark'><span>EF</span><i>FIELD<br />INTEL</i></div>
        <div className='ef-hero-corner'>TERMINAL 01 <b>///</b> LIVE FEED</div>
      </section>

      <div className='ef-stat-grid'>
        <article className='ef-stat-card'><div className='ef-stat-label'><span className='ef-status-dot' /> GLOBAL BUILD</div><strong>{globalPkg.version}</strong><small>DEPLOYED {globalPkg.date}</small><div className='ef-stat-corner'>01</div></article>
        <article className='ef-stat-card'><div className='ef-stat-label'><span className='ef-status-dot' /> CN BUILD</div><strong>{chinaPkg.version}</strong><small>DEPLOYED {chinaPkg.date}</small><div className='ef-stat-corner'>02</div></article>
        <article className='ef-stat-card ef-stat-accent'><div className='ef-stat-label'>MIRROR STORAGE</div><strong>{mirrorStats}</strong><small>AVAILABLE IN ARCHIVE</small><div className='ef-stat-corner'>03</div></article>
      </div>

      <div className='ef-section-bar'><div><span>01</span><h2>Build manifest</h2></div><small>GAME PACKAGE CHANNELS</small></div>
      <div className='ef-panel ef-manifest-panel'>
        <div className='ef-panel-topline'><span>DEPLOYMENT RECORDS</span><span>{String(tableData.length).padStart(2, '0')} CHANNELS</span></div>
        <div className='table-responsive'>
          <table className='table table-sm align-middle text-nowrap glass-table mb-0'>
            <thead><tr><th>Region</th><th>Channel</th><th>Build</th><th className='text-end'>Packed</th><th className='text-end'>Unpacked</th></tr></thead>
            <tbody>{tableData.map((row, i) => <tr key={i}><td><span className='ef-region-mark'>{row.region === 'China' ? 'CN' : 'GL'}</span>{row.region}</td><td>{row.channelName}</td><td><code className='ef-version-code'>{row.version}</code></td><td className='text-end'>{row.packedSize}</td><td className='text-end'>{row.unpackedSize}</td></tr>)}</tbody>
          </table>
        </div>
      </div>

      <div className='ef-section-bar'><div><span>02</span><h2>Resource channels</h2></div><small>INDEX STATUS BY PLATFORM</small></div>
      <div className='ef-resource-grid'>{resourceData.map((res, i) => <article className='ef-resource-card' key={i}><div className='ef-resource-icon'>{['▣', '▰', '◉', '◈'][i]}</div><div className='ef-resource-platform'>{res.platform}</div><strong>{res.version}</strong><small>{res.date ? `SYNC ${res.date}` : 'AWAITING DATA'}</small><div className='ef-resource-state'><span className='ef-status-dot' /> INDEXED</div></article>)}</div>
    </div>
  );
}
