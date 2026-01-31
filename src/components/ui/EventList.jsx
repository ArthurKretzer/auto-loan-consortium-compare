
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

export const EventList = ({ title, events, onAdd, onRemove, maxMonth }) => {
    const [newMonth, setNewMonth] = useState(1);
    const [newValue, setNewValue] = useState(1000);

    const handleAdd = () => {
        onAdd({ month: Number(newMonth), value: Number(newValue) });
    };

    return (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
            <h4 className="text-sm font-bold text-slate-600 mb-3">{title}</h4>
            <div className="flex gap-2 mb-4">
                <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Mês</label>
                    <input type="number" min="1" max={maxMonth} value={newMonth} onChange={e => setNewMonth(e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-slate-500 block mb-1">Valor (R$)</label>
                    <input type="number" min="0" value={newValue} onChange={e => setNewValue(e.target.value)} className="w-full p-2 text-sm border border-slate-200 rounded-lg" />
                </div>
                <button onClick={handleAdd} className="mt-5 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
                {events.sort((a, b) => a.month - b.month).map((ev, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
                        <span>Mês {ev.month}: <strong>R$ {ev.value.toLocaleString('pt-BR')}</strong></span>
                        <button onClick={() => onRemove(i)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                {events.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Nenhum evento extra.</div>}
            </div>
        </div>
    );
};
