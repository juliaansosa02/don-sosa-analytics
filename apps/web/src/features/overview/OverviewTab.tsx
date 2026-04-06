import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Badge, Card, ChampionIdentity, KPI } from '../../components/ui';
import type { Dataset } from '../../types';
import type { Locale } from '../../lib/i18n';
import {
  buildMatchQuickRead,
  findAnchorChampion,
  findReferenceMatch,
  findReviewPriorityMatch,
  formatMatchDuration,
  getChampionAccent
} from '../dashboard/dashboardSignals';

export function OverviewTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const trend = dataset.matches.slice().reverse().map((match, index) => ({
    game: index + 1,
    score: Math.round(match.score.total),
    result: match.win ? 1 : 0
  }));

  const scatter = dataset.matches.map((match) => ({
    x: match.timeline.csAt15,
    y: match.timeline.goldAt15,
    z: Math.round(match.score.total),
    champion: match.championName,
    result: match.win ? 'Win' : 'Loss'
  }));

  const anchorChampion = findAnchorChampion(dataset.matches);
  const accent = getChampionAccent(anchorChampion);
  const primaryInsight = dataset.summary.coaching.primaryInsight;
  const topPositive = dataset.summary.positiveSignals[0] ?? null;
  const referenceMatch = findReferenceMatch(dataset.matches);
  const reviewPriorityMatch = findReviewPriorityMatch(dataset.matches);
  const stableGames = dataset.matches.filter((match) => match.timeline.deathsPre14 <= 1 && (match.timeline.laneVolatilityScore ?? 0) <= 1.05).length;
  const volatileGames = dataset.matches.filter((match) => match.timeline.deathsPre14 >= 2 || (match.timeline.laneVolatilityScore ?? 0) >= 1.4).length;
  const conversionGames = dataset.matches.filter((match) => match.win && (match.timeline.goldDiffAt15 ?? 0) >= 150).length;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section
        style={{
          display: 'grid',
          gap: 16,
          padding: 22,
          borderRadius: 24,
          background: accent.panel,
          border: `1px solid ${accent.border}`,
          boxShadow: `0 22px 54px rgba(0,0,0,0.24), 0 0 34px ${accent.glow}`
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 10, maxWidth: 760 }}>
            <div style={{ color: accent.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 800 }}>
              {locale === 'en' ? 'Player overview' : 'Overview del jugador'}
            </div>
            <div style={{ color: accent.text, fontSize: 32, lineHeight: 1.04, fontWeight: 900, letterSpacing: '-0.04em' }}>
              {primaryInsight?.headline ?? (locale === 'en' ? 'Your current block already has a visible shape' : 'Tu bloque actual ya tiene una forma visible')}
            </div>
            <div style={{ color: '#dce7f7', lineHeight: 1.7, fontSize: 15 }}>
              {primaryInsight?.summary ?? (locale === 'en'
                ? 'This overview turns your current sample into a live read: what is stable, what is expensive and which match deserves review first.'
                : 'Este overview convierte tu muestra actual en una lectura viva: qué está estable, qué está costando caro y qué partida merece review primero.')}
            </div>
          </div>

          {anchorChampion ? (
            <ChampionIdentity
              championName={anchorChampion}
              version={dataset.ddragonVersion}
              subtitle={locale === 'en' ? 'Anchor pick in the visible slice' : 'Pick ancla del recorte visible'}
              meta={
                <>
                  <Badge tone="default">{locale === 'en' ? `${dataset.summary.matches} visible matches` : `${dataset.summary.matches} partidas visibles`}</Badge>
                  <Badge tone="low">{dataset.summary.primaryRole}</Badge>
                </>
              }
              size={62}
            />
          ) : null}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone="default">{locale === 'en' ? `${dataset.summary.winRate}% WR` : `${dataset.summary.winRate}% WR`}</Badge>
          <Badge tone="default">{locale === 'en' ? `Performance ${dataset.summary.avgPerformanceScore}` : `Performance ${dataset.summary.avgPerformanceScore}`}</Badge>
          <Badge tone="low">{locale === 'en' ? `${stableGames} stable games` : `${stableGames} partidas estables`}</Badge>
          <Badge tone="medium">{locale === 'en' ? `${volatileGames} volatile games` : `${volatileGames} partidas volátiles`}</Badge>
          <Badge tone="low">{locale === 'en' ? `${conversionGames} clean conversions` : `${conversionGames} conversiones limpias`}</Badge>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        <KPI label="Win Rate" value={`${dataset.summary.winRate}%`} hint={`${dataset.summary.wins}-${dataset.summary.losses}`} />
        <KPI label="Performance" value={`${dataset.summary.avgPerformanceScore}`} hint={locale === 'en' ? 'Sample average' : 'Promedio de muestra'} />
        <KPI label={locale === 'en' ? 'Consistency' : 'Consistencia'} value={`${dataset.summary.consistencyIndex}`} hint={locale === 'en' ? 'How even your level stays' : 'Qué tan parejo se sostiene tu nivel'} />
        <KPI label={locale === 'en' ? 'CS at 15' : 'CS a los 15'} value={`${dataset.summary.avgCsAt15}`} hint={locale === 'en' ? 'Early income floor' : 'Piso de economía temprana'} />
        <KPI label="Gold@15" value={`${dataset.summary.avgGoldAt15}`} hint={locale === 'en' ? 'Early state' : 'Estado temprano'} />
        <KPI label="KP" value={`${dataset.summary.avgKillParticipation}%`} hint={locale === 'en' ? 'Useful map connection' : 'Conexión útil al mapa'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card
          title={locale === 'en' ? 'Main leak now' : 'Fuga principal ahora'}
          subtitle={locale === 'en' ? 'The system read that deserves the highest review priority.' : 'La lectura del sistema que hoy merece la mayor prioridad de review.'}
        >
          <PulseBlock
            title={primaryInsight?.headline ?? (locale === 'en' ? 'No sharp primary leak yet' : 'Todavía no hay una fuga principal cerrada')}
            body={primaryInsight?.whyItMatters ?? (locale === 'en' ? 'The sample still needs more separation between stable signal and recent noise.' : 'La muestra todavía necesita más separación entre señal estable y ruido reciente.')}
            tone="high"
          />
        </Card>

        <Card
          title={locale === 'en' ? 'What is holding the block up' : 'Qué está sosteniendo el bloque'}
          subtitle={locale === 'en' ? 'Useful because it shows what is already repeatable.' : 'Sirve porque muestra qué ya es repetible.'}
        >
          <PulseBlock
            title={topPositive?.problem ?? (locale === 'en' ? 'There is already a playable base' : 'Ya existe una base jugable')}
            body={topPositive?.impact ?? (locale === 'en' ? 'The point is not to start from zero, but to copy your better version more often.' : 'La idea no es empezar de cero, sino copiar más seguido tu versión mejor.')}
            tone="low"
          />
        </Card>

        <Card
          title={locale === 'en' ? 'Review next' : 'Qué abrir después'}
          subtitle={locale === 'en' ? 'This comes directly from the current review agenda.' : 'Esto sale directo de la agenda actual de review.'}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            {(dataset.summary.reviewAgenda.slice(0, 3)).map((item) => (
              <div key={item.matchId} style={agendaRowStyle}>
                <div style={{ color: '#eef4ff', fontWeight: 700 }}>{item.title}</div>
                <div style={{ color: '#8fa1b8', fontSize: 13, lineHeight: 1.55 }}>{item.question}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        <Card title={locale === 'en' ? 'Performance trend' : 'Tendencia de performance'} subtitle={locale === 'en' ? 'Shows whether the block is settling or oscillating.' : 'Muestra si el bloque se está asentando o si sigue oscilando.'}>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="game" stroke="#8fa8cc" />
                <YAxis stroke="#8fa8cc" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#7ed4ff" strokeWidth={3} dot={{ r: 3, fill: '#d8f7ff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={locale === 'en' ? 'Early economy map' : 'Mapa de economía temprana'} subtitle={locale === 'en' ? 'Useful to see which games stayed playable by minute 15.' : 'Sirve para ver qué partidas seguían jugables al minuto 15.'}>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" dataKey="x" name="CS@15" stroke="#8fa8cc" />
                <YAxis type="number" dataKey="y" name="Gold@15" stroke="#8fa8cc" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatter} fill="#76e3b5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {referenceMatch ? (
          <Card title={locale === 'en' ? 'Reference match' : 'Partida referencia'} subtitle={locale === 'en' ? 'The cleanest mirror game in the visible sample.' : 'La partida espejo más limpia del recorte visible.'}>
            <SpotlightMatch match={referenceMatch} dataset={dataset} locale={locale} />
          </Card>
        ) : null}

        {reviewPriorityMatch ? (
          <Card title={locale === 'en' ? 'Highest review priority' : 'Mayor prioridad de review'} subtitle={locale === 'en' ? 'The loss that most clearly explains where the block is leaking.' : 'La derrota que más claramente explica por dónde está perdiendo valor el bloque.'}>
            <SpotlightMatch match={reviewPriorityMatch} dataset={dataset} locale={locale} />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function PulseBlock({ title, body, tone }: { title: string; body: string; tone: 'high' | 'low' }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        padding: 16,
        borderRadius: 18,
        background: '#080d15',
        border: `1px solid ${tone === 'high' ? 'rgba(255,107,107,0.14)' : 'rgba(126,245,199,0.14)'}`
      }}
    >
      <div style={{ color: '#eef4ff', fontSize: 19, lineHeight: 1.18, fontWeight: 850 }}>{title}</div>
      <div style={{ color: '#92a0b4', lineHeight: 1.7 }}>{body}</div>
    </div>
  );
}

