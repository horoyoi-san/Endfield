import ky from 'ky';
import semver from 'semver';
import * as TypesApiAkEndfield from '../../../types/api/akEndfield/Api.js';
import appConfig from '../../config.js';
import defaultSettings from './defaultSettings.js';

import launcherWeb from './launcherWeb.js';

function _unwrapProxyRsp(rsp: any, kinds: string | string[], fields?: string | string[]) {
  if (!rsp) return rsp;
  const kindList = Array.isArray(kinds) ? kinds : [kinds];
  const fieldList = fields ? (Array.isArray(fields) ? fields : [fields]) : [];
    if ((rsp as any).proxy_rsps && Array.isArray((rsp as any).proxy_rsps)) {
    const proxy = (rsp as any).proxy_rsps as any[];
    // 1) try match by kind names
    for (const k of kindList) {
      const entry = proxy.find((e) => e.kind === k);
      if (entry) {
        if (fieldList.length > 0) {
          for (const f of fieldList) if (entry[f]) return entry[f];
        }
        return Object.values(entry)[1];
      }
    }

    // 2) try match by field presence
    for (const entry of proxy) {
      for (const f of fieldList) if (entry[f]) return entry[f];
    }

      // 3) fallback: return first non-kind wrapper value
    const first = proxy[0];
    if (first) {
      const val = Object.values(first)[1];
      // attach raw proxy wrapper for callers that want to persist the original
      try {
        if (typeof val === 'object' && val !== null) {
          (val as any).__proxy_raw = rsp;
          return val;
        }
      } catch (e) {
        // ignore
      }
      return val;
    }
  }
  return rsp;
}

export default {
  protocol: async (
    appCode: string,
    channel: number,
    subChannel: number,
    language: (typeof defaultSettings.launcherWebLang)[number],
    region: 'os' | 'cn',
    dataVersion: string = '',
  ): Promise<TypesApiAkEndfield.LauncherProtocol> => {
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .post(`https://${apiBase}/proxy/batch_proxy`, {
        ...defaultSettings.ky,
        json: {
          proxy_reqs: [
            {
              kind: 'get_protocol',
              get_protocol_req: {
                appcode: appCode,
                channel: String(channel),
                sub_channel: String(subChannel),
                language,
                dataVersion,
              },
            },
          ],
        },
      })
      .json();
    return _unwrapProxyRsp(rsp, 'get_protocol', 'get_protocol') as TypesApiAkEndfield.LauncherProtocol;
  },
  latestGame: async (
    appCode: string,
    launcherAppCode: string,
    channel: number,
    subChannel: number,
    launcherSubChannel: number,
    version: string | null,
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherLatestGame> => {
    if (version !== null && !semver.valid(version)) throw new Error(`Invalid version string (${version})`);
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .get(`https://${apiBase}/game/get_latest`, {
        ...defaultSettings.ky,
        searchParams: {
          appcode: appCode,
          launcher_appcode: launcherAppCode,
          channel,
          sub_channel: subChannel,
          launcher_sub_channel: launcherSubChannel,
          version: version ?? undefined,
        },
      })
      .json();
    const unwrapped = _unwrapProxyRsp(rsp, 'get_latest_game', 'get_latest_game_rsp');
    return unwrapped as TypesApiAkEndfield.LauncherLatestGame;
  },
  latestGameResources: async (
    appCode: string,
    gameVersion: string, // example: 1.0
    version: string,
    randStr: string,
    platform: 'Windows' | 'Android' | 'iOS' | 'PlayStation',
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherLatestGameResources> => {
    if (!semver.valid(version)) throw new Error(`Invalid version string (${version})`);
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .get(`https://${apiBase}/game/get_latest_resources`, {
        ...defaultSettings.ky,
        searchParams: {
          appcode: appCode,
          game_version: gameVersion,
          version: version,
          platform,
          rand_str: randStr,
        },
      })
      .json();
    const unwrapped = _unwrapProxyRsp(rsp, 'get_latest_game_resources', 'get_latest_game_resources_rsp');
    return unwrapped as TypesApiAkEndfield.LauncherLatestGameResources;
  },
  latestLauncher: async (
    appCode: string,
    channel: number,
    subChannel: number,
    version: string | null,
    targetApp: 'EndField' | 'Arknights' | 'Official',
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherLatestLauncher> => {
    if (version !== null && !semver.valid(version)) throw new Error(`Invalid version string (${version})`);
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .get(`https://${apiBase}/launcher/get_latest`, {
        ...defaultSettings.ky,
        searchParams: {
          appcode: appCode,
          channel,
          sub_channel: subChannel,
          version: version ?? undefined,
          target_app: targetApp,
        },
      })
      .json();
    const unwrapped = _unwrapProxyRsp(rsp, ['get_latest', 'get_latest_launcher'], ['get_latest_launcher_rsp', 'get_latest_rsp']);
    return unwrapped as TypesApiAkEndfield.LauncherLatestLauncher;
  },
  latestLauncherExe: async (
    appCode: string,
    channel: number,
    subChannel: number,
    version: string | null,
    targetApp: 'endfield' | 'official' | string,
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherLatestLauncherExe> => {
    if (version !== null && !semver.valid(version)) throw new Error(`Invalid version string (${version})`);
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .get(`https://${apiBase}/launcher/get_latest_launcher`, {
        ...defaultSettings.ky,
        searchParams: {
          appcode: appCode,
          channel,
          sub_channel: subChannel,
          version: version ?? undefined,
          ta: targetApp,
        },
      })
      .json();
    const unwrapped = _unwrapProxyRsp(rsp, 'get_latest_launcher', 'get_latest_launcher_rsp');
    return unwrapped as TypesApiAkEndfield.LauncherLatestLauncherExe;
  },
  batchLatestGames: async (
    appCode: string,
    gameAppCodes: string[],
    channel: number,
    subChannel: number,
    version: string | null,
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherBatchLatestGame> => {
    if (version !== null && !semver.valid(version)) throw new Error(`Invalid version string (${version})`);
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .post(`https://${apiBase}/proxy/batch_proxy`, {
        ...defaultSettings.ky,
        json: {
          proxy_reqs: [
            {
              kind: 'batch_get_latest_game',
              batch_get_latest_game_req: {
                appcode: appCode,
                game_appcodes: gameAppCodes,
                channel,
                sub_channel: subChannel,
                version: version ?? undefined,
              },
            },
          ],
        },
      })
      .json();
    return (rsp as any).proxy_rsps[0].batch_get_latest_game_rsp as TypesApiAkEndfield.LauncherBatchLatestGame;
  },
  batchLauncherAction: async (
    appCode: string,
    gameAppCodes: string[],
    channel: number,
    subChannel: number,
    region: 'os' | 'cn',
  ): Promise<TypesApiAkEndfield.LauncherBatchLauncherAction> => {
    const apiBase =
      region === 'cn'
        ? appConfig.network.api.akEndfield.base.launcherCN
        : appConfig.network.api.akEndfield.base.launcher;
    const rsp = await ky
      .post(`https://${apiBase}/proxy/batch_proxy`, {
        ...defaultSettings.ky,
        json: {
          proxy_reqs: [
            {
              kind: 'batch_get_launcher_action',
              batch_get_launcher_action_req: {
                appcode: appCode,
                game_appcodes: gameAppCodes,
                channel,
                sub_channel: subChannel,
              },
            },
          ],
        },
      })
      .json();
    return (rsp as any).proxy_rsps[0].batch_get_launcher_action_rsp as TypesApiAkEndfield.LauncherBatchLauncherAction;
  },
  web: launcherWeb,
};
