import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge } from '../../components/ui';
export function AccountCenter(props) {
    if (!props.open)
        return null;
    const { locale, authUser, canManageCoachRoster, isAdmin, accountPanelTab } = props;
    const authTabs = [
        { id: 'auth', label: locale === 'en' ? 'Access' : 'Acceso' },
        { id: 'membership', label: locale === 'en' ? 'Plans' : 'Planes' }
    ];
    const userTabs = [
        { id: 'profile', label: locale === 'en' ? 'Profile' : 'Perfil' },
        { id: 'membership', label: locale === 'en' ? 'Membership' : 'Membresía' },
        { id: 'security', label: locale === 'en' ? 'Security' : 'Seguridad' },
        ...(canManageCoachRoster ? [{ id: 'coach', label: locale === 'en' ? 'Coach workspace' : 'Espacio coach' }] : []),
        ...(isAdmin ? [{ id: 'admin', label: locale === 'en' ? 'Admin tools' : 'Herramientas admin' }] : [])
    ];
    const availableTabs = authUser ? userTabs : authTabs;
    return (_jsxs("section", { style: accountPanelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: sectionEyebrowStyle, children: authUser ? (locale === 'en' ? 'Account center' : 'Centro de cuenta') : (locale === 'en' ? 'Account access' : 'Acceso a cuenta') }), _jsx("div", { style: sectionTitleStyle, children: authUser
                                    ? (locale === 'en' ? 'Profile, membership and workspace' : 'Perfil, membresía y espacio de cuenta')
                                    : (locale === 'en' ? 'Login, membership and recovery' : 'Ingreso, membresía y recuperación') }), _jsx("div", { style: sectionBodyStyle, children: authUser
                                    ? (locale === 'en'
                                        ? 'Keep account actions here so the main product can stay focused on your League profile, coaching and analysis.'
                                        : 'Concentrá acá las acciones de cuenta para que el producto principal quede enfocado en tu perfil de League, el coaching y el análisis.')
                                    : (locale === 'en'
                                        ? 'Create a real account so your coaching, plans and billing history stay attached to you instead of only to this browser.'
                                        : 'Creá una cuenta real para que tu coaching, tus planes y tu historial de billing queden ligados a vos y no solo a este navegador.') })] }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: props.onClose, children: locale === 'en' ? 'Close' : 'Cerrar' })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: availableTabs.map((tab) => (_jsx("button", { type: "button", onClick: () => props.onTabChange(tab.id), style: { ...tabStyle, ...(accountPanelTab === tab.id ? activeTabStyle : {}) }, children: tab.label }, tab.id))) }), renderAuthSection(props), renderProfileSection(props), renderMembershipSection(props), renderSecuritySection(props), renderCoachSection(props), renderAdminSection(props), props.authError ? _jsx("div", { style: softPanelStyle, children: props.authError }) : null, props.membershipError ? _jsx("div", { style: softPanelStyle, children: props.membershipError }) : null] }));
}
function renderAuthSection(props) {
    const { authUser, accountPanelTab, locale, authMode, authDisplayName, authEmail, authPassword, authActionLoading, resetToken, newPassword, resetTokenPreview, resetLinkPreview } = props;
    if (authUser || accountPanelTab !== 'auth')
        return null;
    return (_jsxs("div", { className: "two-col-grid", style: authPanelGridStyle, children: [_jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: ['login', 'signup', 'reset'].map((mode) => (_jsx("button", { type: "button", onClick: () => props.onAuthModeChange(mode), style: { ...smallActionButtonStyle, ...(authMode === mode ? activeSmallActionButtonStyle : {}) }, children: mode === 'login'
                                ? (locale === 'en' ? 'Login' : 'Ingresar')
                                : mode === 'signup'
                                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                    : (locale === 'en' ? 'Password recovery' : 'Recuperar contraseña') }, mode))) }), _jsxs("form", { onSubmit: props.onAuthSubmit, style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: authMode === 'signup' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: 10 }, children: [authMode === 'signup' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Display name' : 'Nombre visible' }), _jsx("input", { value: authDisplayName, onChange: (e) => props.onAuthDisplayNameChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'For example, Don Sosa' : 'Por ejemplo, Don Sosa' })] })) : null, _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: "Email" }), _jsx("input", { type: "email", value: authEmail, onChange: (e) => props.onAuthEmailChange(e.target.value), style: inputStyle, placeholder: "vos@email.com" })] }), authMode !== 'reset' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Password' : 'Contraseña' }), _jsx("input", { type: "password", value: authPassword, onChange: (e) => props.onAuthPasswordChange(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: authActionLoading, children: authActionLoading
                                            ? (locale === 'en' ? 'Processing...' : 'Procesando...')
                                            : authMode === 'login'
                                                ? (locale === 'en' ? 'Log in' : 'Iniciar sesión')
                                                : authMode === 'signup'
                                                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                                    : (locale === 'en' ? 'Send recovery' : 'Enviar recuperación') }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Your coaching and billing history will persist on your account' : 'Tu historial de coaching y billing quedará persistido en tu cuenta' })] })] })] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Password recovery flow' : 'Flujo de recuperación de contraseña' }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? '1. Request recovery with your email. 2. In production, use the email link. 3. In development, the token and direct link appear here so you can finish the full flow locally.'
                            : '1. Pedí la recuperación con tu email. 2. En producción, seguí el link recibido. 3. En desarrollo, el token y el link directo aparecen acá para que puedas cerrar el flujo completo localmente.' }), _jsxs("form", { onSubmit: props.onResetPasswordConfirm, style: { display: 'grid', gap: 10 }, children: [_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Reset token' : 'Token de recuperación' }), _jsx("input", { value: resetToken, onChange: (e) => props.onResetTokenChange(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Paste the token here' : 'Pegá el token acá' })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'New password' : 'Nueva contraseña' }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => props.onNewPasswordChange(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: secondaryButtonStyle, disabled: authActionLoading, children: authActionLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Apply new password' : 'Aplicar nueva contraseña') }), resetTokenPreview ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Dev token ready' : 'Token dev listo' }) : null, resetLinkPreview ? _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Reset link ready' : 'Link de reset listo' }) : null] }), resetTokenPreview ? (_jsx("div", { style: statusPanelStyle, children: locale === 'en'
                                    ? 'The development token was generated and autofilled. You can use it as-is or replace it if you want to test the manual step too.'
                                    : 'El token de desarrollo se generó y quedó autocompletado. Podés usarlo así o reemplazarlo si querés probar también el paso manual.' })) : null, resetLinkPreview ? (_jsx("div", { style: statusPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { children: locale === 'en'
                                                ? 'The recovery link is also ready. It opens the account center directly in reset mode.'
                                                : 'El link de recuperación también quedó listo. Abre el centro de cuenta directamente en modo reset.' }), _jsx("a", { href: resetLinkPreview, style: { color: '#dff8eb', wordBreak: 'break-all' }, children: resetLinkPreview })] }) })) : null] })] })] }));
}
function renderProfileSection(props) {
    const { authUser, accountPanelTab, locale, actorUser, membership, currentPlan, currentPlanPriceLabel, authMe, billingReady, canOpenBillingPortal, authActionLoading, membershipActionLoading } = props;
    if (!authUser || accountPanelTab !== 'profile')
        return null;
    return (_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.05fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelHeroTitleStyle, children: authUser.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13 }, children: authUser.email }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: actorUser?.role.toUpperCase() ?? 'USER' }), _jsx(Badge, { tone: "low", children: currentPlan?.name ?? 'Free' }), membership?.overrideReason === 'admin_full_access' ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Full admin access' : 'Acceso admin total' }) : null] }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? `${membership?.linkedProfiles.length ?? 0} saved profiles · ${membership?.usage.openaiGenerations ?? 0} AI runs this month`
                            : `${membership?.linkedProfiles.length ?? 0} perfiles guardados · ${membership?.usage.openaiGenerations ?? 0} corridas IA este mes` }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: () => void props.onLogout(), children: authActionLoading ? (locale === 'en' ? 'Closing...' : 'Cerrando...') : (locale === 'en' ? 'Log out' : 'Cerrar sesión') }), authMe?.isImpersonating ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: () => void props.onStopImpersonation(), children: locale === 'en' ? 'Stop impersonation' : 'Salir de la suplantación' })) : null] })] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Current membership' : 'Membresía actual' }), _jsx("div", { style: panelBodyStyle, children: membership
                            ? (locale === 'en'
                                ? `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} profiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} matches per profile`
                                : `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} perfiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} partidas por perfil`)
                            : (locale === 'en' ? 'Loading membership...' : 'Cargando membresía...') }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [currentPlanPriceLabel ? _jsx(Badge, { tone: "default", children: currentPlanPriceLabel }) : null, membership ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${membership.plan.entitlements.maxCoachRoles} coaching roles` : `${membership.plan.entitlements.maxCoachRoles} roles de coaching` }) : null] })] }), _jsxs("div", { style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Billing actions' : 'Acciones de billing' }), _jsx("div", { style: panelBodyStyle, children: billingReady
                            ? (locale === 'en' ? 'Stripe is ready for upgrades, renewals and self-serve management.' : 'Stripe ya está listo para upgrades, renovaciones y autogestión.')
                            : (locale === 'en' ? 'Billing is not configured yet for this environment.' : 'Billing todavía no está configurado para este entorno.') }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [canOpenBillingPortal ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: membershipActionLoading, onClick: () => void props.onBillingPortal(), children: membershipActionLoading ? (locale === 'en' ? 'Opening...' : 'Abriendo...') : (locale === 'en' ? 'Manage billing' : 'Gestionar billing') })) : (_jsx(Badge, { tone: "default", children: billingReady ? (locale === 'en' ? 'Stripe ready' : 'Stripe listo') : (locale === 'en' ? 'Stripe pending' : 'Stripe pendiente') })), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => props.onTabChange('membership'), children: locale === 'en' ? 'See plans' : 'Ver planes' })] })] })] }));
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
    const { authUser, accountPanelTab, canManageCoachRoster, locale, coachRosterLoading, coachPlayerEmail, coachPlayerNote, safeCoachRoster, membership } = props;
    if (!authUser || accountPanelTab !== 'coach' || !canManageCoachRoster)
        return null;
    return (_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 12 }, children: [_jsxs("form", { onSubmit: async (event) => { event.preventDefault(); await props.onAddCoachPlayer(); }, style: panelCardStyle, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Add player by account email' : 'Agregar jugador por email de cuenta' }), _jsx("div", { style: panelBodyStyle, children: locale === 'en'
                            ? 'The coach-player relation is stored independently from Riot profiles so you can manage people, not only accounts.'
                            : 'La relación coach-jugador se guarda separada de los perfiles de Riot para que puedas gestionar personas, no solo cuentas.' }), _jsx("input", { type: "email", value: coachPlayerEmail, onChange: (e) => props.onCoachPlayerEmailChange(e.target.value), style: inputStyle, placeholder: "player@email.com" }), _jsx("textarea", { value: coachPlayerNote, onChange: (e) => props.onCoachPlayerNoteChange(e.target.value), style: { ...inputStyle, minHeight: 94, resize: 'vertical' }, placeholder: locale === 'en' ? 'Optional note about this player' : 'Nota opcional sobre este jugador' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: coachRosterLoading, children: coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Link player' : 'Vincular jugador') }), membership ? _jsx(Badge, { tone: "low", children: `${safeCoachRoster.length}/${membership.plan.entitlements.maxManagedPlayers}` }) : null] })] }), _jsxs("div", { style: { ...panelCardStyle, alignContent: 'start' }, children: [_jsx("div", { style: panelTitleStyle, children: locale === 'en' ? 'Current roster' : 'Roster actual' }), coachRosterLoading ? _jsx("div", { style: panelBodyStyle, children: locale === 'en' ? 'Loading roster...' : 'Cargando roster...' }) : null, !coachRosterLoading && !safeCoachRoster.length ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'No linked players yet.' : 'Todavía no hay jugadores vinculados.' }) : null, _jsx("div", { style: { display: 'grid', gap: 10 }, children: safeCoachRoster.map((entry) => (_jsxs("div", { style: adminRowStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: entry.user.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 12 }, children: entry.user.email }), entry.note ? _jsx("div", { style: { color: '#cdd8ea', fontSize: 13 }, children: entry.note }) : null] }), _jsx("button", { type: "button", style: secondaryButtonStyle, disabled: coachRosterLoading, onClick: () => void props.onRemoveCoachPlayer(entry.user.id), children: locale === 'en' ? 'Remove' : 'Quitar' })] }, entry.assignmentId))) })] })] }));
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
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.06)',
    alignContent: 'start'
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
