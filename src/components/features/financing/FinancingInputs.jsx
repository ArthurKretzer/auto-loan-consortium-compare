
import { DollarSign } from 'lucide-react';
import { useSimulation } from '../../../context/SimulationContext';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { EventList } from '../../ui/EventList';
import { SliderInput } from '../../ui/SliderInput';
import { ToggleGroup } from '../../ui/ToggleGroup';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const FinancingInputs = () => {
    const { state, actions } = useSimulation();

    // Derived values helper
    const finStrategyDescription = state.finAmortStrategy === 'reduce_term'
        ? 'Mantém parcela fixa, reduz o prazo.'
        : 'Mantém prazo original, reduz a parcela.';

    const amortMethodDescription = state.amortMethod === 'sac'
        ? 'SAC: Amortização constante, parcelas decrescentes.'
        : 'Price: Parcelas fixas, juros decrescentes.';

    return (
        <CollapsibleSection title={state.finLabel} icon={DollarSign}>
            <input
                type="text"
                value={state.finLabel}
                onChange={(e) => actions.setFinLabel(e.target.value)}
                className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full mb-4 text-sm"
                placeholder="Nome do cenário"
            />

            <ToggleGroup
                label="Sistema de Amortização"
                options={[
                    { value: 'price', label: 'Price' },
                    { value: 'sac', label: 'SAC' },
                ]}
                value={state.amortMethod}
                onChange={actions.setAmortMethod}
                description={amortMethodDescription}
            />

            <SliderInput label={state.config.labels.value} value={state.finAssetValue} min={20000} max={state.config.maxValue} step={state.config.valueStep} prefix="R$ " onChange={actions.setFinAssetValue} />
            <SliderInput label="Entrada" value={state.finDownPayment} min={0} max={Math.round(state.finAssetValue * 0.9)} step={state.config.valueStep} prefix="R$ " onChange={actions.setFinDownPayment} />
            <SliderInput label="Prazo (Meses)" value={state.finTermMonths} min={12} max={state.config.maxFinTerm} step={1} onChange={actions.setFinTermMonths} />
            <SliderInput label="Taxa de Juros (% a.a.)" value={state.financingRate} min={0} max={40} step={0.01} suffix="%" onChange={actions.setFinancingRate} />
            <SliderInput label="IOF (% Total)" value={state.finIOF} min={0} max={5} step={0.01} suffix="%" onChange={actions.setFinIOF} />
            <SliderInput label="Seguro Prestamista (% Total)" value={state.finInsurance} min={0} max={10} step={0.01} suffix="%" onChange={actions.setFinInsurance} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                <div className="text-xs text-slate-500 mb-1">Parcela Inicial Estimada (c/ Taxas)</div>
                <div className="text-lg font-semibold text-slate-700">{formatCurrency(state.simulationData.financingInitialPMT)}</div>
            </div>

            {state.assetType === 'property' && (
                <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-orange-800 text-sm">Imóvel na Planta?</span>
                        <button
                            onClick={() => actions.setIsOffPlan(!state.isOffPlan)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${state.isOffPlan ? 'bg-orange-500' : 'bg-slate-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${state.isOffPlan ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {state.isOffPlan && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <SliderInput label="Prazo de Obra (Meses)" value={state.constructionTerm} min={12} max={60} step={1} onChange={actions.setConstructionTerm} />
                            <SliderInput label="Parcela Mensal (Construtora)" value={state.builderMonthly} min={0} max={20000} step={100} prefix="R$ " onChange={actions.setBuilderMonthly} />
                            <SliderInput label="Reforços Anuais (Balloons)" value={state.builderBalloons} min={0} max={100000} step={1000} prefix="R$ " onChange={actions.setBuilderBalloons} />
                            <SliderInput label="Chaves (Entrega)" value={state.builderHandover} min={0} max={200000} step={1000} prefix="R$ " onChange={actions.setBuilderHandover} />
                            <SliderInput label="INCC Est. (% a.a.)" value={state.constructionRate} min={0} max={15} step={0.1} suffix="%" onChange={actions.setConstructionRate} />

                            <div className="text-xs text-orange-600 bg-orange-100 p-2 rounded">
                                <strong>Nota:</strong> O saldo devedor será corrigido pelo INCC durante a obra. O financiamento bancário começará após a entrega das chaves.
                            </div>
                        </div>
                    )}
                </div>
            )}

            <ToggleGroup
                label="Estratégia de Amortização Extra"
                options={[
                    { value: 'reduce_term', label: 'Reduzir Prazo' },
                    { value: 'reduce_installment', label: 'Reduzir Parcela' },
                ]}
                value={state.finAmortStrategy}
                onChange={actions.setFinAmortStrategy}
                description={finStrategyDescription}
            />

            <EventList
                title="Amortizações Extras"
                events={state.finEvents}
                maxMonth={state.finTermMonths}
                onAdd={(ev) => actions.setFinEvents([...state.finEvents, ev])}
                onRemove={(idx) => actions.setFinEvents(state.finEvents.filter((_, i) => i !== idx))}
            />
        </CollapsibleSection>
    );
}
