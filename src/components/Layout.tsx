import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: ReactNode;
  title: string;
}

export function Layout({ children, title }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="lg:ml-60 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm h-14 flex items-center px-4 lg:px-6 border-b border-gray-100 sticky top-0 z-30">
          <div className="w-12 lg:hidden" />
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        </header>
        
        {/* Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 px-4 py-3 text-center text-xs text-gray-400">
          CBT-Q © 2024 • dibuat oleh D14nr
        </footer>
      </div>
    </div>
  );
}
