export interface ProjectCandidate {
  id: string;
  name: string;
  code?: string;
  aliases?: string[];
}

export const CANONICAL_ZENITH_PROJECTS: ProjectCandidate[] = [
  {
    id: 'prj-1788913156076',
    name: '1915 Ramsay St. SE',
    code: 'RSY(E)',
    aliases: [
      '1915 ramsay st se',
      '1915 ramsay',
      '1915 ramsay st',
      '1915 ramsay street',
      '1915',
      'rsy(e)',
      'rsye',
      'rsy e',
      'ramsay east',
      '1915 ramsay street se'
    ]
  },
  {
    id: 'prj-1788913164058',
    name: '1917 Ramsay St. SE',
    code: 'RSY(W)',
    aliases: [
      '1917 ramsay st se',
      '1917 ramsay',
      '1917 ramsay st',
      '1917 ramsay street',
      '1917',
      'rsy(w)',
      'rsyw',
      'rsy w',
      'ramsay west',
      '1917 ramsay street se'
    ]
  },
  {
    id: 'prj-1788913951890',
    name: 'Glenbrook 44',
    code: 'GL44',
    aliases: [
      'glenbrook 44',
      'glenbrook',
      'gl44',
      'gl 44',
      '4503 37 av sw',
      'glenbrook44'
    ]
  },
  {
    id: 'prj-1788869248449',
    name: 'Vision Quest 4-Plex',
    code: 'VQ',
    aliases: [
      'vq',
      'capitol hill',
      'vision quest',
      'visionquest',
      'vision quest 4-plex',
      'vision quest 4plex',
      'vision quest 4 plex',
      'vision quest four plex',
      'vq 4-plex',
      'vq 4plex'
    ]
  },
  {
    id: 'prj-1788869132853',
    name: '2016/2018  Alexander St. SE',
    code: 'ALX2018',
    aliases: [
      '2016/2018 alexander st se',
      '2016 2018 alexander',
      'alexander',
      'alexander st',
      'alx2018',
      'alx 2018',
      '2016 alexander',
      '2018 alexander',
      '2016/2018 alexander st. se'
    ]
  },
  {
    id: 'prj-1788865348173',
    name: 'Westgate 47',
    code: 'W47',
    aliases: [
      'westgate 47',
      'westgate',
      'w47',
      'w 47',
      'westgate47'
    ]
  }
];

/**
 * Normalizes project names by removing punctuation, lowercasing, and stripping whitespace
 * e.g., "1915 Ramsay St. SE" -> "1915 ramsay st se"
 */
