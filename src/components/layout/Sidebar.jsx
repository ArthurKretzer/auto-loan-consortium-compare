
import { Calculator, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useSimulation } from '../../context/SimulationContext';
import { ConsortiumInputs } from '../features/consortium/ConsortiumInputs';
import { FinancingInputs } from '../features/financing/FinancingInputs';
import { ToggleGroup } from '../ui/ToggleGroup';

export const Sidebar = () => {
    const { state, actions } = useSimulation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Render mobile toggle inside here or manage it from parent layout? 
    // Managing from parent is cleaner for layout, but let's stick to the self-contained component for now 
    // OR just export the internal content.
    // The previous App.jsx had the button fixed.

    return (
        <>
            {/* Mobile Sidebar Toggle - recreated here or we lift it up */}
            <button
                className="md:hidden fixed bottom-4 right-4 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-colors"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 bg-black/30 z-30" onClick={() => setSidebarOpen(false)} />
            )}

            <aside className={`
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
            fixed md:static inset-y-0 left-0 z-40
            w-full sm:w-96 bg-white border-r border-slate-200
            p-6 shadow-lg overflow-y-auto
            transition-transform duration-300
          `}>
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
                        <Calculator className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Simulador</h1>
                        <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Completo &copy;</p>
                    </div>
                </div>

                {/* Asset Type Selector */}
                <ToggleGroup
                    label="Tipo de Bem"
                    options={[
                        { value: 'vehicle', label: '🚗 Veículo' },
                        { value: 'property', label: '🏠 Imóvel' },
                    ]}
                    value={state.assetType}
                    onChange={actions.handleAssetTypeChange}
                />

                <div className="space-y-6">
                    <FinancingInputs />
                    <ConsortiumInputs />
                </div>
            </aside>
        </>
    );
};
