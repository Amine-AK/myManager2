// ==========================================
// TECHNICAL KNOWLEDGE BASE & FIELD DIAGNOSTICS
// Specialized for CCTV, Network, Intercom & Electronics Technicians
// ==========================================

export type KnowledgeCategory =
  | 'cctv'      // Vidéosurveillance & Sécurité (Dahua, Hikvision, NVR, DVR)
  | 'network'   // Câblage & Réseau (RJ45, Switch, Routeur, IP, WiFi)
  | 'power'     // Alimentation & Énergie (12V, PoE, Disque Dur, Batteries)
  | 'intercom'  // Interphonie & Contrôle d'accès (Visiophone, Gâche)
  | 'other';    // Divers & Astuces

export interface DiagnosticGuide {
  id: string;
  title: string;
  category: KnowledgeCategory;
  brand?: string;             // e.g. "Dahua", "Hikvision", "TP-Link", "MikroTik", "Générique"
  defaultIp?: string;         // e.g. "192.168.1.108"
  defaultPort?: string;       // e.g. "37777 / 80 / 554"
  defaultCredentials?: string;// e.g. "admin / (à initialiser)"
  symptom: string;            // What is happening (e.g. "Le NVR émet des bips continus")
  cause?: string;             // Probable root cause
  solutionSteps: string[];    // Step-by-step instructions
  tags: string[];             // Search tags
  isFavorite?: boolean;
  updatedAt: string;          // ISO date YYYY-MM-DD
}
