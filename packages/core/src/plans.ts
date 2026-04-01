export type MembershipPlanId = 'free' | 'pro_player' | 'pro_coach';
export type MembershipStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive';

export interface PlanEntitlements {
  maxStoredProfiles: number;
  maxStoredMatchesPerProfile: number;
  maxCoachRoles: number;
  maxAICoachRunsPerMonth: number;
  maxPremiumAICoachRunsPerMonth: number;
  maxManagedPlayers: number;
  canUseAICoach: boolean;
  canUsePatchContext: boolean;
  canUseCoachWorkspace: boolean;
  canExportDeepHistory: boolean;
}

export interface MembershipPlanDefinition {
  id: MembershipPlanId;
  name: string;
  monthlyUsd: number;
  description: string;
  audience: string;
  badge: string;
  billing: {
    provider: 'stripe';
    stripeProductKey: string;
    stripePriceLookupKey: string;
  };
  entitlements: PlanEntitlements;
  featureHighlights: string[];
}

export const membershipPlanCatalog: Record<MembershipPlanId, MembershipPlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyUsd: 0,
    description: 'Ideal para probar Don Sosa Coach sin pagar, con límites reales pero útiles.',
    audience: 'Jugador casual o primera prueba del producto',
    badge: 'Base',
    billing: {
      provider: 'stripe',
      stripeProductKey: 'free',
      stripePriceLookupKey: 'don-sosa-free'
    },
    entitlements: {
      maxStoredProfiles: 2,
      maxStoredMatchesPerProfile: 30,
      maxCoachRoles: 1,
      maxAICoachRunsPerMonth: 6,
      maxPremiumAICoachRunsPerMonth: 0,
      maxManagedPlayers: 0,
      canUseAICoach: true,
      canUsePatchContext: true,
      canUseCoachWorkspace: false,
      canExportDeepHistory: false
    },
    featureHighlights: [
      'Hasta 30 partidas guardadas por perfil',
      'Hasta 2 perfiles guardados',
      'Coaching IA mensual limitado',
      '1 rol por bloque de coaching'
    ]
  },
  pro_player: {
    id: 'pro_player',
    name: 'Pro Player',
    monthlyUsd: 5,
    description: 'La versión completa del producto para un jugador que quiere mejorar de forma seria.',
    audience: 'Jugador que quiere coaching sostenido y profundidad real',
    badge: 'Completo',
    billing: {
      provider: 'stripe',
      stripeProductKey: 'pro_player',
      stripePriceLookupKey: 'don-sosa-pro-player-monthly'
    },
    entitlements: {
      maxStoredProfiles: 8,
      maxStoredMatchesPerProfile: 1000,
      maxCoachRoles: 2,
      maxAICoachRunsPerMonth: 60,
      maxPremiumAICoachRunsPerMonth: 16,
      maxManagedPlayers: 0,
      canUseAICoach: true,
      canUsePatchContext: true,
      canUseCoachWorkspace: false,
      canExportDeepHistory: true
    },
    featureHighlights: [
      'Hasta 1000 partidas guardadas por perfil',
      'Hasta 8 perfiles guardados',
      'Coaching IA con mucha más frecuencia',
      'Hasta 2 roles por bloque de coaching'
    ]
  },
  pro_coach: {
    id: 'pro_coach',
    name: 'Pro Coach',
    monthlyUsd: 20,
    description: 'Pensado para coaches que quieren seguir varios jugadores con la misma herramienta.',
    audience: 'Coach profesional o staff pequeño',
    badge: 'Coach',
    billing: {
      provider: 'stripe',
      stripeProductKey: 'pro_coach',
      stripePriceLookupKey: 'don-sosa-pro-coach-monthly'
    },
    entitlements: {
      maxStoredProfiles: 40,
      maxStoredMatchesPerProfile: 1000,
      maxCoachRoles: 2,
      maxAICoachRunsPerMonth: 240,
      maxPremiumAICoachRunsPerMonth: 80,
      maxManagedPlayers: 30,
      canUseAICoach: true,
      canUsePatchContext: true,
      canUseCoachWorkspace: true,
      canExportDeepHistory: true
    },
    featureHighlights: [
      'Workspace para coaches y roster de jugadores',
      'Hasta 30 jugadores gestionables',
      'Hasta 40 perfiles guardados',
      'Uso intensivo de coaching IA'
    ]
  }
};

export const membershipPlanOrder: MembershipPlanId[] = ['free', 'pro_player', 'pro_coach'];

export function getMembershipPlan(planId: MembershipPlanId) {
  return membershipPlanCatalog[planId];
}

export function isPaidMembershipPlan(planId: MembershipPlanId) {
  return membershipPlanCatalog[planId].monthlyUsd > 0;
}
