import type { CSSProperties, FormEvent } from 'react';
import { Badge } from '../../components/ui';
import type {
  AdminUserRecord,
  AuthMeResponse,
  CoachRosterEntry,
  MembershipCatalogResponse,
  MembershipMeResponse,
  SafeAuthUser,
  UserRole
} from '../../types';
import type { Locale } from '../../lib/i18n';
import { getRiotPlatformInfo, supportedRiotPlatforms } from '../../lib/lol';

export type AccountPanelTab = 'auth' | 'profile' | 'membership' | 'security' | 'coach' | 'admin';
export type AccountAuthMode = 'login' | 'signup' | 'reset';
type UpgradePlanId = 'pro_player' | 'pro_coach';
type DevPlanId = 'free' | UpgradePlanId;

interface AccountCenterProps {
  open: boolean;
  locale: Locale;
  authUser: SafeAuthUser | null;
  actorUser: SafeAuthUser | null;
  authMe: AuthMeResponse | null;
  currentPlan: MembershipMeResponse['plan'] | null;
  currentPlanPriceLabel: string | null;
  membership: MembershipMeResponse | null;
  membershipCatalog: MembershipCatalogResponse | null;
  billingReady: boolean;
  canOpenBillingPortal: boolean;
  canManageCoachRoster: boolean;
  isAdmin: boolean;
  accountPanelTab: AccountPanelTab;
  authMode: AccountAuthMode;
  authEmail: string;
  authPassword: string;
  authDisplayName: string;
  resetToken: string;
  newPassword: string;
  resetTokenPreview: string | null;
  resetLinkPreview: string | null;
  authActionLoading: boolean;
  membershipActionLoading: boolean;
  authError: string | null;
  membershipError: string | null;
  adminLoading: boolean;
  safeAdminUsers: AdminUserRecord[];
  coachRosterLoading: boolean;
  safeCoachRoster: CoachRosterEntry[];
  coachPlayerEmail: string;
  coachPlayerGameName: string;
  coachPlayerTagLine: string;
  coachPlayerPlatform: string;
  coachPlayerNote: string;
  onClose: () => void;
  onTabChange: (tab: AccountPanelTab) => void;
  onAuthModeChange: (mode: AccountAuthMode) => void;
  onAuthEmailChange: (value: string) => void;
  onAuthPasswordChange: (value: string) => void;
  onAuthDisplayNameChange: (value: string) => void;
  onResetTokenChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onCoachPlayerEmailChange: (value: string) => void;
  onCoachPlayerGameNameChange: (value: string) => void;
  onCoachPlayerTagLineChange: (value: string) => void;
  onCoachPlayerPlatformChange: (value: string) => void;
  onCoachPlayerNoteChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent) => Promise<void> | void;
  onResetPasswordConfirm: (event: FormEvent) => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  onPasswordChange: (event: FormEvent) => Promise<void> | void;
  onBillingPortal: () => Promise<void> | void;
  onCheckout: (planId: UpgradePlanId) => Promise<void> | void;
  onDevPlanChange: (planId: DevPlanId) => Promise<void> | void;
  onStopImpersonation: () => Promise<void> | void;
  onAddCoachPlayer: (mode: 'email' | 'riot') => Promise<void> | void;
  onRemoveCoachPlayer: (assignmentId: string) => Promise<void> | void;
  onAdminRoleChange: (userId: string, role: UserRole) => Promise<void> | void;
  onAdminPlanChange: (userId: string, planId: DevPlanId) => Promise<void> | void;
  onAdminImpersonation: (userId: string) => Promise<void> | void;
}

