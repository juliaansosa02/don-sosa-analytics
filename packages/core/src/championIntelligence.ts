export type ChampionReadConfidence = 'curated' | 'inferred' | 'hypothesis';

export interface ChampionSetupVariant {
  id: string;
  label: string;
  role: string;
  stance: 'default' | 'snowball' | 'stability' | 'utility' | 'anti_frontline' | 'anti_range';
  summary: string;
  keystone: string | null;
  skillOrder: string[];
  itemPath: string[];
  bestWhen: string;
  avoidWhen: string;
  playPatternShift: string;
  confidence: ChampionReadConfidence;
}

export interface ChampionMatchupPlan {
  opponentChampionName: string;
  role: string;
  verdict: 'favored' | 'skill' | 'difficult';
  threat: string;
  answer: string;
  setupAdjustments: string[];
  confidence: ChampionReadConfidence;
}

export interface ChampionReadAtom {
  id: string;
  type: 'identity' | 'high_elo_pattern' | 'common_trap' | 'execution' | 'review_lens';
  label: string;
  body: string;
  confidence: ChampionReadConfidence;
}

export interface ChampionReviewTrigger {
  id: string;
  label: string;
  condition: string;
  whyItMatters: string;
  prompts: string[];
}

export interface ChampionIntelligenceProfile {
  championName: string;
  role: string;
  patchStatus: 'evergreen' | 'patch_sensitive';
  identitySummary: string;
  identityBullets: string[];
  setupVariants: ChampionSetupVariant[];
  matchupPlans: ChampionMatchupPlan[];
  highEloReads: ChampionReadAtom[];
  reviewTriggers: ChampionReviewTrigger[];
  sourceLabel: string;
}

