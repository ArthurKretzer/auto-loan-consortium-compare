
import { ArrowRightLeft } from 'lucide-react';
import { useSimulation } from '../../../context/SimulationContext';
import { CollapsibleSection } from '../../ui/CollapsibleSection';
import { EventList } from '../../ui/EventList';
import { SliderInput } from '../../ui/SliderInput';
import { ToggleGroup } from '../../ui/ToggleGroup';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const ConsortiumInputs = () => {
    const { state, actions } = useSimulation();

    const bidStrategyDescription = state.bidStrategy === 'reduce_term'
        ? 'Mantém o valor da parcela e quita saldo mais rápido.'
        : 'Mantém o prazo original e diminui o valor da parcela.';

    return (
        <CollapsibleSection title={state.consLabel} icon={ArrowRightLeft}>
            <input
                type="text"
                value={state.consLabel}
                onChange={(e) => actions.setConsLabel(e.target.value)}
                className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full mb-4 text-sm"
                placeholder="Nome do cenário"
            />

            <SliderInput label={state.config.labels.consValue} value={state.consAssetValue} min={20000} max={state.config.maxValue} step={state.config.valueStep} prefix="R$ " onChange={actions.setConsAssetValue} />
            <SliderInput label="Entrada Inicial (Não Lance)" value={state.consDownPayment} min={0} max={Math.round(state.consAssetValue * 0.5)} step={state.config.valueStep} prefix="R$ " onChange={actions.setConsDownPayment} />
            <SliderInput label="Prazo (Meses)" value={state.consTermMonths} min={12} max={state.config.maxConsTerm} step={1} onChange={actions.setConsTermMonths} />
            <SliderInput label="Taxa Adm. Total (%)" value={state.consortiumAdminRate} min={0} max={30} step={0.01} suffix="%" onChange={actions.setConsortiumAdminRate} />
            <SliderInput label="Seguro (% Variável/Total)" value={state.consInsurance} min={0} max={10} step={0.01} suffix="%" onChange={actions.setConsInsurance} />
            {state.assetType === 'property' && (
                <SliderInput label="Fundo de Reserva (%)" value={state.consReserveFund} min={0} max={5} step={0.1} suffix="%" onChange={actions.setConsReserveFund} />
            )}
            <SliderInput label="Inflação (IPCA % a.a.)" value={state.inflationRate} min={0} max={15} step={0.01} suffix="%" onChange={actions.setInflationRate} />

            <ToggleGroup
                label="Estratégia de Lance"
                options={[
                    { value: 'reduce_term', label: 'Reduzir Prazo' },
                    { value: 'reduce_installment', label: 'Reduzir Parcela' },
                ]}
                value={state.bidStrategy}
                onChange={actions.setBidStrategy}
                description={bidStrategyDescription}
            />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                <div className="text-xs text-slate-500 mb-1">1ª Parcela Estimada</div>
                <div className="text-lg font-semibold text-slate-700">{formatCurrency(state.simulationData.consortiumInitialPMT)}</div>
            </div>

            <EventList
                title="Lances (Redução de Prazo/Saldo)"
                events={state.consEvents}
                maxMonth={state.consTermMonths}
                onAdd={(ev) => actions.setConsEvents([...state.consEvents, ev])}
                onRemove={(idx) => actions.setConsEvents(state.consEvents.filter((_, i) => i !== idx))}
            />
        </CollapsibleSection>
    );
};
