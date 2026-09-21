import type { DiagnosticGuide, KnowledgeCategory } from '../../types/knowledgeBase';

const KNOWLEDGE_STORAGE_KEY = 'artisan_knowledge_base_v1';

export const DEFAULT_DIAGNOSTIC_GUIDES: DiagnosticGuide[] = [
  // 1. Code Couleur RJ45 T568B
  {
    id: 'kb-1',
    title: 'Code Couleur Câblage RJ45 (Norme T568B)',
    category: 'network',
    brand: 'Universel',
    symptom: 'Ordre de sertissage des fils dans le connecteur RJ45 mâle',
    cause: 'La norme T568B est le standard universel pour le réseau et les caméras IP.',
    solutionSteps: [
      'Dénuder le câble UTP sur environ 2.5 cm sans entailler les paires.',
      'Détordre et aligner les fils à plat de gauche à droite :',
      '1. Blanc-Orange',
      '2. Orange',
      '3. Blanc-Vert',
      '4. Bleu',
      '5. Blanc-Bleu',
      '6. Vert',
      '7. Blanc-Marron',
      '8. Marron',
      'Couper les fils bien droits à environ 1.2 cm.',
      'Insérer à fond dans le connecteur RJ45 (languette vers le bas).',
      'Sertir fermement avec la pince et tester au testeur de câble (les LEDs 1 à 8 doivent défiler dans l\'ordre).'
    ],
    tags: ['rj45', 't568b', 'sertissage', 'câblage', 'couleur', 'réseau'],
    isFavorite: true,
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 2. Hikvision & HiLook
  {
    id: 'kb-2',
    title: 'Hikvision & HiLook : IP, Ports & Déblocage Mot de Passe',
    category: 'cctv',
    brand: 'Hikvision',
    defaultIp: '192.168.1.64',
    defaultPort: '8000 (SDK) / 80 (HTTP) / 554 (RTSP)',
    defaultCredentials: 'admin / (à initialiser via SADP)',
    symptom: 'Caméra ou NVR Hikvision neuf introuvable ou mot de passe perdu',
    cause: 'Les équipements Hikvision sont livrés inactifs par défaut sur l\'adresse IP 192.168.1.64.',
    solutionSteps: [
      'Télécharger et ouvrir le logiciel SADP Tool sur PC connecté au même réseau ou switch.',
      'L\'appareil apparaît avec le statut "Inactive".',
      'Cocher l\'appareil et créer un mot de passe fort (ex: 8 caractères avec majuscule, chiffre et symbole).',
      'Modifier l\'adresse IP pour qu\'elle corresponde au plan d\'adressage du client (ex: 192.168.1.201).',
      'En cas de mot de passe perdu : dans SADP, cliquer sur "Forgot Password" -> exporter le fichier XML ou scanner le QR code pour obtenir la clé de réinitialisation.'
    ],
    tags: ['hikvision', 'hilook', 'sadp', '192.168.1.64', 'mot de passe', '8000'],
    isFavorite: true,
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 3. Dahua & Imou
  {
    id: 'kb-3',
    title: 'Dahua & Imou : IP, Ports & Initialisation ConfigTool',
    category: 'cctv',
    brand: 'Dahua',
    defaultIp: '192.168.1.108',
    defaultPort: '37777 (TCP) / 80 (HTTP) / 554 (RTSP)',
    defaultCredentials: 'admin / (à initialiser via ConfigTool)',
    symptom: 'Caméra Dahua neuve introuvable ou réinitialisation',
    cause: 'IP par défaut fixée à 192.168.1.108 avec initialisation obligatoire.',
    solutionSteps: [
      'Lancer le logiciel Dahua ConfigTool sur PC connecté au réseau.',
      'Cliquer sur "Initialize" sur l\'appareil détecté.',
      'Définir le mot de passe admin et une adresse email de récupération.',
      'Configurer l\'adresse IP statique du réseau client.',
      'Pour réinitialiser une caméra Dahua physiquement : appuyer sur le bouton reset physique (sur la carte SD ou le câble) pendant 10 à 15 secondes sous tension.'
    ],
    tags: ['dahua', 'imou', 'configtool', '192.168.1.108', '37777', 'reset'],
    isFavorite: true,
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 4. NVR qui bipe
  {
    id: 'kb-4',
    title: 'NVR / DVR : Bips Continus ou Répétés',
    category: 'cctv',
    brand: 'Universel',
    symptom: 'L\'enregistreur NVR ou DVR émet des bips sonores stridents non-stop',
    cause: 'Anomalie disque dur (non formaté, en panne, plein) ou conflit réseau IP.',
    solutionSteps: [
      'Aller dans Menu Principal -> Alarme -> Exception (ou Événements).',
      'Vérifier les déclencheurs actifs : "Pas de disque", "Erreur disque", "Conflit IP", "Perte vidéo".',
      'Si c\'est une erreur de disque neuf : aller dans Stockage -> Gestion des disques -> Cocher le disque -> Formater / Initialiser.',
      'Si le disque n\'est pas détecté : vérifier le câble SATA et l\'alimentation du disque (ou tester avec un autre disque surveillance 12V).',
      'Si l\'alimentation 12V du NVR faiblit (ampérage insuffisant), le disque ne démarre pas et fait biper la carte mère.'
    ],
    tags: ['bip', 'nvr', 'dvr', 'disque dur', 'sata', 'formatage', 'erreur'],
    isFavorite: true,
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 5. Perte de signal vidéo la nuit (chute de tension)
  {
    id: 'kb-5',
    title: 'Caméra Décroche la Nuit / Écran Noir en Vision Nocturne',
    category: 'power',
    brand: 'Universel',
    symptom: 'La caméra fonctionne parfaitement le jour mais se coupe ou redémarre dès la tombée de la nuit',
    cause: 'Chute de tension sur longue distance : les LEDs infrarouges doublent ou triplent la consommation (passe de 2W à 7W+).',
    solutionSteps: [
      'Mesurer la tension 12V au pied de la caméra la nuit quand les infrarouges sont allumés. Si la tension descend en dessous de 10.8V, la caméra redémarre.',
      'Remplacer le câble d\'alimentation par une section plus forte (ex: 2x1.0mm² ou 2x1.5mm² au lieu de 2x0.5mm²).',
      'Ou rapprocher le bloc d\'alimentation 12V directement à côté de la caméra (boîtier étanche).',
      'En PoE : vérifier le budget de puissance total du switch PoE (802.3af 15.4W vs 802.3at PoE+ 30W).'
    ],
    tags: ['ir', 'infrarouge', 'nuit', 'chute de tension', '12v', 'poe', 'redémarrage'],
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 6. Conflit d'adresse IP
  {
    id: 'kb-6',
    title: 'Conflit IP / Caméra qui clignote En Ligne / Hors Ligne',
    category: 'network',
    brand: 'Universel',
    symptom: 'La caméra apparaît et disparaît par intermittence dans le NVR ou sur l\'application smartphone',
    cause: 'Deux équipements partagent la même adresse IP sur le réseau (ex: caméra et téléphone client en DHCP).',
    solutionSteps: [
      'Débrancher le câble réseau de la caméra en cause.',
      'Depuis un PC sur le même réseau, exécuter la commande : ping [adresse_ip_caméra].',
      'Si l\'IP répond toujours alors que la caméra est débranchée, un autre appareil utilise cette IP.',
      'Assigner une IP fixe hors de la plage DHCP de la box/routeur (ex: si DHCP distribue 192.168.1.2 à 192.168.1.100, mettre les caméras à partir de 192.168.1.201).',
      'Rebrancher la caméra et mettre à jour l\'adresse dans le NVR.'
    ],
    tags: ['conflit ip', 'hors ligne', 'clignote', 'ping', 'dhcp', 'statique'],
    updatedAt: new Date().toISOString().split('T')[0]
  },

  // 7. MikroTik & Routeurs 4G
  {
    id: 'kb-7',
    title: 'Routeurs MikroTik / 4G : Adresses & Accès Winbox',
    category: 'network',
    brand: 'MikroTik',
    defaultIp: '192.168.88.1',
    defaultPort: '8291 (Winbox) / 80 (WebFig)',
    defaultCredentials: 'admin / (sans mot de passe par défaut)',
    symptom: 'Accès administration routeur sur chantier sans internet',
    cause: 'Paramètres d\'usine MikroTik RouterOS.',
    solutionSteps: [
      'Brancher le PC sur le port LAN 2, 3, 4 ou 5 (le port 1 est souvent réservé WAN/Internet).',
      'Lancer Winbox -> onglet "Neighbors" -> double-cliquer sur l\'adresse MAC détectée.',
      'Identifiant : admin, Mot de passe : vide.',
      'Pour réinitialiser complètement : maintenir le bouton Reset enfoncé pendant le branchement électrique jusqu\'à ce que la LED USR clignote (environ 5 secondes).'
    ],
    tags: ['mikrotik', 'winbox', '192.168.88.1', 'routeur', '8291', 'reset'],
    updatedAt: new Date().toISOString().split('T')[0]
  }
];

export const KNOWLEDGE_CATEGORIES: { key: KnowledgeCategory; label: string; iconName: string; color: string }[] = [
  { key: 'cctv', label: 'Vidéosurveillance (CCTV)', iconName: 'Camera', color: 'text-amber-400' },
  { key: 'network', label: 'Câblage & Réseau', iconName: 'Network', color: 'text-sky-400' },
  { key: 'power', label: 'Alimentation & Énergie', iconName: 'Zap', color: 'text-emerald-400' },
  { key: 'intercom', label: 'Interphonie & Contrôle', iconName: 'PhoneCall', color: 'text-purple-400' },
  { key: 'other', label: 'Divers & Astuces', iconName: 'HelpCircle', color: 'text-slate-400' }
];

export const loadKnowledgeBase = (): DiagnosticGuide[] => {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
    if (!raw) {
      saveAllGuides(DEFAULT_DIAGNOSTIC_GUIDES);
      return DEFAULT_DIAGNOSTIC_GUIDES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    saveAllGuides(DEFAULT_DIAGNOSTIC_GUIDES);
    return DEFAULT_DIAGNOSTIC_GUIDES;
  } catch (err) {
    console.warn('Failed to parse knowledge base from localStorage, falling back to defaults:', err);
    return DEFAULT_DIAGNOSTIC_GUIDES;
  }
};

export const saveAllGuides = (guides: DiagnosticGuide[]): void => {
  try {
    localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(guides));
  } catch (err) {
    console.error('Failed to save knowledge base to localStorage:', err);
  }
};

export const saveGuide = (guide: DiagnosticGuide): DiagnosticGuide[] => {
  const current = loadKnowledgeBase();
  const index = current.findIndex(g => g.id === guide.id);
  const updatedGuide: DiagnosticGuide = {
    ...guide,
    updatedAt: new Date().toISOString().split('T')[0]
  };

  let next: DiagnosticGuide[];
  if (index >= 0) {
    next = [...current];
    next[index] = updatedGuide;
  } else {
    next = [updatedGuide, ...current];
  }
  saveAllGuides(next);
  return next;
};

export const toggleGuideFavorite = (id: string): DiagnosticGuide[] => {
  const current = loadKnowledgeBase();
  const next = current.map(guide => {
    if (guide.id === id) {
      return {
        ...guide,
        isFavorite: !guide.isFavorite,
        updatedAt: new Date().toISOString().split('T')[0]
      };
    }
    return guide;
  });
  saveAllGuides(next);
  return next;
};

export const deleteGuide = (id: string): DiagnosticGuide[] => {
  const current = loadKnowledgeBase();
  const next = current.filter(g => g.id !== id);
  saveAllGuides(next);
  return next;
};

export const resetKnowledgeBaseToDefault = (): DiagnosticGuide[] => {
  saveAllGuides(DEFAULT_DIAGNOSTIC_GUIDES);
  return DEFAULT_DIAGNOSTIC_GUIDES;
};
