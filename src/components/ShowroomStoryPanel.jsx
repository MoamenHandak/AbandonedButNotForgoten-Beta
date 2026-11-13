import React, { useState, useEffect } from 'react';
import { ChevronDown, BookOpenCheck, ShieldCheck, Compass, ExternalLink } from 'lucide-react';
import { getCraftStory, getStoryUiCopy } from '../data/craftStories';
import { playLock, playUnlock, playServo } from '../audio/surfaceAudio';

/**
 * Educational storytelling extension rendered inside the showroom's existing
 * Active Craft Dossier card (.showroom-menu-card -> .showroom-card-collapsible).
 */
export default function ShowroomStoryPanel({
  vehicleId,
  lang = 'en',
  onOpenSources,
}) {
  const storyData = getCraftStory(vehicleId, lang);
  const ui = getStoryUiCopy(lang);

  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const [selectedQuizIndex, setSelectedQuizIndex] = useState(null);
  const [visitChoice, setVisitChoice] = useState(null); // 'safe' | 'approach' | null

  // Reset interactive educational state whenever the visitor switches craft
  useEffect(() => {
    setLearnMoreOpen(false);
    setSelectedQuizIndex(null);
    setVisitChoice(null);
  }, [vehicleId]);

  if (!storyData) return null;

  const isUnverified = storyData.status === 'unverified';

  const handleToggleLearnMore = () => {
    setLearnMoreOpen((prev) => {
      const next = !prev;
      if (next) playServo('fly');
      else playUnlock();
      return next;
    });
  };

  const handleSelectQuiz = (idx) => {
    setSelectedQuizIndex(idx);
    if (storyData.quiz && idx === storyData.quiz.correctIndex) {
      playLock();
    } else {
      playUnlock();
    }
  };

  const handleSelectVisit = (choice) => {
    setVisitChoice(choice);
    if (choice === 'safe') playLock();
    else playUnlock();
  };

  const summaryLine = isUnverified
    ? storyData.statusNote
    : storyData.story.discovery || storyData.statusNote;

  return (
    <div
      className="story-dossier-extension"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Default compact one-sentence view + LEARN MORE toggle */}
      <div className="story-summary-bar">
        <p className="story-compact-line">{summaryLine}</p>
        <button
          id="btn-story-learn-more"
          type="button"
          className={`story-learn-more-btn ${learnMoreOpen ? 'is-open' : ''}`}
          aria-expanded={learnMoreOpen}
          onClick={handleToggleLearnMore}
        >
          <span>{learnMoreOpen ? ui.showLess : ui.learnMore}</span>
          <ChevronDown
            size={14}
            className="story-chevron-icon"
            aria-hidden="true"
          />
        </button>
      </div>

      {learnMoreOpen && (
        <div className="story-sections-stack">
          <div className="story-section-item">
            <span className="story-section-label">{ui.sectionLabels.question}</span>
            <p className="story-section-copy">{storyData.story.question}</p>
          </div>
          <div className="story-section-item">
            <span className="story-section-label">{ui.sectionLabels.experiment}</span>
            <p className="story-section-copy">{storyData.story.experiment}</p>
          </div>
          <div className="story-section-item">
            <span className="story-section-label">{ui.sectionLabels.discovery}</span>
            <p className="story-section-copy">{storyData.story.discovery}</p>
          </div>
          <div className="story-section-item">
            <span className="story-section-label">{ui.sectionLabels.ending}</span>
            <p className="story-section-copy">{storyData.story.ending}</p>
          </div>

          <div className="story-section-item story-verify-box">
            <span className="story-section-label">
              <ShieldCheck size={12} aria-hidden="true" /> {ui.sectionLabels.verify}
            </span>
            <div className="story-verify-meta">
              <div>
                <strong>{ui.operatorLabel}:</strong> {storyData.operator}
              </div>
              <div>
                <strong>{ui.launchLabel}:</strong> {storyData.launch}
              </div>
              <div>
                <strong>{ui.landingLabel}:</strong> {storyData.landing}
              </div>
            </div>
            {storyData.sources.length > 0 && (
              <ul className="story-source-mini-list">
                {storyData.sources.map((src) => (
                  <li key={src.id}>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>{src.label}</span>
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {onOpenSources && (
              <button
                type="button"
                className="story-inline-link-btn"
                onClick={() => {
                  playServo('fly');
                  onOpenSources();
                }}
              >
                {ui.viewAllSources}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task 4: Single-question Knowledge Check (non-punitive, audio cues) */}
      {storyData.quiz && (
        <div className="story-interactive-block">
          <div className="story-block-header">
            <BookOpenCheck size={13} aria-hidden="true" />
            <span>{ui.quizHeader}</span>
          </div>
          <p className="story-interactive-prompt">{storyData.quiz.prompt}</p>
          <div className="story-quiz-options">
            {storyData.quiz.options.map((option, idx) => {
              const isSelected = selectedQuizIndex === idx;
              const isMatched =
                selectedQuizIndex !== null && idx === storyData.quiz.correctIndex;
              return (
                <button
                  key={option}
                  type="button"
                  className={`story-choice-pill ${isSelected ? 'is-selected' : ''} ${
                    isMatched ? 'is-recommended' : ''
                  }`}
                  onClick={() => handleSelectQuiz(idx)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {selectedQuizIndex !== null && (
            <div className="story-feedback-note" role="status">
              <span className="story-feedback-tag">{ui.quizExplanationLabel}</span>
              <p>{storyData.quiz.explanation}</p>
            </div>
          )}
        </div>
      )}

      {/* Task 4: Preservation Decision — NASA 2011 recommendations */}
      {storyData.visitDecision && (
        <div className="story-interactive-block">
          <div className="story-block-header">
            <Compass size={13} aria-hidden="true" />
            <span>{storyData.visitDecision.prompt}</span>
          </div>
          <div className="story-visit-actions">
            <button
              type="button"
              className={`story-choice-pill ${visitChoice === 'safe' ? 'is-selected is-recommended' : ''}`}
              onClick={() => handleSelectVisit('safe')}
            >
              {ui.visitSafeBtn}
            </button>
            <button
              type="button"
              className={`story-choice-pill ${visitChoice === 'approach' ? 'is-selected' : ''}`}
              onClick={() => handleSelectVisit('approach')}
            >
              {ui.visitApproachBtn}
            </button>
          </div>
          {visitChoice && (
            <div className="story-feedback-note" role="status">
              <span className="story-feedback-tag">{ui.visitHint}</span>
              <p>
                {visitChoice === 'safe'
                  ? storyData.visitDecision.keepDistanceOutcome
                  : storyData.visitDecision.approachOutcome}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