function SpotlightMatch({ match, dataset, locale }: { match: Dataset['matches'][number]; dataset: Dataset; locale: Locale }) {
  const quickRead = buildMatchQuickRead(match, dataset, locale);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <ChampionIdentity
        championName={match.championName}
        version={dataset.ddragonVersion}
        subtitle={`${formatMatchDuration(match.gameDurationSeconds, locale)} · ${match.opponentChampionName ? `vs ${match.opponentChampionName}` : ''}`}
        meta={
          <>
            <Badge tone={match.win ? 'low' : 'high'}>{match.win ? (locale === 'en' ? 'Win' : 'Victoria') : (locale === 'en' ? 'Loss' : 'Derrota')}</Badge>
            <Badge tone={quickRead.tone === 'reference' ? 'low' : quickRead.tone === 'warning' ? 'high' : 'default'}>{quickRead.toneLabel}</Badge>
          </>
        }
      />
      <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 850, lineHeight: 1.15 }}>{quickRead.title}</div>
      <div style={{ color: '#93a2b7', lineHeight: 1.7 }}>{quickRead.body}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Badge>{`${match.kills}/${match.deaths}/${match.assists}`}</Badge>
        <Badge>{`${match.timeline.csAt15} CS15`}</Badge>
        <Badge>{`${match.timeline.goldDiffAt15 >= 0 ? '+' : ''}${Math.round(match.timeline.goldDiffAt15 ?? 0)} g15`}</Badge>
        <Badge>{`Score ${Math.round(match.score.total)}`}</Badge>
      </div>
    </div>
  );
}

const agendaRowStyle = {
  display: 'grid',
  gap: 5,
  padding: '12px 13px',
  borderRadius: 14,
  background: '#080d15',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
