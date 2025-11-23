import React from 'react';
import {
  CATEGORY_OPTIONS,
  getCategoryOption
} from '../constants/categories';

type CategorySelectProps = {
  value: string;
  onChange: (nextCategory: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
  hideDescription?: boolean;
  hideLabel?: boolean;
};

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  variant = 'default',
  className = '',
  hideDescription = false,
  hideLabel = false
}) => {
  const activeOption = getCategoryOption(value);
  // Force rounded-full pour l'aspect "pilule" demandé, même en mode compact
  const containerShape = 'rounded-full';
  const selectPadding = variant === 'compact' ? 'text-[11px] px-3 py-2' : 'text-sm px-4 py-2.5';
  const labelStyle =
    variant === 'compact' ? 'text-[9px]' : 'text-[10px]';

  return (
    <label
      className={`flex flex-col gap-1 text-left ${className}`}
    >
      {!hideLabel && (
        <span
          className={`${labelStyle} font-bold uppercase tracking-[0.3em] text-gray-400`}
        >
          Filtrer par catégorie
        </span>
      )}
      <div className={`relative ${containerShape} bg-white/5 border border-white/15 overflow-hidden hover:bg-white/10 transition-colors duration-200 backdrop-blur-md`}>
        <select
          aria-label="Filtrer les cartes par catégorie"
          value={activeOption.value}
          onChange={(event) => onChange(event.target.value)}
          className={`appearance-none w-full bg-transparent text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-accent transition-all duration-200 pr-10 cursor-pointer ${selectPadding}`}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-gray-900 text-white">
              {`${option.emoji} ${option.value}`}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400 text-sm">
          ▾
        </span>
      </div>
      {!hideDescription && (
        <p className="text-[10px] text-gray-500 leading-snug">
          {activeOption.description}
        </p>
      )}
    </label>
  );
};

export default CategorySelect;

