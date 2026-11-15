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
 * Locks the other destination until the chosen sector is completed.
 */
export function recordInitialChoice(destination) {
  const current = getStoryProgression();
  if (!current.firstChoice) {
    current.firstChoice = destination;
    saveStoryProgression(current);
  }
  return current;
}

/**
 * Check if a destination area (moon / mars) is currently locked.
 */
export function isAreaLocked(area, progression) {
  if (!progression || progression.allCompleted) return false;
  if (!progression.firstChoice) return false;

  // The chosen first destination is never locked
  if (progression.firstChoice === area) return false;

  // The second destination is locked until the first destination's area is completed
  const firstAreaCompleted = Boolean(progression.completedAreas?.[progression.firstChoice]);
  return !firstAreaCompleted;
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

  // Check if every preceding craft has its quiz completed
  for (let i = 0; i < craftIdx; i++) {
    const prevCraft = vehiclesList[i];
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

  // Check if all craft in the active area are now completed
  let isAreaComplete = false;
  if (areaVehicles && areaVehicles.length > 0) {
    const allInAreaDone = areaVehicles.every((v) => progression.completedQuizzes[v.id]);
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
 * Get the next area in the story order.
 */
export function getOppositeArea(area) {
  return area === 'moon' ? 'mars' : 'moon';
}
