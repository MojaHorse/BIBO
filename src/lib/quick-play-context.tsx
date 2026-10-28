'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameId } from './games/types';

interface QuickPlayContextType {
  isOpen: boolean;
  initialGame?: GameId;
  openQuickPlay: (defaultGame?: GameId) => void;
  closeQuickPlay: () => void;
}

const QuickPlayContext = createContext<QuickPlayContextType>({
  isOpen: false,
  openQuickPlay: () => {},
  closeQuickPlay: () => {},
});

export const QuickPlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialGame, setInitialGame] = useState<GameId | undefined>(undefined);

  const openQuickPlay = useCallback((defaultGame?: GameId) => {
    setInitialGame(defaultGame);
    setIsOpen(true);
  }, []);

  const closeQuickPlay = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <QuickPlayContext.Provider value={{ isOpen, initialGame, openQuickPlay, closeQuickPlay }}>
      {children}
    </QuickPlayContext.Provider>
  );
};

export const useQuickPlay = () => useContext(QuickPlayContext);
