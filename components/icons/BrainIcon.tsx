import React from 'react';

export const BrainIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
    >
        {/* Contour principal du cerveau */}
        <path d="M12 3C8.5 3 6 5 5 7.5c-1 2.5-.5 5 .5 7 1 2 2 3.5 2.5 4.5.5 1 1.5 2 3 2h2c1.5 0 2.5-1 3-2 .5-1 1.5-2.5 2.5-4.5 1-2 1.5-4.5.5-7-1-2.5-3.5-4.5-7-4.5z" />

        {/* Circonvolutions gauche */}
        <path d="M8 9c.5-.8 1-1.2 1.5-1" />
        <path d="M7.5 12c.7-.5 1.3-.6 2-.4" />
        <path d="M8.5 15.5c.6-.4 1.2-.5 1.8-.3" />

        {/* Circonvolutions droite */}
        <path d="M16 9c-.5-.8-1-1.2-1.5-1" />
        <path d="M16.5 12c-.7-.5-1.3-.6-2-.4" />
        <path d="M15.5 15.5c-.6-.4-1.2-.5-1.8-.3" />

        {/* Séparation hémisphères */}
        <path d="M12 6v12" strokeDasharray="2 2" opacity="0.4" />
    </svg>
);
