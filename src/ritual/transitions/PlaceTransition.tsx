// PlaceTransition — simple fade between navigation places

import { type ReactNode } from 'react';

interface PlaceTransitionProps {
  placeKey: string;
  children: ReactNode;
}

export function PlaceTransition({ placeKey, children }: PlaceTransitionProps) {
  return (
    <div
      key={placeKey}
      style={{
        width: '100%',
        height: '100%',
        animation: 'fadeIn 300ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
