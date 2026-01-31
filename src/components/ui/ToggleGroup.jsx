
export const ToggleGroup = ({ label, options, value, onChange, description }) => (
    <div className="mb-6">
        {label && <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>}
        <div className="flex bg-slate-100 p-1 rounded-lg">
            {options.map(opt => (
                <button
                    key={opt.value}
                    className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${value === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.label}
                </button>
            ))}
        </div>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
    </div>
);
