
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <section>
            <button
                className="flex items-center justify-between w-full mb-4"
                onClick={() => setOpen(!open)}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-slate-400" />}
                    <span className="font-bold text-slate-600">{title}</span>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && children}
        </section>
    );
};
