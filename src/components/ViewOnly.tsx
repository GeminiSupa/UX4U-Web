export function ViewOnly({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p className="mt-4 rounded-lg border border-ink/10 bg-ink/[0.03] px-4 py-2 text-sm text-ink/70">
      View only. You can read this area but not change it.
    </p>
  );
}
