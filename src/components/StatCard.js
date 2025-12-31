import React from 'react';

// Stat Card Component
const StatCard = ({ icon, label, value, color }) => {
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', purple: 'bg-purple-500', orange: 'bg-orange-500' };
  return (
    <div className="bg-slate-800/50 rounded-xl shadow-sm border border-slate-600 p-4">
      <div className="flex items-center gap-4">
        <div className={`${colors[color]} text-white p-3 rounded-lg`}>{icon}</div>
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default StatCard;