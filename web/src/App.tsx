import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { FileFormatsPage } from '@/pages/FileFormatsPage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Page Not Found</CardTitle>
          <CardDescription>This page does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to="/fileformats"
            className={cn(
              'inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
            )}
          >
            Go To File Formats
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/fileformats" replace />} />
      <Route path="/fileformats" element={<FileFormatsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
