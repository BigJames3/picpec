interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  trend?: { value: number; positive: boolean };
}

export function StatCard({
  title,
  value,
  icon,
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {trend && (
        <p
          className={`text-sm mt-2 ${
            trend.positive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% ce mois
        </p>
      )}
    </div>
  );
}
