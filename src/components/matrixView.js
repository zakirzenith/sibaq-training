import { renderDailyProgressView } from './dailyProgressView.js';

/**
 * Assignment Matrix is replaced by the Daily Progress & Mentorship Tracker.
 * Delegating renderMatrixView to renderDailyProgressView to maintain backwards compatibility.
 */
export function renderMatrixView(container, navigateTo) {
  renderDailyProgressView(container, navigateTo);
}
