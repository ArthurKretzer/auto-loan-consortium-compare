

export const Card = ({ title, value, subtext, highlight, icon: Icon }) => (
    <div className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-indigo-600 border-indigo-500 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={highlight ? 'text-indigo-100' : 'text-slate-500'}>{title}</div>
            {Icon && <Icon className={`w-5 h-5 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`} />}
        </div>
        <div className={`text-2xl sm:text-3xl font-bold mb-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>
            {value}
        </div>
        <div className={`text-sm ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
            {subtext}
        </div>
    </div>
);
