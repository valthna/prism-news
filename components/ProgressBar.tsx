import React from 'react';

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-1 bg-black/40 z-[60]">
      <div 
        className="h-full bg-neon-accent transition-all duration-300 ease-linear" 
        style={{ 
          width: `${progress * 100}%`,
          boxShadow: '0 0 8px #00FF88, 0 0 12px #00FF88'
        }}
      ></div>
    </div>
  );
};

export default ProgressBar;
