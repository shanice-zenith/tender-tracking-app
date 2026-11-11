/**
 * UNIVERSAL DYNAMIC PROJECT MATCHER
 * Normalizes addresses, numbers, and street names dynamically.
 * Works for ANY project created in the app without editing code.
 */

// Helper: strips punctuation, extra spaces, and common street suffixes
export function normalizeProjectString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b(street|st\.?|avenue|ave\.?|boulevard|blvd\.?|drive|dr\.?|crescent|cres\.?|road|rd\.?|lane|ln\.?|court|ct\.?|way|place|pl\.?)\b/gi, '')
    .replace(/\b(nw|ne|sw|se)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Guaranteed never to return null
export function matchProjectCandidate(raw: string) {
  const clean = (raw || '').trim();
  return {
    projectName: clean || 'General Project',
    projectId: clean || 'General Project',
    normalized: normalizeProjectString(clean)
  };
}

/**
 * Universal project comparator.
 * Checks if an incoming quote's project string matches a project in the app.
 */
export function isProjectMatch(
  incomingProjectStr: string,
  targetProject: { id: string; name: string }
): boolean {
  if (!incomingProjectStr || !targetProject) return false;

  const rawClean = incomingProjectStr.trim().toLowerCase();
  const projIdClean = (targetProject.id || '').trim().toLowerCase();
  const projNameClean = (targetProject.name || '').trim().toLowerCase();

  // 1. Direct ID or Name exact match
  if (rawClean === projIdClean || rawClean === projNameClean) return true;

  // 2. Direct inclusion (e.g. "1512 Child" inside "1512 Child Ave NE")
  if (projNameClean && (projNameClean.includes(rawClean) || rawClean.includes(projNameClean))) {
    return true;
  }

  // 3. Normalized street match (ignores St, Ave, NE/NW/SE/SW, punctuation, and casing)
  const normIncoming = normalizeProjectString(incomingProjectStr);
  const normTargetName = normalizeProjectString(targetProject.name);
  const normTargetId = normalizeProjectString(targetProject.id);

  if (normIncoming && normTargetName) {
    if (normIncoming === normTargetName || normTargetName.includes(normIncoming) || normIncoming.includes(normTargetName)) {
      return true;
    }
  }

  if (normIncoming && normTargetId) {
    if (normIncoming === normTargetId || normTargetId.includes(normIncoming) || normIncoming.includes(normTargetId)) {
      return true;
    }
  }

  // 4. Street number check (e.g. "1512" matches "1512 Child", but "1915" will never match "1917")
  const incomingNumbers = incomingProjectStr.match(/\d+/g);
  const targetNumbers = (targetProject.name + ' ' + targetProject.id).match(/\d+/g);
  if (incomingNumbers && targetNumbers) {
    const numbersMatch = incomingNumbers.some((num) => targetNumbers.includes(num));
    if (numbersMatch) {
      // Ensure at least one keyword matches so different projects on the same number don't collide
      const incomingWords = incomingProjectStr.toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      const targetWords = targetProject.name.toLowerCase().replace(/[^a-z]/g, ' ').split(/\s+/).filter(w => w.length > 2);
      if (incomingWords.some(w => targetWords.includes(w))) {
        return true;
      }
    }
  }

  return false;
}