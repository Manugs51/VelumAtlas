import { useEffect, useState } from 'react';
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { FileFormatsPage } from '@/pages/FileFormatsPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type ThemeMode = 'dark' | 'light';

function AppLayout() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    const storedMode = window.localStorage.getItem('theme-mode');
    const nextMode: ThemeMode = storedMode === 'light' ? 'light' : 'dark';

    setThemeMode(nextMode);
    document.documentElement.classList.toggle('dark', nextMode === 'dark');
  }, []);

  function handleThemeToggle() {
    setThemeMode((currentMode) => {
      const nextMode: ThemeMode = currentMode === 'dark' ? 'light' : 'dark';
      document.documentElement.classList.toggle('dark', nextMode === 'dark');
      window.localStorage.setItem('theme-mode', nextMode);
      return nextMode;
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-border bg-card px-4 py-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Navegación</p>
            <NavLink
              to="/fileformats"
              className={({ isActive }) =>
                cn(
                  'flex h-10 items-center rounded-lg px-3 text-sm font-medium transition-colors',
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              Cargar excels
            </NavLink>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Modo noche</p>
                <p className="text-xs text-muted-foreground">Alterna entre tema oscuro y claro.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={themeMode === 'dark'}
                aria-label="Cambiar tema"
                onClick={handleThemeToggle}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  themeMode === 'dark' ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-primary-foreground transition-transform',
                    themeMode === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>This page does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <NavLink
            to="/fileformats"
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
            )}
          >
            Go To File Formats
          </NavLink>
        </CardContent>
      </Card>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/fileformats" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/fileformats" element={<FileFormatsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
