
"use client"; // Aggiunto perché il context provider userà useState/useEffect

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { AppHeader } from "@/components/dashboard/AppHeader";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

// --- Inizio Definizione ActiveCollaboratorContext ---
const LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY = "activeIncastroCollaborator";

interface ActiveCollaboratorStorageData {
  id: string;
  nome_completo: string;
  ruolo: string;
}

interface ActiveCollaboratorContextType {
  activeCollaborator: ActiveCollaboratorStorageData | null;
  setActiveCollaborator: (collaborator: ActiveCollaboratorStorageData | null) => void;
  isLoadingActiveCollaborator: boolean;
}

// Creazione del Context con un valore di default che corrisponda al tipo
export const ActiveCollaboratorContext = createContext<ActiveCollaboratorContextType>({
  activeCollaborator: null,
  setActiveCollaborator: () => { console.warn('setActiveCollaborator called outside of Provider') },
  isLoadingActiveCollaborator: true,
});

// Custom Hook per usare il context
export const useActiveCollaborator = () => {
  const context = useContext(ActiveCollaboratorContext);
  if (context === undefined) { // Controllare se il context è undefined (valore iniziale prima del provider)
    throw new Error('useActiveCollaborator must be used within an ActiveCollaboratorProvider');
  }
  return context;
};

// Provider Component
const ActiveCollaboratorProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeCollaborator, setActiveCollaboratorState] = useState<ActiveCollaboratorStorageData | null>(null);
  const [isLoadingActiveCollaborator, setIsLoadingActiveCollaborator] = useState(true);

  useEffect(() => {
    try {
      const storedCollaboratorString = localStorage.getItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
      if (storedCollaboratorString) {
        setActiveCollaboratorState(JSON.parse(storedCollaboratorString));
      }
    } catch (error) {
      console.error("Failed to parse active collaborator from localStorage:", error);
      setActiveCollaboratorState(null);
    }
    setIsLoadingActiveCollaborator(false);
  }, []);

  const handleSetCollaborator = (collaborator: ActiveCollaboratorStorageData | null) => {
    setActiveCollaboratorState(collaborator);
    if (collaborator) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY, JSON.stringify(collaborator));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_ACTIVE_COLLABORATOR_KEY);
    }
  };
  
  const contextValue = useMemo(() => ({
    activeCollaborator,
    setActiveCollaborator: handleSetCollaborator,
    isLoadingActiveCollaborator,
  }), [activeCollaborator, isLoadingActiveCollaborator]);

  return (
    <ActiveCollaboratorContext.Provider value={contextValue}>
      {children}
    </ActiveCollaboratorContext.Provider>
  );
};
// --- Fine Definizione ActiveCollaboratorContext ---


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <ActiveCollaboratorProvider> {/* Avvolge con il nuovo provider */}
        <div className="flex min-h-screen w-full">
          <AppSidebar />
          <div className="flex flex-1 flex-col">
            <AppHeader />
            <main className="flex-1 p-6 bg-muted/40 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </ActiveCollaboratorProvider>
    </SidebarProvider>
  );
}
