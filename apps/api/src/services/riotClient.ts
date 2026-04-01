import { env } from '../config/env.js';
import { httpJson } from '../lib/http.js';
import type { RiotPlatform, RiotRegionalRoute } from '../lib/riotRouting.js';
import type { RiotAccount, RiotLeagueEntry, RiotMatch, RiotSummoner, RiotTimeline } from '../types/riot.js';

const headers = {
  'X-Riot-Token': env.RIOT_API_KEY
};

let requestQueue = Promise.resolve();
let lastRequestAt = 0;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scheduleRiotRequest<T>(task: () => Promise<T>) {
  const queuedTask = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestAt;
    const waitMs = Math.max(0, env.RIOT_REQUEST_DELAY_MS - elapsed);
    if (waitMs > 0) {
      await delay(waitMs);
    }

    lastRequestAt = Date.now();
    return task();
  });

  requestQueue = queuedTask.then(
    () => undefined,
    () => undefined
  );

  return queuedTask;
}

function buildBases(routing: { platform: RiotPlatform; regionalRoute: RiotRegionalRoute }) {
  return {
    accountBase: `https://${routing.regionalRoute}.api.riotgames.com`,
    platformBase: `https://${routing.platform}.api.riotgames.com`
  };
}

function riotJson<T>(url: string) {
  return scheduleRiotRequest(() =>
    httpJson<T>(
      url,
      { headers },
      {
        retries: env.RIOT_MAX_RETRIES,
        retryDelayMs: env.RIOT_REQUEST_DELAY_MS
      }
    )
  );
}

export function createRiotClient(routing: { platform: RiotPlatform; regionalRoute: RiotRegionalRoute }) {
  const { accountBase, platformBase } = buildBases(routing);

  return {
    getAccountByRiotId(gameName: string, tagLine: string) {
      return riotJson<RiotAccount>(`${accountBase}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
    },
    getMatchIdsByPuuid(puuid: string, count = env.MATCH_COUNT, start = 0) {
      return riotJson<string[]>(`${accountBase}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=${start}&count=${count}`);
    },
    getSummonerByPuuid(puuid: string) {
      return riotJson<RiotSummoner>(`${platformBase}/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`);
    },
    getLeagueEntriesByPuuid(puuid: string) {
      return riotJson<RiotLeagueEntry[]>(`${platformBase}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`);
    },
    getMatch(matchId: string) {
      return riotJson<RiotMatch>(`${accountBase}/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
    },
    getTimeline(matchId: string) {
      return riotJson<RiotTimeline>(`${accountBase}/lol/match/v5/matches/${encodeURIComponent(matchId)}/timeline`);
    },
    getMasteries(puuid: string) {
      return riotJson<unknown[]>(`${platformBase}/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(puuid)}`);
    }
  };
}
