import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge } from '../../components/ui';
import { getRiotPlatformInfo, supportedRiotPlatforms } from '../../lib/lol';
export function AccountCenter(props) {
    if (!props.open)
        return null;
    const { locale, authUser, canManageCoachRoster, isAdmin, accountPanelTab } = props;
    const linkedProfilesCount = props.membership?.linkedProfiles.length ?? 0;
    const aiRunsCount = props.membership?.usage.openaiGenerations ?? 0;
    const authTabs = [
        { id: 'auth', label: locale === 'en' ? 'Access' : 'Acceso' },
        { id: 'membership', label: locale === 'en' ? 'Plans' : 'Planes' }
    ];
    const userTabs = [
        { id: 'profile', label: locale === 'en' ? 'Account base' : 'Base de cuenta' },
        { id: 'membership', label: locale === 'en' ? 'Plan' : 'Plan' },
        { id: 'security', label: locale === 'en' ? 'Security' : 'Seguridad' },
        ...(canManageCoachRoster ? [{ id: 'coach', label: locale === 'en' ? 'Coach desk' : 'Mesa coach' }] : []),
        ...(isAdmin ? [{ id: 'admin', label: locale === 'en' ? 'Admin tools' : 'Herramientas admin' }] : [])
    ];
    const availableTabs = authUser ? userTabs : authTabs;
    return (_jsxs("section", { style: accountPanelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: sectionEyebrowStyle, children: authUser ? (locale === 'en' ? 'Product account' : 'Cuenta del producto') : (locale === 'en' ? 'Account access' : 'Acceso a cuenta') }), _jsx("div", { style: sectionTitleStyle, children: authUser
                                    ? (locale === 'en' ? 'Your competitive base behind the dashboard' : 'La base competitiva detrás del dashboard')
                                    : (locale === 'en' ? 'Save your progress under a real account' : 'Guardá tu progreso en una cuenta real') }), _jsx("div", { style: sectionBodyStyle, children: authUser
                                    ? (locale === 'en'
                                        ? 'This is where your product account, plan continuity, saved profiles and security live. The player-facing dashboard stays clean because the base is organized here.'
                                        : 'Acá viven tu cuenta del producto, la continuidad del plan, los perfiles guardados y la seguridad. El dashboard del jugador se mantiene limpio porque la base se ordena acá.')
                                    : (locale === 'en'
                                        ? 'Create a real account so your saved profiles, coaching history and plan state stay with you across browsers and sessions.'
                                        : 'Creá una cuenta real para que tus perfiles guardados, tu historial de coaching y el estado de tu plan te sigan entre navegadores y sesiones.') })] }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: props.onClose, children: locale === 'en' ? 'Close' : 'Cerrar' })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: availableTabs.map((tab) => (_jsx("button", { type: "button", onClick: () => props.onTabChange(tab.id), style: { ...tabStyle, ...(accountPanelTab === tab.id ? activeTabStyle : {}) }, children: tab.label }, tab.id))) }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: authUser
                    ? (_jsxs(_Fragment, { children: [_jsx(Badge, { tone: "default", children: props.currentPlan?.name ?? 'Free' }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${linkedProfilesCount} saved profiles` : `${linkedProfilesCount} perfiles guardados` }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${aiRunsCount} AI reads this month` : `${aiRunsCount} lecturas IA este mes` })] }))
                    : (_jsxs(_Fragment, { children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? 'Sync profiles across sessions' : 'Sincronizá perfiles entre sesiones' }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Keep plan and billing history attached to you' : 'Mantené tu plan y tu historial ligados a vos' })] })) }), renderAuthSection(props), renderProfileSection(props), renderMembershipSection(props), renderSecuritySection(props), renderCoachSection(props), renderAdminSection(props), props.authError ? _jsx("div", { style: softPanelStyle, children: props.authError }) : null, props.membershipError ? _jsx("div", { style: softPanelStyle, children: props.membershipError }) : null] }));
}
function renderAuthSection(props) {
    const { authUser, accountPanelTab, locale, authMode, authDisplayName, authEmail, authPassword, authActionLoading, resetToken, newPassword, resetTokenPreview, resetLinkPreview } = props;
    if (authUser || accountPanelTab !== 'auth')
        return null;
    return (_jsxs("div", { className: "two-col-grid", style: authPanelGridStyle, children: [_jsxs("div", { style: panelCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: panelTitleStyle, children: authMode === 'login'
                                    ? (locale === 'en' ? 'Recover your account base' : 'Recuperá tu base de cuenta')
                                    : authMode === 'signup'
                                        ? (locale === 'en' ? 'Create your competitive account' : 'Creá tu cuenta competitiva')
                                        : (locale === 'en' ? 'Start recovery' : 'Empezá la recuperación') }), _jsx("div", { style: panelBodyStyle, children: authMode === 'login'
                                    ? (locale === 'en' ? 'Sign in to reopen your saved profiles, plan state and coaching history.' : 'Iniciá sesión para reabrir tus perfiles guardados, el estado del plan y tu historial de coaching.')
                                    : authMode === 'signup'
                                        ? (locale === 'en' ? 'A real account turns this browser experience into a persistent competitive base.' : 'Una cuenta real convierte esta experiencia del navegador en una base competitiva persistente.')
                                        : (locale === 'en' ? 'Request the recovery link with your email and finish the reset here if you are testing locally.' : 'Pedí el link de recuperación con tu email y terminá el reset acá si estás probando localmente.') })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: ['login', 'signup', 'reset'].map((mode) => (_jsx("button", { type: "button", onClick: () => props.onAuthModeChange(mode), style: { ...smallActionButtonStyle, ...(authMode === mode ? activeSmallActionButtonStyle : {}) }, children: mode === 'login'
                                ? (locale === 'en' ? 'Login' : 'Ingresar')
                                : mode === 'signup'
                                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                    : (locale === 'en' ? 'Password recovery' : 'Recuperar contraseña') }, mode))) }), _jsxs("form", { onSubmit: props.onAuthSubmit, style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: authMode === 'signup' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: 10 }, children: [authMode === 'signup' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Display name' : 'Nombre visible' }), _jsx("input", { value: authDisplayName, onChange: (e) => props.onAuthDisplayNameChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'For example, Don Sosa' : 'Por ejemplo, Don Sosa' })] })) : null, _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: "Email" }), _jsx("input", { type: "email", value: authEmail, onChange: (e) => props.onAuthEmailChange(e.target.value), style: inputStyle, placeholder: "vos@email.com" })] }), authMode !== 'reset' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Password' : 'Contraseña' }), _jsx("input", { type: "password", value: authPassword, onChange: (e) => props.onAuthPasswordChange(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: authActionLoading, children: authActionLoading
                                            ? (locale === 'en' ? 'Processing...' : 'Procesando...')
                                            : authMode === 'login'
                                                ? (locale === 'en' ? 'Log in' : 'Iniciar sesión')
                                                : authMode === 'signup'
                                                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                                    : (locale === 'en' ? 'Send recovery' : 'Enviar recuperación') }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Profiles, coaching and plan history stay attached to you' : 'Perfiles, coaching e historial del plan quedan ligados a vos' })] })] })] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Recovery and continuity' : 'Recuperación y continuidad' }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? '1. Request the recovery with your email. 2. In production, continue from the mailbox link. 3. In development, the token and direct link appear here so you can close the full loop locally.'
                            : '1. Pedí la recuperación con tu email. 2. En producción, seguí el link del correo. 3. En desarrollo, el token y el link directo aparecen acá para cerrar el flujo completo en local.' }), _jsxs("form", { onSubmit: props.onResetPasswordConfirm, style: { display: 'grid', gap: 10 }, children: [_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Reset token' : 'Token de recuperación' }), _jsx("input", { value: resetToken, onChange: (e) => props.onResetTokenChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Paste the token here' : 'Pegá el token acá' })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'New password' : 'Nueva contraseña' }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => props.onNewPasswordChange(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: secondaryButtonStyle, disabled: authActionLoading, children: authActionLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Apply new password' : 'Aplicar nueva contraseña') }), resetTokenPreview ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Dev token ready' : 'Token dev listo' }) : null, resetLinkPreview ? _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Reset link ready' : 'Link de reset listo' }) : null] }), resetTokenPreview ? (_jsx("div", { style: statusPanelStyle, children: locale === 'en'
                                    ? 'The development token was generated and autofilled. You can use it as-is or replace it if you want to test the manual step too.'
                                    : 'El token de desarrollo se generó y quedó autocompletado. Podés usarlo así o reemplazarlo si querés probar también el paso manual.' })) : null, resetLinkPreview ? (_jsx("div", { style: statusPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: locale === 'en'
                                                ? 'The recovery link is also ready. It opens the account center directly in reset mode.'
                                                : 'El link de recuperación también quedó listo. Abre el centro de cuenta directamente en modo reset.' }), _jsx("a", { href: resetLinkPreview, style: { color: '#dff8eb', wordBreak: 'break-all' }, children: resetLinkPreview })] }) })) : null] })] })] }));
}
function renderProfileSection(props) {
    const { authUser, accountPanelTab, locale, actorUser, membership, currentPlan, currentPlanPriceLabel, authMe, billingReady, canOpenBillingPortal, authActionLoading, membershipActionLoading } = props;
    if (!authUser || accountPanelTab !== 'profile')
        return null;
    const linkedProfilesCount = membership?.linkedProfiles.length ?? 0;
    const aiRunsCount = membership?.usage.openaiGenerations ?? 0;
    return (_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.05fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("div", { style: accountHeroCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: sectionEyebrowStyle, children: locale === 'en' ? 'Account identity' : 'Identidad de cuenta' }), _jsx("div", { style: panelHeroTitleStyle, children: authUser.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13 }, children: authUser.email })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: actorUser?.role.toUpperCase() ?? 'USER' }), _jsx(Badge, { tone: "low", children: currentPlan?.name ?? 'Free' }), membership?.overrideReason === 'admin_full_access' ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Full admin access' : 'Acceso admin total' }) : null] }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? 'This account is the persistent layer behind your saved League profiles, coaching continuity and membership state.'
                            : 'Esta cuenta es la capa persistente detrás de tus perfiles guardados de League, la continuidad del coaching y el estado de la membresía.' }), _jsxs("div", { style: accountMiniStatsGridStyle, children: [_jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'Saved profiles' : 'Perfiles guardados' }), _jsx("div", { style: miniStatValueStyle, children: linkedProfilesCount })] }), _jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'AI reads' : 'Lecturas IA' }), _jsx("div", { style: miniStatValueStyle, children: aiRunsCount })] }), _jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'Plan state' : 'Estado del plan' }), _jsx("div", { style: miniStatValueStyle, children: membership?.account.status ?? (locale === 'en' ? 'Loading' : 'Cargando') })] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: () => void props.onLogout(), children: authActionLoading ? (locale === 'en' ? 'Closing...' : 'Cerrando...') : (locale === 'en' ? 'Log out' : 'Cerrar sesión') }), authMe?.isImpersonating ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: () => void props.onStopImpersonation(), children: locale === 'en' ? 'Stop impersonation' : 'Salir de la suplantación' })) : null] })] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Membership capacity' : 'Capacidad de membresía' }), _jsx("div", { style: panelBodyStyle, children: membership
                            ? (locale === 'en'
                                ? `${membership.account.status} account · ${membership.plan.entitlements.maxStoredProfiles} saved profiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} matches per profile`
                                : `Cuenta ${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} perfiles guardados · ${membership.plan.entitlements.maxStoredMatchesPerProfile} partidas por perfil`)
                            : (locale === 'en' ? 'Loading membership...' : 'Cargando membresía...') }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [currentPlanPriceLabel ? _jsx(Badge, { tone: "default", children: currentPlanPriceLabel }) : null, membership ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${membership.plan.entitlements.maxCoachRoles} coaching roles` : `${membership.plan.entitlements.maxCoachRoles} roles de coaching` }) : null] }), membership ? (_jsxs("div", { style: accountMiniStatsGridStyle, children: [_jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'Profiles' : 'Perfiles' }), _jsx("div", { style: miniStatValueStyle, children: membership.plan.entitlements.maxStoredProfiles })] }), _jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'Matches/profile' : 'Partidas/perfil' }), _jsx("div", { style: miniStatValueStyle, children: membership.plan.entitlements.maxStoredMatchesPerProfile })] }), _jsxs("div", { style: accountMiniStatStyle, children: [_jsx("div", { style: miniStatLabelStyle, children: locale === 'en' ? 'Managed players' : 'Jugadores gestionados' }), _jsx("div", { style: miniStatValueStyle, children: membership.plan.entitlements.maxManagedPlayers })] })] })) : null] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Plan and billing actions' : 'Acciones de plan y billing' }), _jsx("div", { style: panelBodyStyle, children: billingReady
                            ? (locale === 'en' ? 'Open the billing portal for upgrades, renewals and self-serve plan management.' : 'Abrí el portal de billing para upgrades, renovaciones y autogestión del plan.')
                            : (locale === 'en' ? 'Billing is not configured yet for this environment.' : 'Billing todavía no está configurado para este entorno.') }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [canOpenBillingPortal ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: membershipActionLoading, onClick: () => void props.onBillingPortal(), children: membershipActionLoading ? (locale === 'en' ? 'Opening...' : 'Abriendo...') : (locale === 'en' ? 'Manage plan' : 'Gestionar plan') })) : (_jsx(Badge, { tone: "default", children: billingReady ? (locale === 'en' ? 'Stripe ready' : 'Stripe listo') : (locale === 'en' ? 'Stripe pending' : 'Stripe pendiente') })), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => props.onTabChange('membership'), children: locale === 'en' ? 'Compare plans' : 'Comparar planes' })] })] })] }));
}
function renderMembershipSection(props) {
    const { accountPanelTab, membershipCatalog, membership, locale, authUser, billingReady, membershipActionLoading } = props;
    if (accountPanelTab !== 'membership')
        return null;
    return (_jsx("div", { style: { display: 'grid', gap: 12 }, children: _jsx("div", { style: planCardsGridStyle, children: membershipCatalog?.plans.map((plan) => {
                const isCurrent = membership?.plan.id === plan.id;
                const isActualSubscription = membership?.actualPlan?.id === plan.id;
                return (_jsxs("div", { style: { ...planCardStyle, ...(isCurrent ? activePlanCardStyle : {}) }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 800, fontSize: 16 }, children: plan.name }), _jsx("div", { style: panelBodyStyle, children: plan.description })] }), _jsx(Badge, { tone: isCurrent ? 'low' : 'default', children: isCurrent ? (locale === 'en' ? 'Current' : 'Actual') : plan.badge })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "low", children: plan.monthlyUsd === 0 ? (locale === 'en' ? 'Free' : 'Gratis') : (locale === 'en' ? `US$${plan.monthlyUsd}/month` : `US$${plan.monthlyUsd}/mes`) }), _jsx(Badge, { tone: "default", children: `${plan.entitlements.maxStoredMatchesPerProfile} ${locale === 'en' ? 'matches/profile' : 'partidas/perfil'}` }), _jsx(Badge, { tone: "default", children: `${plan.entitlements.maxStoredProfiles} ${locale === 'en' ? 'profiles' : 'perfiles'}` })] }), _jsx("div", { style: { display: 'grid', gap: 6 }, children: plan.featureHighlights.slice(0, 4).map((feature) => (_jsxs("div", { style: { color: '#d5dfef', fontSize: 13, lineHeight: 1.5 }, children: ["\u2022 ", feature] }, feature))) }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [isCurrent ? (_jsx("button", { type: "button", style: lockedButtonStyle, disabled: true, children: locale === 'en' ? 'Current effective plan' : 'Plan efectivo actual' })) : plan.id !== 'free' && authUser && billingReady ? (_jsx("button", { type: "button", style: buttonStyle, disabled: membershipActionLoading, onClick: () => void props.onCheckout(plan.id), children: membershipActionLoading
                                        ? (locale === 'en' ? 'Opening Stripe...' : 'Abriendo Stripe...')
                                        : locale === 'en'
                                            ? `Upgrade to ${plan.name}`
                                            : `Mejorar a ${plan.name}` })) : (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: !membership?.devToolsEnabled || membershipActionLoading || isCurrent, onClick: () => void props.onDevPlanChange(plan.id), children: membership?.devToolsEnabled
                                        ? (locale === 'en' ? 'Activate in dev' : 'Activar en dev')
                                        : authUser
                                            ? (billingReady ? (locale === 'en' ? 'Unavailable' : 'No disponible') : (locale === 'en' ? 'Billing pending' : 'Billing pendiente'))
                                            : (locale === 'en' ? 'Login to upgrade' : 'Iniciá sesión para mejorar') })), isActualSubscription && membership?.overrideReason === 'admin_full_access' ? (_jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Underlying subscription' : 'Suscripción real' })) : null] })] }, plan.id));
            }) }) }));
}
function renderSecuritySection(props) {
    if (!props.authUser || props.accountPanelTab !== 'security')
        return null;
    return (_jsxs("form", { onSubmit: props.onPasswordChange, style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: props.locale === 'en' ? 'Password' : 'Contraseña' }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("input", { type: "password", value: props.authPassword, onChange: (e) => props.onAuthPasswordChange(e.target.value), style: inputStyle, placeholder: props.locale === 'en' ? 'Current password' : 'Contraseña actual' }), _jsx("input", { type: "password", value: props.newPassword, onChange: (e) => props.onNewPasswordChange(e.target.value), style: inputStyle, placeholder: props.locale === 'en' ? 'New password' : 'Nueva contraseña' })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: _jsx("button", { type: "submit", style: secondaryButtonStyle, disabled: props.authActionLoading, children: props.authActionLoading ? (props.locale === 'en' ? 'Saving...' : 'Guardando...') : (props.locale === 'en' ? 'Change password' : 'Cambiar contraseña') }) })] }));
}
function renderCoachSection(props) {
    const { authUser, accountPanelTab, canManageCoachRoster, locale, coachRosterLoading, coachPlayerEmail, coachPlayerGameName, coachPlayerTagLine, coachPlayerPlatform, coachPlayerNote, safeCoachRoster, membership } = props;
    if (!authUser || accountPanelTab !== 'coach' || !canManageCoachRoster)
        return null;
    return (_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("form", { onSubmit: async (event) => { event.preventDefault(); await props.onAddCoachPlayer('email'); }, style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Add by account email' : 'Agregar por email de cuenta' }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? 'Use this when you know the player account and want the roster to follow the person, not just one Riot profile.'
                            : 'Usalo cuando conocés la cuenta del jugador y querés que el roster siga a la persona, no solo a un perfil puntual.' }), _jsx("input", { type: "email", value: coachPlayerEmail, onChange: (e) => props.onCoachPlayerEmailChange(e.target.value), style: inputStyle, placeholder: "player@email.com" }), _jsx("textarea", { value: coachPlayerNote, onChange: (e) => props.onCoachPlayerNoteChange(e.target.value), style: { ...inputStyle, minHeight: 94, resize: 'vertical' }, placeholder: locale === 'en' ? 'Optional note about this player' : 'Nota opcional sobre este jugador' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: coachRosterLoading, children: coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Link account' : 'Vincular cuenta') }), _jsx(Badge, { tone: "default", children: locale === 'en' ? 'Person-level link' : 'Vínculo por persona' })] })] }), _jsxs("form", { onSubmit: async (event) => { event.preventDefault(); await props.onAddCoachPlayer('riot'); }, style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Add by Riot ID' : 'Agregar por Riot ID' }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? 'Best when you do not have the email. If that Riot profile is already linked to a product account, we resolve it automatically.'
                            : 'Ideal cuando no tenés el email. Si ese perfil Riot ya está ligado a una cuenta del producto, lo resolvemos automáticamente.' }), _jsx("input", { value: coachPlayerGameName, onChange: (e) => props.onCoachPlayerGameNameChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Game name' : 'Game name / nombre de invocador' }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(120px, .8fr)', gap: 10 }, children: [_jsx("input", { value: coachPlayerTagLine, onChange: (e) => props.onCoachPlayerTagLineChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Tag line' : 'Tag' }), _jsx("select", { value: coachPlayerPlatform, onChange: (e) => props.onCoachPlayerPlatformChange(e.target.value), style: selectStyle, children: supportedRiotPlatforms.map((platform) => (_jsx("option", { value: platform, children: getRiotPlatformInfo(platform)?.shortLabel ?? platform }, platform))) })] }), _jsx("textarea", { value: coachPlayerNote, onChange: (e) => props.onCoachPlayerNoteChange(e.target.value), style: { ...inputStyle, minHeight: 94, resize: 'vertical' }, placeholder: locale === 'en' ? 'Optional scouting or staff note' : 'Nota opcional de scouting o staff' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: coachRosterLoading, children: coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Track Riot ID' : 'Trackear Riot ID') }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Profile-level tracking' : 'Tracking por perfil' })] })] }), _jsxs("div", { style: { ...panelCardStyle, alignContent: 'start' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Current roster' : 'Roster actual' }), membership ? _jsx(Badge, { tone: "low", children: `${safeCoachRoster.length}/${membership.plan.entitlements.maxManagedPlayers}` }) : null] }), coachRosterLoading ? _jsx("div", { style: panelBodyStyle, children: locale === 'en' ? 'Loading roster...' : 'Cargando roster...' }) : null, !coachRosterLoading && !safeCoachRoster.length ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'No linked players yet.' : 'Todavía no hay jugadores vinculados.' }) : null, _jsx("div", { style: { display: 'grid', gap: 10 }, children: safeCoachRoster.map((entry) => (_jsxs("div", { style: adminRowStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: entry.user?.displayName ?? `${entry.profile?.gameName ?? '—'}#${entry.profile?.tagLine ?? '—'}` }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: entry.targetType === 'account' ? 'default' : 'medium', children: entry.targetType === 'account'
                                                        ? (locale === 'en' ? 'Account link' : 'Vínculo de cuenta')
                                                        : (locale === 'en' ? 'Riot profile' : 'Perfil Riot') }), entry.profile ? _jsx(Badge, { tone: "low", children: `${entry.profile.gameName}#${entry.profile.tagLine} · ${entry.profile.platform}` }) : null] }), entry.user?.email ? _jsx("div", { style: { color: '#8f9bad', fontSize: 12 }, children: entry.user.email }) : null, entry.note ? _jsx("div", { style: { color: '#cdd8ea', fontSize: 13 }, children: entry.note }) : null] }), _jsx("button", { type: "button", style: secondaryButtonStyle, disabled: coachRosterLoading, onClick: () => void props.onRemoveCoachPlayer(entry.assignmentId), children: locale === 'en' ? 'Remove' : 'Quitar' })] }, entry.assignmentId))) })] })] }));
}
function renderAdminSection(props) {
    const { authUser, accountPanelTab, isAdmin, adminLoading, safeAdminUsers, locale, membershipCatalog, authMe } = props;
    if (!authUser || accountPanelTab !== 'admin' || !isAdmin)
        return null;
    return (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [adminLoading ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'Loading users...' : 'Cargando usuarios...' }) : null, !adminLoading && !safeAdminUsers.length ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'No users available yet.' : 'Todavía no hay usuarios disponibles.' }) : null, safeAdminUsers.map((entry) => (_jsxs("div", { style: adminUserCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 800 }, children: entry.user.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 12 }, children: entry.user.email }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: entry.user.role.toUpperCase() }), _jsx(Badge, { tone: "low", children: entry.membership.plan.name }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${entry.usage.openaiGenerations} AI` : `${entry.usage.openaiGenerations} IA` }), _jsx(Badge, { tone: "default", children: entry.membership.account.status })] })] }), _jsxs("div", { style: { display: 'grid', gap: 8, justifyItems: 'end' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }, children: [_jsxs("select", { defaultValue: entry.user.role, style: selectStyle, onChange: (event) => void props.onAdminRoleChange(entry.user.id, event.target.value), children: [_jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "coach", children: "coach" }), _jsx("option", { value: "admin", children: "admin" })] }), _jsx("select", { defaultValue: entry.membership.actualPlan?.id ?? entry.membership.plan.id, style: selectStyle, onChange: (event) => void props.onAdminPlanChange(entry.user.id, event.target.value), children: membershipCatalog?.order.map((planId) => {
                                            const plan = membershipCatalog.plans.find((item) => item.id === planId);
                                            return _jsx("option", { value: planId, children: plan?.name ?? planId }, planId);
                                        }) })] }), authMe?.isImpersonating && authMe.actorUser?.id === entry.user.id ? null : (_jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => void props.onAdminImpersonation(entry.user.id), children: locale === 'en' ? 'Impersonate' : 'Suplantar' }))] })] }, entry.user.id)))] }));
}
const sectionEyebrowStyle = {
    color: '#8da0ba',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const sectionTitleStyle = {
    color: '#eef4ff',
    fontSize: 22,
    fontWeight: 800
};
const sectionBodyStyle = {
    color: '#8f9bad',
    fontSize: 13,
    lineHeight: 1.6,
    maxWidth: 720
};
const panelTitleStyle = {
    color: '#eef4ff',
    fontWeight: 800,
    fontSize: 16
};
const panelHeroTitleStyle = {
    color: '#eef4ff',
    fontWeight: 800,
    fontSize: 18
};
const panelBodyStyle = {
    color: '#8f9bad',
    fontSize: 13,
    lineHeight: 1.6
};
const accountPanelStyle = {
    display: 'grid',
    gap: 14,
    padding: '20px 22px',
    borderRadius: 22,
    background: 'linear-gradient(180deg, rgba(11,15,24,0.98), rgba(5,8,14,0.99))',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 28px 70px rgba(0,0,0,0.2)'
};
const authPanelGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1.1fr .9fr',
    gap: 12
};
const panelCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '16px 16px 18px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(8,12,19,0.98))',
    border: '1px solid rgba(255,255,255,0.07)',
    alignContent: 'start'
};
const accountHeroCardStyle = {
    ...panelCardStyle,
    background: 'radial-gradient(circle at top left, rgba(216,253,241,0.1), transparent 42%), linear-gradient(180deg, rgba(10,14,22,0.98), rgba(8,12,19,1))',
    borderColor: 'rgba(216,253,241,0.12)'
};
const planCardsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12
};
const planCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '16px 16px 18px',
    borderRadius: 18,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.06)'
};
const activePlanCardStyle = {
    background: 'linear-gradient(180deg, rgba(216,253,241,0.08), rgba(12,18,27,0.98))',
    borderColor: 'rgba(216,253,241,0.18)'
};
const lockedButtonStyle = {
    border: '1px solid rgba(216,253,241,0.18)',
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(216,253,241,0.08)',
    color: '#d7f9ea',
    fontWeight: 800,
    cursor: 'not-allowed'
};
const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(7,11,18,0.92)',
    color: '#edf2ff',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};
const selectStyle = {
    ...inputStyle
};
const buttonStyle = {
    border: '1px solid rgba(216,253,241,0.12)',
    padding: '12px 18px',
    borderRadius: 14,
    background: 'linear-gradient(180deg, #d8fdf1, #b8f4df)',
    color: '#07111f',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(87, 209, 162, 0.18)'
};
const secondaryButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 18px',
    borderRadius: 14,
    background: '#0a0f18',
    color: '#e8eef9',
    fontWeight: 700,
    cursor: 'pointer'
};
const smallActionButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '9px 12px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    color: '#9fb0c7',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer'
};
const activeSmallActionButtonStyle = {
    background: 'rgba(216,253,241,0.08)',
    color: '#e9fff7',
    borderColor: 'rgba(216,253,241,0.2)'
};
const tabStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 14px',
    borderRadius: 999,
    background: '#070b12',
    color: '#d7e3f5',
    cursor: 'pointer',
    textAlign: 'center'
};
const activeTabStyle = {
    background: 'linear-gradient(180deg, rgba(49,55,86,0.95), rgba(16,23,35,1))',
    borderColor: 'rgba(216,253,241,0.2)',
    color: '#ffffff'
};
const accountMiniStatsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8
};
const accountMiniStatStyle = {
    display: 'grid',
    gap: 4,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const miniStatLabelStyle = {
    color: '#8da0ba',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const miniStatValueStyle = {
    color: '#edf2ff',
    fontSize: 15,
    fontWeight: 800
};
const adminUserCardStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(240px, 0.85fr)',
    gap: 14,
    alignItems: 'start',
    padding: '14px 15px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)'
};
const adminRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'start',
    padding: '12px 13px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const statusPanelStyle = {
    padding: '12px 14px',
    borderRadius: 16,
    border: '1px solid rgba(216,253,241,0.12)',
    background: 'rgba(14, 35, 29, 0.6)',
    color: '#d9f8eb',
    lineHeight: 1.6
};
const fieldBlockStyle = {
    display: 'grid',
    gap: 7
};
const fieldLabelStyle = {
    color: '#8da0ba',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const softPanelStyle = {
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#d8e5f8',
    lineHeight: 1.6
};
