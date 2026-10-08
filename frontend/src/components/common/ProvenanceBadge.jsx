import React from 'react';

export default function ProvenanceBadge({ type = "AI-synthesized" }) {
  const styles = {
    'Employer-provided': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Public source': 'bg-blue-50 text-blue-700 border-blue-200',
    'AI-synthesized': 'bg-purple-50 text-purple-700 border-purple-200',
    'User-reported': 'bg-amber-50 text-amber-700 border-amber-200'
  };

  const currentStyle = styles[type] || styles['AI-synthesized'];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${currentStyle}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-75"></span>
      {type}
    </span>
  );
}
