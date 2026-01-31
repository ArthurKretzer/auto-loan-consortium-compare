
export const SliderInput = ({ label, value, onChange, min, max, step, prefix = "", suffix = "" }) => (
    <div className="mb-6">
        <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">{label}</label>
            <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}
            </span>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
    </div>
);
