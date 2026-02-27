/**
 * Loader global pour Suspense
 */
export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-picpec-primary" />
    </div>
  );
}
