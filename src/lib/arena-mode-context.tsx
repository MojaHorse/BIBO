'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';

interface ArenaModeContextType {
  isInActiveMatch: boolean;
  setIsInActiveMatch: (active: boolean) => void;
}

const ArenaModeContext = createContext<ArenaModeContextType>({
  isInActiveMatch: false,
  setIsInActiveMatch: () => {},
});

export const ArenaModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInActiveMatch, setIsInActiveMatch] = useState(false);

  const value = useMemo(
    () => ({ isInActiveMatch, setIsInActiveMatch }),
    [isInActiveMatch]
  );

  return (
    <ArenaModeContext.Provider value={value}>
      {children}
    </ArenaModeContext.Provider>
  );
};

export function useArenaMode() {
  return useContext(ArenaModeContext);
}