export function normalizeProjectString(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fuzzy matches an input project name/code strictly against the 6 canonical Zenith projects.
 * Keyword Rules:
 * - "1915" or "1915 Ramsay" -> Map to 1915 Ramsay St. SE (prj-1788913156076)
 * - "1917" or "1917 Ramsay" -> Map to 1917 Ramsay St. SE (prj-1788913164058)
 * - "Glenbrook" or "44" -> Map to Glenbrook 44 (prj-1788913951890)
 * - "VQ", "Vision Quest", or "Capitol Hill" -> Map to Vision Quest 4-Plex (prj-1788869248449)
 * - "Westgate" or "47" -> Map to Westgate 47 (prj-1788865348173)
 * - "Alexander" or "2016" or "2018" -> Map to 2016/2018  Alexander St. SE (prj-1788869132853)
 * - If no keyword matches, assigns to "1915 Ramsay St. SE" without creating new project documents.
 */
export function matchProjectCandidate(
  input: string,
  extraCandidates: ProjectCandidate[] = []
): { projectId: string; projectName: string } {
  const fallback = CANONICAL_ZENITH_PROJECTS[0]; // 1915 Ramsay St. SE (prj-1788913156076)
  if (!input || typeof input !== 'string') {
    return { projectId: fallback.id, projectName: fallback.name };
  }
  const rawClean = input.trim();
  const normInput = normalizeProjectString(rawClean);
  if (!normInput) {
    return { projectId: fallback.id, projectName: fallback.name };
  }

  // 1. High-priority explicit keyword matching
  // VQ, Vision Quest, or Capitol Hill -> Vision Quest 4-Plex (prj-1788869248449)
  if (
    normInput === 'vq' ||
    normInput.includes('capitol hill') ||
    normInput.includes('vision quest') ||
    normInput.includes('visionquest')
  ) {
    const vq = CANONICAL_ZENITH_PROJECTS[3];
    return { projectId: vq.id, projectName: vq.name };
  }

  // "1915" or "1915 Ramsay" -> 1915 Ramsay St. SE (prj-1788913156076)
  if (
    normInput.includes('1915') ||
    normInput.includes('rsy e') ||
    normInput.includes('rsye') ||
    normInput.includes('ramsay east')
  ) {
    const p1915 = CANONICAL_ZENITH_PROJECTS[0];
    return { projectId: p1915.id, projectName: p1915.name };
  }

  // "1917" or "1917 Ramsay" -> 1917 Ramsay St. SE (prj-1788913164058)
  if (
    normInput.includes('1917') ||
    normInput.includes('rsy w') ||
    normInput.includes('rsyw') ||
    normInput.includes('ramsay west')
  ) {
    const p1917 = CANONICAL_ZENITH_PROJECTS[1];
    return { projectId: p1917.id, projectName: p1917.name };
  }

  // "Glenbrook" or "44" -> Glenbrook 44 (prj-1788913951890)
  if (
    normInput.includes('glenbrook') ||
    normInput.includes('gl44') ||
    normInput.includes('gl 44') ||
    normInput.includes('44')
  ) {
    const gl = CANONICAL_ZENITH_PROJECTS[2];
    return { projectId: gl.id, projectName: gl.name };
  }

  // "Westgate" or "47" -> Westgate 47 (prj-1788865348173)
  if (
    normInput.includes('westgate') ||
    normInput.includes('w47') ||
    normInput.includes('w 47') ||
    normInput.includes('47')
  ) {
    const wg = CANONICAL_ZENITH_PROJECTS[5];
    return { projectId: wg.id, projectName: wg.name };
  }

  // "Alexander" or "2016" or "2018" -> 2016/2018  Alexander St. SE (prj-1788869132853)
  if (
    normInput.includes('alexander') ||
    normInput.includes('alx2018') ||
    normInput.includes('alx 2018') ||
    normInput.includes('2016') ||
    normInput.includes('2018')
  ) {
    const alx = CANONICAL_ZENITH_PROJECTS[4];
    return { projectId: alx.id, projectName: alx.name };
  }

  // 2. Exact match against canonical projects (id, name, or code)
  for (const cand of CANONICAL_ZENITH_PROJECTS) {
    if (cand.id && (cand.id === rawClean || cand.id.toLowerCase() === rawClean.toLowerCase())) {
      return { projectId: cand.id, projectName: cand.name };
    }
    const candNorm = normalizeProjectString(cand.name);
    if (candNorm === normInput) {
      return { projectId: cand.id, projectName: cand.name };
    }
    if (cand.code && normalizeProjectString(cand.code) === normInput) {
      return { projectId: cand.id, projectName: cand.name };
    }
    if (cand.aliases) {
      for (const alias of cand.aliases) {
        if (normalizeProjectString(alias) === normInput) {
          return { projectId: cand.id, projectName: cand.name };
        }
      }
    }
  }

  // 3. Substring match against canonical candidates
  for (const cand of CANONICAL_ZENITH_PROJECTS) {
    const candNorm = normalizeProjectString(cand.name);
    if (candNorm.includes(normInput) || normInput.includes(candNorm)) {
      return { projectId: cand.id, projectName: cand.name };
    }
  }

  // 4. Default strictly to 1915 Ramsay St. SE
  return { projectId: fallback.id, projectName: fallback.name };
}
