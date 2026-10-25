import { Project } from '../types';
import rawProjects from './realZenithProjects.json';

/**
 * The 6 Real Zenith Portfolio Projects:
 * 1. Glenbrook 44 (GL44)
 * 2. 1917 Ramsay St. SE (RSY(W))
 * 3. 1915 Ramsay St. SE (RSY(E))
 * 4. Vision Quest 4-Plex (VQ)
 * 5. 2016/2018 Alexander St. SE (ALX2018)
 * 6. Westgate 47 (W47)
 */
export const REAL_ZENITH_PROJECTS: Project[] = rawProjects as unknown as Project[];

export const CANONICAL_ZENITH_PROJECT_IDS: ReadonlySet<string> = new Set(
  REAL_ZENITH_PROJECTS.map((p) => p.id)
);
