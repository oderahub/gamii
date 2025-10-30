export const dynamic = 'force-static';

export default function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-muted-foreground mt-2">The page you’re looking for doesn’t exist.</p>
    </div>
  );
}