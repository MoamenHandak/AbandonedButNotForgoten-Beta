/**
 * storyProgression.js
 * Manages player progression through the NASA Hackathon story campaign:
 * - Locks the opposite destination once an initial choice is made (Moon vs. Mars).
 * - Enforces spacecraft-by-spacecraft unlocking within each area via quiz completion.
 * - Triggers area transition to the second planet/moon upon completing all area quizzes.
 * - Unlocks the grand campaign completion upon solving all 12 spacecraft quizzes.
 * - Persists state in localStorage with reactive update dispatch.
 */

const STORAGE_KEY = 'abnf_story_progression_v1';

export function getStoryProgression() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          firstChoice: parsed.firstChoice || null, // 'moon' | 'mars'
          completedQuizzes: parsed.completedQuizzes || {}, // { [craftId]: true }
          completedAreas: parsed.completedAreas || { moon: false, mars: false },
          allCompleted: Boolean(parsed.allCompleted)
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load story progression from localStorage:', err);
  }

  return {
    firstChoice: null,
    completedQuizzes: {},
    completedAreas: { moon: false, mars: false },
    allCompleted: false
  };
}

export function saveStoryProgression(progression) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progression));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storyProgressionUpdated', { detail: progression }));
    }
  } catch (err) {
    console.warn('Failed to save story progression to localStorage:', err);
  }
}

export function resetStoryProgression() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storyProgressionUpdated', { detail: getStoryProgression() }));
    }
  } catch (err) {
    console.warn('Failed to reset story progression:', err);
  }
}

/**
 * Record initial choice at Scene 3 (Choice screen).
 * Defaults to 'moon' as the mandatory first destination.
 */
export function recordInitialChoice(destination = 'moon') {
  const current = getStoryProgression();
  if (!current.firstChoice) {
    current.firstChoice = 'moon';
    saveStoryProgression(current);
  }
  return current;
}

/**
 * Check if a destination area (moon / mars) is currently locked.
 * In Story Mode: The Moon is always the starting sector.
 * Mars is locked until the Moon area is fully completed.
 */
export function isAreaLocked(area, progression) {
  if (!progression || progression.allCompleted) return false;

  // The Moon is never locked — it is always the starting destination
  if (area === 'moon') return false;

  // Mars is locked until the Moon sector is completed
  if (area === 'mars') {
    const isMoonCompleted = Boolean(progression.completedAreas?.moon);
    return !isMoonCompleted;
  }

  return false;
}

/**
 * Check if a specific craft is unlocked in the given area vehicles list.
 * Vehicle 0 is always unlocked. Subsequent vehicles require the previous
 * vehicle's quiz to be completed.
 */
export function isCraftUnlocked(craftId, vehiclesList, progression) {
  if (!vehiclesList || vehiclesList.length === 0) return true;
  if (!progression || progression.allCompleted) return true;

  const craftIdx = vehiclesList.findIndex((v) => v.id === craftId);
  if (craftIdx <= 0) return true; // First vehicle is always unlocked

  const currentCraft = vehiclesList[craftIdx];
  // Overview phases are unlocked once the preceding craft is unlocked/completed
  if (currentCraft?.isOverviewPhase) {
    const prevCraft = vehiclesList[craftIdx - 1];
    return !prevCraft || Boolean(progression.completedQuizzes?.[prevCraft.id]);
  }

  // Check if every preceding craft has its quiz completed (skipping overview phases)
  for (let i = 0; i < craftIdx; i++) {
    const prevCraft = vehiclesList[i];
    if (prevCraft.isOverviewPhase) continue;
    if (!progression.completedQuizzes?.[prevCraft.id]) {
      return false;
    }
  }

  return true;
}

/**
 * Record a completed quiz for a vehicle.
 * Updates completedQuizzes, checks for area completion and campaign completion.
 */
export function recordQuizCompleted(craftId, currentDestination, areaVehicles) {
  const progression = getStoryProgression();
  progression.completedQuizzes = progression.completedQuizzes || {};
  const wasAlreadyCompleted = Boolean(progression.completedQuizzes[craftId]);
  progression.completedQuizzes[craftId] = true;

  // Check if all craft in the active area are now completed (excluding overview phases)
  let isAreaComplete = false;
  if (areaVehicles && areaVehicles.length > 0) {
    const allInAreaDone = areaVehicles
      .filter((v) => !v.isOverviewPhase)
      .every((v) => progression.completedQuizzes[v.id]);
    if (allInAreaDone) {
      progression.completedAreas = progression.completedAreas || {};
      progression.completedAreas[currentDestination] = true;
      isAreaComplete = true;
    }
  }

  // Check if both Moon (4 craft) and Mars (8 craft) are completed
  const moonComplete = Boolean(progression.completedAreas?.moon);
  const marsComplete = Boolean(progression.completedAreas?.mars);
  let isCampaignComplete = false;

  if (moonComplete && marsComplete) {
    progression.allCompleted = true;
    isCampaignComplete = true;
  }

  saveStoryProgression(progression);

  return {
    progression,
    isNewCompletion: !wasAlreadyCompleted,
    isAreaComplete,
    isCampaignComplete
  };
}

/**
 * In Arcade Mode (Spacecrafts browser from Main Menu), only crafts completed
 * in Story Mode are viewable in full 3D.
 * Any craft not in the 12 completed or unverified is locked.
 */
export function isCraftViewableInArcade(craftId, progression) {
  if (!craftId) return false;
  if (craftId.includes('orbit-system')) return true;
  const p = progression || getStoryProgression();
  if (p.allCompleted) return true;
  return Boolean(p.completedQuizzes?.[craftId]);
}

/**
 * Get the next area in the story order.
 */
export function getOppositeArea(area) {
  return area === 'moon' ? 'mars' : 'moon';
}
