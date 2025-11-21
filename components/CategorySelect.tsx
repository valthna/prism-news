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
};

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  variant = 'default',
  className = '',
  hideDescription = false
}) => {
  const activeOption = getCategoryOption(value);
  const selectPadding =
    variant === 'compact'
      ? 'text-[11px] px-3 py-2 rounded-xl'
      : 'text-sm px-4 py-2.5 rounded-full';
  const labelStyle =
    variant === 'compact' ? 'text-[9px]' : 'text-[10px]';

  return (
    <label
      className={`flex flex-col gap-1 text-left ${className}`}
    >
      <span
        className={`${labelStyle} font-bold uppercase tracking-[0.3em] text-gray-400`}
      >
        Filtrer par catégorie
      </span>
      <div className="relative">
        <select
          aria-label="Filtrer les cartes par catégorie"
          value={activeOption.value}
          onChange={(event) => onChange(event.target.value)}
          className={`appearance-none w-full bg-white/5 border border-white/15 text-white font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-accent transition-all duration-200 pr-10 ${selectPadding}`}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
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

