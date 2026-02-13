import { ReactNode } from 'react';
import { Header } from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {children}
      </main>
      <footer className="border-t border-border bg-card mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © 2024 Xoztovars. Barcha huquqlar himoyalangan.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="tel:+998901234567" className="hover:text-foreground transition-colors">
                +998 90 123 45 67
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
