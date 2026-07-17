export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-4xl text-slate-300 dark:text-slate-600">{icon}</div>}
      <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
      {description && <p className="mb-4 max-w-xs text-xs text-slate-400 dark:text-slate-500">{description}</p>}
      {action}
    </div>
  );
}
