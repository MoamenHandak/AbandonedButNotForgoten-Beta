import React from 'react';
import StarfieldCanvas from './StarfieldCanvas';
import FloatingCraftsCanvas from './FloatingCraftsCanvas';

export default function CosmicBackground({ isEntered = false, paused = false }) {
  return (
    <div className="cosmos-background" aria-hidden="true">
      <div className="nebula-layer" />
      <StarfieldCanvas isEntered={isEntered} paused={paused} />
      <FloatingCraftsCanvas paused={paused} />
      <div className="stars-deep-layer" />
      <div className="stars-mid-layer" />
      <div className="stars-foreground-layer" />
      <div className="space-particles">
        <span className="particle p-1" />
        <span className="particle p-2" />
        <span className="particle p-3" />
        <span className="particle p-4" />
        <span className="particle p-5" />
        <span className="particle p-6" />
        <span className="particle p-7" />
        <span className="particle p-8" />
      </div>
      <div className="nms-horizon-glow" />
    </div>
  );
}