export function AccountCenter(props: AccountCenterProps) {
  if (!props.open) return null;

  const { locale, authUser, canManageCoachRoster, isAdmin, accountPanelTab } = props;
  const authTabs = [
    { id: 'auth', label: locale === 'en' ? 'Access' : 'Acceso' },
    { id: 'membership', label: locale === 'en' ? 'Plans' : 'Planes' }
  ] as const;
  const userTabs = [
    { id: 'profile' as const, label: locale === 'en' ? 'Profile' : 'Perfil' },
    { id: 'membership' as const, label: locale === 'en' ? 'Membership' : 'Membresía' },
    { id: 'security' as const, label: locale === 'en' ? 'Security' : 'Seguridad' },
    ...(canManageCoachRoster ? [{ id: 'coach' as const, label: locale === 'en' ? 'Coach workspace' : 'Espacio coach' }] : []),
    ...(isAdmin ? [{ id: 'admin' as const, label: locale === 'en' ? 'Admin tools' : 'Herramientas admin' }] : [])
  ];
  const availableTabs = authUser ? userTabs : authTabs;

  return (
    <section style={accountPanelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={sectionEyebrowStyle}>
            {authUser ? (locale === 'en' ? 'Account center' : 'Centro de cuenta') : (locale === 'en' ? 'Account access' : 'Acceso a cuenta')}
          </div>
          <div style={sectionTitleStyle}>
            {authUser
              ? (locale === 'en' ? 'Profile, membership and workspace' : 'Perfil, membresía y espacio de cuenta')
              : (locale === 'en' ? 'Login, membership and recovery' : 'Ingreso, membresía y recuperación')}
          </div>
          <div style={sectionBodyStyle}>
            {authUser
              ? (locale === 'en'
                ? 'Keep account actions here so the main product can stay focused on your League profile, coaching and analysis.'
                : 'Concentrá acá las acciones de cuenta para que el producto principal quede enfocado en tu perfil de League, el coaching y el análisis.')
              : (locale === 'en'
                ? 'Create a real account so your coaching, plans and billing history stay attached to you instead of only to this browser.'
                : 'Creá una cuenta real para que tu coaching, tus planes y tu historial de billing queden ligados a vos y no solo a este navegador.')}
          </div>
        </div>
        <button type="button" style={secondaryButtonStyle} onClick={props.onClose}>
          {locale === 'en' ? 'Close' : 'Cerrar'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => props.onTabChange(tab.id)}
            style={{ ...tabStyle, ...(accountPanelTab === tab.id ? activeTabStyle : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {renderAuthSection(props)}
      {renderProfileSection(props)}
      {renderMembershipSection(props)}
      {renderSecuritySection(props)}
      {renderCoachSection(props)}
      {renderAdminSection(props)}

      {props.authError ? <div style={softPanelStyle}>{props.authError}</div> : null}
      {props.membershipError ? <div style={softPanelStyle}>{props.membershipError}</div> : null}
    </section>
  );
}

function renderAuthSection(props: AccountCenterProps) {
  const {
    authUser,
    accountPanelTab,
    locale,
    authMode,
    authDisplayName,
    authEmail,
    authPassword,
    authActionLoading,
    resetToken,
    newPassword,
    resetTokenPreview,
    resetLinkPreview
  } = props;

  if (authUser || accountPanelTab !== 'auth') return null;

  return (
    <div className="two-col-grid" style={authPanelGridStyle}>
      <div style={panelCardStyle}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['login', 'signup', 'reset'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => props.onAuthModeChange(mode)}
              style={{ ...smallActionButtonStyle, ...(authMode === mode ? activeSmallActionButtonStyle : {}) }}
            >
              {mode === 'login'
                ? (locale === 'en' ? 'Login' : 'Ingresar')
                : mode === 'signup'
                  ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                  : (locale === 'en' ? 'Password recovery' : 'Recuperar contraseña')}
            </button>
          ))}
        </div>
        <form onSubmit={props.onAuthSubmit} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: authMode === 'signup' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {authMode === 'signup' ? (
              <label style={{ ...fieldBlockStyle, minWidth: 0 }}>
                <span style={fieldLabelStyle}>{locale === 'en' ? 'Display name' : 'Nombre visible'}</span>
                <input value={authDisplayName} onChange={(e) => props.onAuthDisplayNameChange(e.target.value)} style={inputStyle} placeholder={locale === 'en' ? 'For example, Don Sosa' : 'Por ejemplo, Don Sosa'} />
              </label>
            ) : null}
            <label style={{ ...fieldBlockStyle, minWidth: 0 }}>
              <span style={fieldLabelStyle}>Email</span>
              <input type="email" value={authEmail} onChange={(e) => props.onAuthEmailChange(e.target.value)} style={inputStyle} placeholder="vos@email.com" />
            </label>
            {authMode !== 'reset' ? (
              <label style={{ ...fieldBlockStyle, minWidth: 0 }}>
                <span style={fieldLabelStyle}>{locale === 'en' ? 'Password' : 'Contraseña'}</span>
                <input type="password" value={authPassword} onChange={(e) => props.onAuthPasswordChange(e.target.value)} style={inputStyle} placeholder="••••••••" />
              </label>
            ) : null}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" style={buttonStyle} disabled={authActionLoading}>
              {authActionLoading
                ? (locale === 'en' ? 'Processing...' : 'Procesando...')
                : authMode === 'login'
                  ? (locale === 'en' ? 'Log in' : 'Iniciar sesión')
                  : authMode === 'signup'
                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                    : (locale === 'en' ? 'Send recovery' : 'Enviar recuperación')}
            </button>
            <Badge tone="low">{locale === 'en' ? 'Your coaching and billing history will persist on your account' : 'Tu historial de coaching y billing quedará persistido en tu cuenta'}</Badge>
          </div>
        </form>
      </div>
      <div style={panelCardStyle}>
        <div style={panelTitleStyle}>{locale === 'en' ? 'Password recovery flow' : 'Flujo de recuperación de contraseña'}</div>
        <div style={panelBodyStyle}>
          {locale === 'en'
            ? '1. Request recovery with your email. 2. In production, use the email link. 3. In development, the token and direct link appear here so you can finish the full flow locally.'
            : '1. Pedí la recuperación con tu email. 2. En producción, seguí el link recibido. 3. En desarrollo, el token y el link directo aparecen acá para que puedas cerrar el flujo completo localmente.'}
        </div>
        <form onSubmit={props.onResetPasswordConfirm} style={{ display: 'grid', gap: 10 }}>
          <label style={{ ...fieldBlockStyle, minWidth: 0 }}>
            <span style={fieldLabelStyle}>{locale === 'en' ? 'Reset token' : 'Token de recuperación'}</span>
            <input value={resetToken} onChange={(e) => props.onResetTokenChange(e.target.value)} style={inputStyle} placeholder={locale === 'en' ? 'Paste the token here' : 'Pegá el token acá'} />
          </label>
          <label style={{ ...fieldBlockStyle, minWidth: 0 }}>
            <span style={fieldLabelStyle}>{locale === 'en' ? 'New password' : 'Nueva contraseña'}</span>
            <input type="password" value={newPassword} onChange={(e) => props.onNewPasswordChange(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="submit" style={secondaryButtonStyle} disabled={authActionLoading}>
              {authActionLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Apply new password' : 'Aplicar nueva contraseña')}
            </button>
            {resetTokenPreview ? <Badge tone="medium">{locale === 'en' ? 'Dev token ready' : 'Token dev listo'}</Badge> : null}
            {resetLinkPreview ? <Badge tone="low">{locale === 'en' ? 'Reset link ready' : 'Link de reset listo'}</Badge> : null}
          </div>
          {resetTokenPreview ? (
            <div style={statusPanelStyle}>
              {locale === 'en'
                ? 'The development token was generated and autofilled. You can use it as-is or replace it if you want to test the manual step too.'
                : 'El token de desarrollo se generó y quedó autocompletado. Podés usarlo así o reemplazarlo si querés probar también el paso manual.'}
            </div>
          ) : null}
          {resetLinkPreview ? (
            <div style={statusPanelStyle}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div>
                  {locale === 'en'
                    ? 'The recovery link is also ready. It opens the account center directly in reset mode.'
                    : 'El link de recuperación también quedó listo. Abre el centro de cuenta directamente en modo reset.'}
                </div>
                <a href={resetLinkPreview} style={{ color: '#dff8eb', wordBreak: 'break-all' }}>{resetLinkPreview}</a>
              </div>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

function renderProfileSection(props: AccountCenterProps) {
  const { authUser, accountPanelTab, locale, actorUser, membership, currentPlan, currentPlanPriceLabel, authMe, billingReady, canOpenBillingPortal, authActionLoading, membershipActionLoading } = props;
  if (!authUser || accountPanelTab !== 'profile') return null;

  return (
    <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <div style={panelCardStyle}>
        <div style={panelHeroTitleStyle}>{authUser.displayName}</div>
        <div style={{ color: '#8f9bad', fontSize: 13 }}>{authUser.email}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="default">{actorUser?.role.toUpperCase() ?? 'USER'}</Badge>
          <Badge tone="low">{currentPlan?.name ?? 'Free'}</Badge>
          {membership?.overrideReason === 'admin_full_access' ? <Badge tone="medium">{locale === 'en' ? 'Full admin access' : 'Acceso admin total'}</Badge> : null}
        </div>
        <div style={panelBodyStyle}>
          {locale === 'en'
            ? `${membership?.linkedProfiles.length ?? 0} saved profiles · ${membership?.usage.openaiGenerations ?? 0} AI runs this month`
            : `${membership?.linkedProfiles.length ?? 0} perfiles guardados · ${membership?.usage.openaiGenerations ?? 0} corridas IA este mes`}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" style={secondaryButtonStyle} disabled={authActionLoading} onClick={() => void props.onLogout()}>
            {authActionLoading ? (locale === 'en' ? 'Closing...' : 'Cerrando...') : (locale === 'en' ? 'Log out' : 'Cerrar sesión')}
          </button>
          {authMe?.isImpersonating ? (
            <button type="button" style={secondaryButtonStyle} disabled={authActionLoading} onClick={() => void props.onStopImpersonation()}>
              {locale === 'en' ? 'Stop impersonation' : 'Salir de la suplantación'}
            </button>
          ) : null}
        </div>
      </div>
      <div style={panelCardStyle}>
        <div style={panelTitleStyle}>{locale === 'en' ? 'Current membership' : 'Membresía actual'}</div>
        <div style={panelBodyStyle}>
          {membership
            ? (locale === 'en'
              ? `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} profiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} matches per profile`
              : `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} perfiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} partidas por perfil`)
            : (locale === 'en' ? 'Loading membership...' : 'Cargando membresía...')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {currentPlanPriceLabel ? <Badge tone="default">{currentPlanPriceLabel}</Badge> : null}
          {membership ? <Badge tone="low">{locale === 'en' ? `${membership.plan.entitlements.maxCoachRoles} coaching roles` : `${membership.plan.entitlements.maxCoachRoles} roles de coaching`}</Badge> : null}
        </div>
      </div>
      <div style={panelCardStyle}>
        <div style={panelTitleStyle}>{locale === 'en' ? 'Billing actions' : 'Acciones de billing'}</div>
        <div style={panelBodyStyle}>
          {billingReady
            ? (locale === 'en' ? 'Stripe is ready for upgrades, renewals and self-serve management.' : 'Stripe ya está listo para upgrades, renovaciones y autogestión.')
            : (locale === 'en' ? 'Billing is not configured yet for this environment.' : 'Billing todavía no está configurado para este entorno.')}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canOpenBillingPortal ? (
            <button type="button" style={secondaryButtonStyle} disabled={membershipActionLoading} onClick={() => void props.onBillingPortal()}>
              {membershipActionLoading ? (locale === 'en' ? 'Opening...' : 'Abriendo...') : (locale === 'en' ? 'Manage billing' : 'Gestionar billing')}
            </button>
          ) : (
            <Badge tone="default">{billingReady ? (locale === 'en' ? 'Stripe ready' : 'Stripe listo') : (locale === 'en' ? 'Stripe pending' : 'Stripe pendiente')}</Badge>
          )}
          <button type="button" style={secondaryButtonStyle} onClick={() => props.onTabChange('membership')}>
            {locale === 'en' ? 'See plans' : 'Ver planes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function renderMembershipSection(props: AccountCenterProps) {
  const { accountPanelTab, membershipCatalog, membership, locale, authUser, billingReady, membershipActionLoading } = props;
  if (accountPanelTab !== 'membership') return null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={planCardsGridStyle}>
        {membershipCatalog?.plans.map((plan) => {
          const isCurrent = membership?.plan.id === plan.id;
          const isActualSubscription = membership?.actualPlan?.id === plan.id;
          return (
            <div key={plan.id} style={{ ...planCardStyle, ...(isCurrent ? activePlanCardStyle : {}) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                <div style={{ display: 'grid', gap: 5 }}>
                  <div style={{ color: '#eef4ff', fontWeight: 800, fontSize: 16 }}>{plan.name}</div>
                  <div style={panelBodyStyle}>{plan.description}</div>
                </div>
                <Badge tone={isCurrent ? 'low' : 'default'}>{isCurrent ? (locale === 'en' ? 'Current' : 'Actual') : plan.badge}</Badge>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge tone="low">{plan.monthlyUsd === 0 ? (locale === 'en' ? 'Free' : 'Gratis') : (locale === 'en' ? `US$${plan.monthlyUsd}/month` : `US$${plan.monthlyUsd}/mes`)}</Badge>
                <Badge tone="default">{`${plan.entitlements.maxStoredMatchesPerProfile} ${locale === 'en' ? 'matches/profile' : 'partidas/perfil'}`}</Badge>
                <Badge tone="default">{`${plan.entitlements.maxStoredProfiles} ${locale === 'en' ? 'profiles' : 'perfiles'}`}</Badge>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {plan.featureHighlights.slice(0, 4).map((feature) => (
                  <div key={feature} style={{ color: '#d5dfef', fontSize: 13, lineHeight: 1.5 }}>• {feature}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {isCurrent ? (
                  <button type="button" style={lockedButtonStyle} disabled>
                    {locale === 'en' ? 'Current effective plan' : 'Plan efectivo actual'}
                  </button>
                ) : plan.id !== 'free' && authUser && billingReady ? (
                  <button type="button" style={buttonStyle} disabled={membershipActionLoading} onClick={() => void props.onCheckout(plan.id as UpgradePlanId)}>
                    {membershipActionLoading
                      ? (locale === 'en' ? 'Opening Stripe...' : 'Abriendo Stripe...')
                      : locale === 'en'
                        ? `Upgrade to ${plan.name}`
                        : `Mejorar a ${plan.name}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    disabled={!membership?.devToolsEnabled || membershipActionLoading || isCurrent}
                    onClick={() => void props.onDevPlanChange(plan.id as DevPlanId)}
                  >
                    {membership?.devToolsEnabled
                      ? (locale === 'en' ? 'Activate in dev' : 'Activar en dev')
                      : authUser
                        ? (billingReady ? (locale === 'en' ? 'Unavailable' : 'No disponible') : (locale === 'en' ? 'Billing pending' : 'Billing pendiente'))
                        : (locale === 'en' ? 'Login to upgrade' : 'Iniciá sesión para mejorar')}
                  </button>
                )}
                {isActualSubscription && membership?.overrideReason === 'admin_full_access' ? (
                  <Badge tone="medium">{locale === 'en' ? 'Underlying subscription' : 'Suscripción real'}</Badge>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderSecuritySection(props: AccountCenterProps) {
  if (!props.authUser || props.accountPanelTab !== 'security') return null;

  return (
    <form onSubmit={props.onPasswordChange} style={panelCardStyle}>
      <div style={panelTitleStyle}>{props.locale === 'en' ? 'Password' : 'Contraseña'}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        <input type="password" value={props.authPassword} onChange={(e) => props.onAuthPasswordChange(e.target.value)} style={inputStyle} placeholder={props.locale === 'en' ? 'Current password' : 'Contraseña actual'} />
        <input type="password" value={props.newPassword} onChange={(e) => props.onNewPasswordChange(e.target.value)} style={inputStyle} placeholder={props.locale === 'en' ? 'New password' : 'Nueva contraseña'} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="submit" style={secondaryButtonStyle} disabled={props.authActionLoading}>
          {props.authActionLoading ? (props.locale === 'en' ? 'Saving...' : 'Guardando...') : (props.locale === 'en' ? 'Change password' : 'Cambiar contraseña')}
        </button>
      </div>
    </form>
  );
}

function renderCoachSection(props: AccountCenterProps) {
  const {
    authUser,
    accountPanelTab,
    canManageCoachRoster,
    locale,
    coachRosterLoading,
    coachPlayerEmail,
    coachPlayerGameName,
    coachPlayerTagLine,
    coachPlayerPlatform,
    coachPlayerNote,
    safeCoachRoster,
    membership
  } = props;
  if (!authUser || accountPanelTab !== 'coach' || !canManageCoachRoster) return null;

  return (
    <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
      <form onSubmit={async (event) => { event.preventDefault(); await props.onAddCoachPlayer('email'); }} style={panelCardStyle}>
        <div style={panelTitleStyle}>{locale === 'en' ? 'Add by account email' : 'Agregar por email de cuenta'}</div>
        <div style={panelBodyStyle}>
          {locale === 'en'
            ? 'Use this when you know the player account and want the roster to follow the person, not just one Riot profile.'
            : 'Usalo cuando conocés la cuenta del jugador y querés que el roster siga a la persona, no solo a un perfil puntual.'}
        </div>
        <input type="email" value={coachPlayerEmail} onChange={(e) => props.onCoachPlayerEmailChange(e.target.value)} style={inputStyle} placeholder="player@email.com" />
        <textarea value={coachPlayerNote} onChange={(e) => props.onCoachPlayerNoteChange(e.target.value)} style={{ ...inputStyle, minHeight: 94, resize: 'vertical' }} placeholder={locale === 'en' ? 'Optional note about this player' : 'Nota opcional sobre este jugador'} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" style={buttonStyle} disabled={coachRosterLoading}>
            {coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Link account' : 'Vincular cuenta')}
          </button>
          <Badge tone="default">{locale === 'en' ? 'Person-level link' : 'Vínculo por persona'}</Badge>
        </div>
      </form>

      <form onSubmit={async (event) => { event.preventDefault(); await props.onAddCoachPlayer('riot'); }} style={panelCardStyle}>
        <div style={panelTitleStyle}>{locale === 'en' ? 'Add by Riot ID' : 'Agregar por Riot ID'}</div>
        <div style={panelBodyStyle}>
          {locale === 'en'
            ? 'Best when you do not have the email. If that Riot profile is already linked to a product account, we resolve it automatically.'
            : 'Ideal cuando no tenés el email. Si ese perfil Riot ya está ligado a una cuenta del producto, lo resolvemos automáticamente.'}
        </div>
        <input value={coachPlayerGameName} onChange={(e) => props.onCoachPlayerGameNameChange(e.target.value)} style={inputStyle} placeholder={locale === 'en' ? 'Game name' : 'Game name / nombre de invocador'} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, .8fr)', gap: 10 }}>
          <input value={coachPlayerTagLine} onChange={(e) => props.onCoachPlayerTagLineChange(e.target.value)} style={inputStyle} placeholder={locale === 'en' ? 'Tag line' : 'Tag'} />
          <select value={coachPlayerPlatform} onChange={(e) => props.onCoachPlayerPlatformChange(e.target.value)} style={selectStyle}>
            {supportedRiotPlatforms.map((platform) => (
              <option key={platform} value={platform}>
                {getRiotPlatformInfo(platform)?.shortLabel ?? platform}
              </option>
            ))}
          </select>
        </div>
        <textarea value={coachPlayerNote} onChange={(e) => props.onCoachPlayerNoteChange(e.target.value)} style={{ ...inputStyle, minHeight: 94, resize: 'vertical' }} placeholder={locale === 'en' ? 'Optional scouting or staff note' : 'Nota opcional de scouting o staff'} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" style={buttonStyle} disabled={coachRosterLoading}>
            {coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Track Riot ID' : 'Trackear Riot ID')}
          </button>
          <Badge tone="low">{locale === 'en' ? 'Profile-level tracking' : 'Tracking por perfil'}</Badge>
        </div>
      </form>

      <div style={{ ...panelCardStyle, alignContent: 'start' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start', flexWrap: 'wrap' }}>
          <div style={panelTitleStyle}>{locale === 'en' ? 'Current roster' : 'Roster actual'}</div>
          {membership ? <Badge tone="low">{`${safeCoachRoster.length}/${membership.plan.entitlements.maxManagedPlayers}`}</Badge> : null}
        </div>
        {coachRosterLoading ? <div style={panelBodyStyle}>{locale === 'en' ? 'Loading roster...' : 'Cargando roster...'}</div> : null}
        {!coachRosterLoading && !safeCoachRoster.length ? <div style={softPanelStyle}>{locale === 'en' ? 'No linked players yet.' : 'Todavía no hay jugadores vinculados.'}</div> : null}
        <div style={{ display: 'grid', gap: 10 }}>
          {safeCoachRoster.map((entry) => (
            <div key={entry.assignmentId} style={adminRowStyle}>
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ color: '#eef4ff', fontWeight: 700 }}>
                  {entry.user?.displayName ?? `${entry.profile?.gameName ?? '—'}#${entry.profile?.tagLine ?? '—'}`}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone={entry.targetType === 'account' ? 'default' : 'medium'}>
                    {entry.targetType === 'account'
                      ? (locale === 'en' ? 'Account link' : 'Vínculo de cuenta')
                      : (locale === 'en' ? 'Riot profile' : 'Perfil Riot')}
                  </Badge>
                  {entry.profile ? <Badge tone="low">{`${entry.profile.gameName}#${entry.profile.tagLine} · ${entry.profile.platform}`}</Badge> : null}
                </div>
                {entry.user?.email ? <div style={{ color: '#8f9bad', fontSize: 12 }}>{entry.user.email}</div> : null}
                {entry.note ? <div style={{ color: '#cdd8ea', fontSize: 13 }}>{entry.note}</div> : null}
              </div>
              <button type="button" style={secondaryButtonStyle} disabled={coachRosterLoading} onClick={() => void props.onRemoveCoachPlayer(entry.assignmentId)}>
                {locale === 'en' ? 'Remove' : 'Quitar'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderAdminSection(props: AccountCenterProps) {
  const { authUser, accountPanelTab, isAdmin, adminLoading, safeAdminUsers, locale, membershipCatalog, authMe } = props;
  if (!authUser || accountPanelTab !== 'admin' || !isAdmin) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {adminLoading ? <div style={softPanelStyle}>{locale === 'en' ? 'Loading users...' : 'Cargando usuarios...'}</div> : null}
      {!adminLoading && !safeAdminUsers.length ? <div style={softPanelStyle}>{locale === 'en' ? 'No users available yet.' : 'Todavía no hay usuarios disponibles.'}</div> : null}
      {safeAdminUsers.map((entry) => (
        <div key={entry.user.id} style={adminUserCardStyle}>
          <div style={{ display: 'grid', gap: 4 }}>
            <div style={{ color: '#eef4ff', fontWeight: 800 }}>{entry.user.displayName}</div>
            <div style={{ color: '#8f9bad', fontSize: 12 }}>{entry.user.email}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge tone="default">{entry.user.role.toUpperCase()}</Badge>
              <Badge tone="low">{entry.membership.plan.name}</Badge>
              <Badge tone="low">{locale === 'en' ? `${entry.usage.openaiGenerations} AI` : `${entry.usage.openaiGenerations} IA`}</Badge>
              <Badge tone="default">{entry.membership.account.status}</Badge>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <select defaultValue={entry.user.role} style={selectStyle} onChange={(event) => void props.onAdminRoleChange(entry.user.id, event.target.value as UserRole)}>
                <option value="user">user</option>
                <option value="coach">coach</option>
                <option value="admin">admin</option>
              </select>
              <select defaultValue={entry.membership.actualPlan?.id ?? entry.membership.plan.id} style={selectStyle} onChange={(event) => void props.onAdminPlanChange(entry.user.id, event.target.value as DevPlanId)}>
                {membershipCatalog?.order.map((planId) => {
                  const plan = membershipCatalog.plans.find((item) => item.id === planId);
                  return <option key={planId} value={planId}>{plan?.name ?? planId}</option>;
                })}
              </select>
            </div>
            {authMe?.isImpersonating && authMe.actorUser?.id === entry.user.id ? null : (
              <button type="button" style={secondaryButtonStyle} onClick={() => void props.onAdminImpersonation(entry.user.id)}>
                {locale === 'en' ? 'Impersonate' : 'Suplantar'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

const sectionEyebrowStyle: CSSProperties = {
  color: '#8da0ba',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const sectionTitleStyle: CSSProperties = {
  color: '#eef4ff',
  fontSize: 22,
  fontWeight: 800
};

const sectionBodyStyle: CSSProperties = {
  color: '#8f9bad',
  fontSize: 13,
  lineHeight: 1.6,
  maxWidth: 720
};

const panelTitleStyle: CSSProperties = {
  color: '#eef4ff',
  fontWeight: 800,
  fontSize: 16
};

const panelHeroTitleStyle: CSSProperties = {
  color: '#eef4ff',
  fontWeight: 800,
  fontSize: 18
};

const panelBodyStyle: CSSProperties = {
  color: '#8f9bad',
  fontSize: 13,
  lineHeight: 1.6
};

const accountPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: '20px 22px',
  borderRadius: 22,
  background: 'linear-gradient(180deg, rgba(11,15,24,0.98), rgba(5,8,14,0.99))',
  border: '1px solid rgba(255,255,255,0.07)',
  boxShadow: '0 28px 70px rgba(0,0,0,0.2)'
};

const authPanelGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.1fr .9fr',
  gap: 12
};

const panelCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '16px 16px 18px',
  borderRadius: 18,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.06)',
  alignContent: 'start'
};

const planCardsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: 12
};

const planCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '16px 16px 18px',
  borderRadius: 18,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.06)'
};

const activePlanCardStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(216,253,241,0.08), rgba(12,18,27,0.98))',
  borderColor: 'rgba(216,253,241,0.18)'
};

const lockedButtonStyle: CSSProperties = {
  border: '1px solid rgba(216,253,241,0.18)',
  padding: '10px 12px',
  borderRadius: 12,
  background: 'rgba(216,253,241,0.08)',
  color: '#d7f9ea',
  fontWeight: 800,
  cursor: 'not-allowed'
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,11,18,0.92)',
  color: '#edf2ff',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};

const selectStyle: CSSProperties = {
  ...inputStyle
};

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(216,253,241,0.12)',
  padding: '12px 18px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, #d8fdf1, #b8f4df)',
  color: '#07111f',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 28px rgba(87, 209, 162, 0.18)'
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px 18px',
  borderRadius: 14,
  background: '#0a0f18',
  color: '#e8eef9',
  fontWeight: 700,
  cursor: 'pointer'
};

const smallActionButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '9px 12px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.02)',
  color: '#9fb0c7',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer'
};

const activeSmallActionButtonStyle: CSSProperties = {
  background: 'rgba(216,253,241,0.08)',
  color: '#e9fff7',
  borderColor: 'rgba(216,253,241,0.2)'
};

const tabStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '10px 14px',
  borderRadius: 999,
  background: '#070b12',
  color: '#d7e3f5',
  cursor: 'pointer',
  textAlign: 'center'
};

const activeTabStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(49,55,86,0.95), rgba(16,23,35,1))',
  borderColor: 'rgba(216,253,241,0.2)',
  color: '#ffffff'
};

const adminUserCardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.15fr) minmax(240px, 0.85fr)',
  gap: 14,
  alignItems: 'start',
  padding: '14px 15px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.06)'
};

const adminRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'start',
  padding: '12px 13px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.02)',
  border: '1px solid rgba(255,255,255,0.05)'
};

const statusPanelStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 16,
  border: '1px solid rgba(216,253,241,0.12)',
  background: 'rgba(14, 35, 29, 0.6)',
  color: '#d9f8eb',
  lineHeight: 1.6
};

const fieldBlockStyle: CSSProperties = {
  display: 'grid',
  gap: 7
};

const fieldLabelStyle: CSSProperties = {
  color: '#8da0ba',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const softPanelStyle: CSSProperties = {
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#d8e5f8',
  lineHeight: 1.6
};