export const championIntelligenceCatalog: ChampionIntelligenceProfile[] = [
  {
    championName: 'Sylas',
    role: 'JUNGLE',
    patchStatus: 'patch_sensitive',
    identitySummary: 'Sylas jungle cobra valor cuando convierte su primer spike real en skirmishes con ultis de alto leverage, no cuando intenta jugar una partida de full clear neutral.',
    identityBullets: [
      'Necesita que el oro temprano termine en peleas con contexto, no en farm aislado sin presión.',
      'Su identidad mejora mucho cuando roba ultis que abren pick, dive o re-engage claro.',
      'Si llega tarde al primer item o pierde HP antes del setup, su ventana de agencia se achica rápido.'
    ],
    setupVariants: [
      {
        id: 'sylas-jg-conq-default',
        label: 'Conqueror default',
        role: 'JUNGLE',
        stance: 'default',
        summary: 'La página más estable para partidas donde querés sostener skirmishs largos y no regalar tu mid game por una apuesta demasiado codiciosa.',
        keystone: 'Conqueror',
        skillOrder: ['Q', 'W', 'E'],
        itemPath: ['Hextech Rocketbelt', 'Zhonya\'s Hourglass', 'Cryptbloom'],
        bestWhen: 'La partida pide varias peleas cortas-medias antes del tercer item y podés tocar backline o castigar engage rival.',
        avoidWhen: 'Tu early ya viene roto y no tenés ventanas reales para stackear peleas largas.',
        playPatternShift: 'Jugá por tempo de reset, robo de ulti útil y reentrada con W, no por primer engage suicida.',
        confidence: 'curated'
      },
      {
        id: 'sylas-jg-burst-snowball',
        label: 'Burst snowball',
        role: 'JUNGLE',
        stance: 'snowball',
        summary: 'Variante más agresiva cuando el draft te deja tocar carries blandos y el early ya te dio iniciativa.',
        keystone: 'Electrocute',
        skillOrder: ['Q', 'E', 'W'],
        itemPath: ['Lich Bane', 'Shadowflame', 'Zhonya\'s Hourglass'],
        bestWhen: 'Tenés prio lateral, ultis de pick claras y rivales que mueren en una sola ventana.',
        avoidWhen: 'Hay doble frontline o peleas demasiado largas para cobrar burst limpio.',
        playPatternShift: 'Buscá pick, reset corto y volver a entrar antes que front-to-back extendido.',
        confidence: 'inferred'
      }
    ],
    matchupPlans: [
      {
        opponentChampionName: 'LeeSin',
        role: 'JUNGLE',
        verdict: 'difficult',
        threat: 'Te castiga antes de que llegues cómodo a spike y te obliga a responder tempo con menos vida.',
        answer: 'Priorizá clears limpios, crab sólo con prioridad real y peleá recién cuando W + component te devuelven sustain útil.',
        setupAdjustments: ['Página más estable', 'Reset antes del primer objetivo', 'No regalar invade cruzado sin lanes'],
        confidence: 'curated'
      },
      {
        opponentChampionName: 'Karthus',
        role: 'JUNGLE',
        verdict: 'favored',
        threat: 'Si le regalás full clear gratis, el cruce se le ordena.',
        answer: 'Forzá presencia temprana sobre lanes con CC y castiga sus resets o campamentos expuestos.',
        setupAdjustments: ['Más snowball si tenés setup', 'Vision temprana de camps', 'No jugarlo como mirror clear'],
        confidence: 'curated'
      }
    ],
    highEloReads: [
      {
        id: 'sylas-jg-read-1',
        type: 'high_elo_pattern',
        label: 'No jugarlo como AP farmer',
        body: 'La versión fuerte de Sylas jungle no “gana por farm”, gana porque usa oro temprano para entrar a peleas donde un ulti robado cambia la ecuación del mapa.',
        confidence: 'curated'
      },
      {
        id: 'sylas-jg-read-2',
        type: 'common_trap',
        label: 'Primer engage sin salida',
        body: 'Muchos Sylas low-mid elo ven una ulti buena y se tiran primero. La lectura high elo suele ser guardar un segundo de paciencia para entrar cuando la pelea ya mostró target y cooldowns.',
        confidence: 'curated'
      }
    ],
    reviewTriggers: [
      {
        id: 'sylas-jg-trigger-1',
        label: 'Llegaste tarde al primer item',
        condition: 'Tu primer spike aparece tarde y aun así seguís aceptando peleas neutrales.',
        whyItMatters: 'Sin ese tempo, el campeón deja de dictar skirmish y empieza a sobrevivirlos.',
        prompts: ['¿Qué recall te rompió el path?', '¿Peleaste antes de comprar?', '¿Tuviste que responder una jugada que no era tuya?']
      }
    ],
    sourceLabel: 'Curated high-elo jungle references + internal synthesis'
  },
  {
    championName: 'Graves',
    role: 'JUNGLE',
    patchStatus: 'evergreen',
    identitySummary: 'Graves jungle premia rutas limpias, tempo de oro y peleas elegidas desde rango y prioridad. Cuando juega apurado o acepta entrar primero, pierde gran parte de su ventaja estructural.',
    identityBullets: [
      'Escala muy bien cuando su oro temprano no se corta por resets malos o peleas sin prio.',
      'Su daño parece “seguro”, pero en realidad depende mucho de spacing y de no gastar dash por ansiedad.',
      'Convierte mejor leads cuando invade con información y no cuando persigue kills largas.'
    ],
    setupVariants: [
      {
        id: 'graves-jg-fleet-default',
        label: 'Fleet default',
        role: 'JUNGLE',
        stance: 'default',
        summary: 'La página más redonda para sostener tempo, salud de clear y entradas limpias al primer objetivo.',
        keystone: 'Fleet Footwork',
        skillOrder: ['Q', 'E', 'W'],
        itemPath: ['Youmuu\'s Ghostblade', 'Collector', 'Lord Dominik\'s Regards'],
        bestWhen: 'Querés jugar desde ventaja de campamentos, priorizar resets y castigar errores de entrada rival.',
        avoidWhen: 'Tu comp necesita que vos seas el engage principal o el único frontliner.',
        playPatternShift: 'Jugarlo desde tempo y ángulo, no desde primer contacto.',
        confidence: 'curated'
      },
      {
        id: 'graves-jg-frontline-answer',
        label: 'Anti-frontline conversion',
        role: 'JUNGLE',
        stance: 'anti_frontline',
        summary: 'Path más serio cuando el rival te pide daño sostenido y penetración más que snowball puro.',
        keystone: 'Fleet Footwork',
        skillOrder: ['Q', 'E', 'W'],
        itemPath: ['Black Cleaver', 'Mortal Reminder', 'Lord Dominik\'s Regards'],
        bestWhen: 'Hay doble frontline o bruisers que sobreviven a burst corto.',
        avoidWhen: 'La partida se resuelve por picks rápidos sobre carries blandos.',
        playPatternShift: 'Menos highlight de una rotación y más valor en entrar-salir mientras bajás frontline.',
        confidence: 'inferred'
      }
    ],
    matchupPlans: [
      {
        opponentChampionName: 'Kindred',
        role: 'JUNGLE',
        verdict: 'skill',
        threat: 'Te disputa tempo y te castiga si dashás primero o jugás sin cobertura de lanes.',
        answer: 'No tomes marcas por orgullo; jugá por ventana de push y castigo de posición.',
        setupAdjustments: ['Fleet estable', 'Más visión de entry points', 'No dashar primero'],
        confidence: 'curated'
      },
      {
        opponentChampionName: 'Rammus',
        role: 'JUNGLE',
        verdict: 'difficult',
        threat: 'Te obliga a leer muy bien itemización y spacing porque front-to-back automático favorece al rival.',
        answer: 'Convertí a anti-frontline antes y no compres greed sin respuesta real.',
        setupAdjustments: ['Pen/cleaver antes', 'No forzar auto space corto', 'Objetivo desde prio y no chase'],
        confidence: 'curated'
      }
    ],
    highEloReads: [
      {
        id: 'graves-jg-read-1',
        type: 'execution',
        label: 'Dash con intención, no por costumbre',
        body: 'En Graves, el dash temprano mal usado suele convertir una pelea ganable en una ventana donde ya no podés kitear ni reacomodar el ángulo.',
        confidence: 'curated'
      },
      {
        id: 'graves-jg-read-2',
        type: 'common_trap',
        label: 'Confundir lead con permiso',
        body: 'Un lead de Graves se convierte mejor por control de camps, resets y entradas limpias; perseguir de más suele licuar una ventaja que ya estaba bien armada.',
        confidence: 'curated'
      }
    ],
    reviewTriggers: [
      {
        id: 'graves-jg-trigger-1',
        label: 'Moriste con dash ya gastado',
        condition: 'Tus peleas malas arrancan después de usar E sin forzar respuesta rival.',
        whyItMatters: 'Cuando Graves pierde su herramienta de reposicionamiento, también pierde gran parte de su identidad.',
        prompts: ['¿Dashaste por daño o por ángulo?', '¿La pelea ya te exigía usarlo?', '¿Podías esperar medio segundo más?']
      }
    ],
    sourceLabel: 'Curated high-elo jungle references + internal synthesis'
  },
  {
    championName: 'Naafiri',
    role: 'JUNGLE',
    patchStatus: 'patch_sensitive',
    identitySummary: 'Naafiri gana cuando el mapa le permite tocar targets blandos con ventanas cortas y ordenadas. Si la pelea se alarga o entra desde frontal obvio, su valor cae mucho.',
    identityBullets: [
      'Necesita leer bien cuándo la comp rival le deja backline y cuándo la obliga a una pelea demasiado frontal.',
      'Su claridad de target selection importa más que “entrar rápido”.',
      'Le cuesta convertir cuando el draft pide front-to-back paciente.'
    ],
    setupVariants: [
      {
        id: 'naafiri-jg-default',
        label: 'Default pick pressure',
        role: 'JUNGLE',
        stance: 'default',
        summary: 'Página y path para castigar carries blandos y moverte con iniciativa sobre mid y side.',
        keystone: 'First Strike',
        skillOrder: ['Q', 'W', 'E'],
        itemPath: ['Profane Hydra', 'Axiom Arc', 'Serylda\'s Grudge'],
        bestWhen: 'La backline rival es realmente accesible y tu comp ya ofrece primera capa de engage o control.',
        avoidWhen: 'La pelea te obliga a pasar por frontline o a esperar demasiado tiempo visible.',
        playPatternShift: 'Tu valor aparece en ventanas cortas con target claro, no en pelear “a ver qué sale”.',
        confidence: 'curated'
      },
      {
        id: 'naafiri-jg-stable',
        label: 'Stable setup',
        role: 'JUNGLE',
        stance: 'stability',
        summary: 'Variante más paciente para cuando no querés que el campeón te obligue a un all-in frágil en cada jugada.',
        keystone: 'Conqueror',
        skillOrder: ['Q', 'E', 'W'],
        itemPath: ['Eclipse', 'Black Cleaver', 'Maw of Malmortius'],
        bestWhen: 'Necesitás aguantar un poco más y la partida no te da picks limpios todo el tiempo.',
        avoidWhen: 'Tu única forma de ganar es pickear carry blando antes de que la pelea exista.',
        playPatternShift: 'Menos all-in puro y más pelea de dos tiempos con margen de salida.',
        confidence: 'inferred'
      }
    ],
    matchupPlans: [
      {
        opponentChampionName: 'Poppy',
        role: 'JUNGLE',
        verdict: 'difficult',
        threat: 'Te desarma la entrada lineal y castiga dashes previsibles.',
        answer: 'No empieces pelea sin ver la W rival y buscá ventanas de pick lateral más que front engage.',
        setupAdjustments: ['Más setup estable', 'No entrar first layer', 'Evitar fight lineal en choke'],
        confidence: 'curated'
      }
    ],
    highEloReads: [
      {
        id: 'naafiri-jg-read-1',
        type: 'review_lens',
        label: 'No toda backline es realmente accesible',
        body: 'El error clásico con Naafiri es ver un carry blando y asumir que ya existe ventana. La lectura alta mira si ese carry está “tocable” sin atravesar demasiado control o frontline.',
        confidence: 'curated'
      }
    ],
    reviewTriggers: [
      {
        id: 'naafiri-jg-trigger-1',
        label: 'Elegiste target pero no entrada',
        condition: 'Tu decisión parecía correcta en papel, pero la forma de entrar te dejó sin segundo paso.',
        whyItMatters: 'Naafiri castiga tanto el mal target selection como la mala geometría de engage.',
        prompts: ['¿El carry era accesible o solo visible?', '¿Quién podía cortar tu entrada?', '¿Entraste demasiado pronto?']
      }
    ],
    sourceLabel: 'Curated high-elo assassin references + internal synthesis'
  },
  {
    championName: 'Ahri',
    role: 'MIDDLE',
    patchStatus: 'evergreen',
    identitySummary: 'Ahri mid se vuelve premium cuando usa push, info y pick pressure para ordenar el mapa; no cuando gasta sus recursos por trades medios sin transición.',
    identityBullets: [
      'Su valor no es solo matar: es crear prioridad, obligar respeto y rotar primero con herramientas todavía disponibles.',
      'El charm define muchas jugadas, pero el estado de wave define si esa jugada vale la pena.',
      'Sin ultimate o sin info lateral, pierde gran parte de su amenaza real.'
    ],
    setupVariants: [
      {
        id: 'ahri-mid-default',
        label: 'Electrocute pick default',
        role: 'MIDDLE',
        stance: 'default',
        summary: 'La lectura estándar para pick, push controlado y castigo sobre objetivos blandos.',
        keystone: 'Electrocute',
        skillOrder: ['Q', 'W', 'E'],
        itemPath: ['Luden\'s Companion', 'Shadowflame', 'Zhonya\'s Hourglass'],
        bestWhen: 'Querés jugar por prio y castigar targets blandos con buena transición a side o objetivo.',
        avoidWhen: 'La partida exige daño sostenido largo o mucha frontline difícil de atravesar.',
        playPatternShift: 'Push con intención y guardá herramientas para la jugada siguiente.',
        confidence: 'curated'
      }
    ],
    matchupPlans: [
      {
        opponentChampionName: 'Veigar',
        role: 'MIDDLE',
        verdict: 'skill',
        threat: 'Si regalás push o te encerrás mal contra jaula, el cruce se le simplifica.',
        answer: 'Ganale la prioridad antes y usá wave para moverte, no para quedarte tradeando donde él quiere.',
        setupAdjustments: ['Más respeto a cage', 'Prio antes de roam', 'No gastar R por chip dudoso'],
        confidence: 'curated'
      }
    ],
    highEloReads: [
      {
        id: 'ahri-mid-read-1',
        type: 'high_elo_pattern',
        label: 'La wave compra tu jugada',
        body: 'En Ahri, muchas roams “buenas” en idea salen mal porque nacen desde una wave mal resuelta. El patrón alto es comprar la jugada con prio, no robarla con ansiedad.',
        confidence: 'curated'
      }
    ],
    reviewTriggers: [
      {
        id: 'ahri-mid-trigger-1',
        label: 'Usaste R y no cambiaste estado de mapa',
        condition: 'Gastaste ultimate sin sacar kill, flash, wave o objetivo posterior.',
        whyItMatters: 'Ahri pierde mucho valor cuando su recurso principal no cambia el siguiente minuto.',
        prompts: ['¿Qué compró tu R?', '¿Podías guardar amenaza?', '¿La wave te habilitaba esa jugada?']
      }
    ],
    sourceLabel: 'Curated high-elo mid references + internal synthesis'
  },
  {
    championName: 'KaiSa',
    role: 'BOTTOM',
    patchStatus: 'patch_sensitive',
    identitySummary: 'Kai\'Sa ADC premia lectura de ventana, evolución y target selection disciplinado. Parece flexible, pero castiga mucho las entradas antes de tiempo.',
    identityBullets: [
      'Su daño cambia fuerte cuando llega a evoluciones clave; el timing importa mucho.',
      'Puede entrar profundo, pero sólo cuando la pelea ya mostró control y objetivo.',
      'Si queda forzada a front-to-back sin recursos, suele parecer más débil de lo que realmente es.'
    ],
    setupVariants: [
      {
        id: 'kaisa-adc-default',
        label: 'Standard evolve path',
        role: 'BOTTOM',
        stance: 'default',
        summary: 'La variante más confiable cuando querés llegar a picos claros sin hipotecar demasiado el early.',
        keystone: 'Hail of Blades',
        skillOrder: ['Q', 'E', 'W'],
        itemPath: ['Kraken Slayer', 'Guinsoo\'s Rageblade', 'Nashor\'s Tooth'],
        bestWhen: 'La partida te deja llegar ordenada a tus evoluciones y después decidir cuándo entrar.',
        avoidWhen: 'Necesitás respuesta demasiado defensiva demasiado temprano.',
        playPatternShift: 'Jugá por spike y entrada tardía, no por ser la primera en mostrarte.',
        confidence: 'curated'
      }
    ],
    matchupPlans: [
      {
        opponentChampionName: 'Draven',
        role: 'BOTTOM',
        verdict: 'difficult',
        threat: 'Te presiona antes de tus spikes y te castiga si tomás trades largos sin ayuda.',
        answer: 'Priorizá wave sana, no entregues reset malo y jugá para no llegar rota a la primera gran compra.',
        setupAdjustments: ['Más respeto a lane state', 'No pelear sin support/jg context', 'Back a tiempo antes de objective'],
        confidence: 'curated'
      }
    ],
    highEloReads: [
      {
        id: 'kaisa-adc-read-1',
        type: 'common_trap',
        label: 'Tener R no significa tener entrada',
        body: 'Muchos jugadores sienten que la R habilita cualquier dive; la lectura alta la usa cuando el target ya quedó marcado como realmente aislado o controlado.',
        confidence: 'curated'
      }
    ],
    reviewTriggers: [
      {
        id: 'kaisa-adc-trigger-1',
        label: 'Entraste antes de la pelea real',
        condition: 'Tu R te dejó dentro de la jugada antes de que el target estuviera de verdad expuesto.',
        whyItMatters: 'Kai\'Sa gana daño cuando entra tarde y limpia; entra peor cuando inaugura la pelea sin contexto.',
        prompts: ['¿Tu target ya estaba fijado?', '¿Tu frontline todavía había mostrado cooldowns?', '¿La evolución te alcanzaba para esa entrada?']
      }
    ],
    sourceLabel: 'Curated high-elo ADC references + internal synthesis'
  }
];
