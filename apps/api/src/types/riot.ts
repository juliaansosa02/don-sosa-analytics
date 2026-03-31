export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface RiotSummoner {
  id?: string;
  accountId?: string;
  puuid: string;
  profileIconId: number;
  summonerLevel: number;
}

export interface RiotLeagueEntry {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  summonerId?: string;
  puuid?: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface RiotRuneSelection {
  perk: number;
  var1?: number;
  var2?: number;
  var3?: number;
}

export interface RiotParticipant {
  puuid: string;
  championName: string;
  teamPosition: string;
  lane: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  goldEarned: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  visionScore: number;
  win: boolean;
  challenges?: Record<string, number>;
  perks?: {
    statPerks?: Record<string, number>;
    styles?: Array<{
      style: number;
      selections: RiotRuneSelection[];
    }>;
  };
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  firstBloodKill?: boolean;
  firstTowerKill?: boolean;
  turretKills?: number;
  dragonKills?: number;
  baronKills?: number;
}

export interface RiotMatch {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    queueId: number;
    gameCreation: number;
    gameDuration: number;
    participants: RiotParticipant[];
  };
}

export interface RiotFrameParticipant {
  totalGold?: number;
  currentGold?: number;
  level?: number;
  minionsKilled?: number;
  jungleMinionsKilled?: number;
  xp?: number;
}

export interface RiotTimelineEvent {
  type: string;
  timestamp: number;
  killerId?: number;
  victimId?: number;
  participantId?: number;
  creatorId?: number;
  assistingParticipantIds?: number[];
  position?: { x: number; y: number };
}

export interface RiotTimeline {
  info: {
    frames: Array<{
      timestamp: number;
      participantFrames: Record<string, RiotFrameParticipant>;
      events: RiotTimelineEvent[];
    }>;
  };
}

export interface RuneNode {
  id: number;
  key: string;
  icon: string;
  name: string;
  shortDesc: string;
  longDesc: string;
  slots?: Array<{ runes: RuneNode[] }>;
}
