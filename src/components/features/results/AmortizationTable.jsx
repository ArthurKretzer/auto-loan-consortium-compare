
import { useSimulation } from '../../../context/SimulationContext';

const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export const AmortizationTable = () => {
    const { state } = useSimulation();
    const { data } = state.simulationData;

    return (
        <div className="mt-8 border-t border-slate-200 pt-8">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Tabela de Amortização (Mensal)</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-500">
                        <tr>
                            <th className="px-3 py-2 text-center" rowSpan="2">Mês</th>
                            <th className="px-3 py-2 text-center border-l border-slate-200" colSpan={state.amortMethod === 'sac' ? 5 : 4}>{state.finLabel}</th>
                            <th className="px-3 py-2 text-center border-l border-slate-200" colSpan="2">{state.consLabel}</th>
                        </tr>
                        <tr>
                            <th className="px-3 py-2 border-l border-slate-200 text-xs text-slate-400">Parcela</th>
                            <th className="px-3 py-2 text-xs text-slate-400">Juros</th>
                            <th className="px-3 py-2 text-xs text-slate-400">Amortização</th>
                            {state.amortMethod === 'sac' && <th className="px-3 py-2 text-xs text-slate-400">Saldo</th>}
                            <th className="px-3 py-2 text-xs text-green-600">Extra</th>
                            <th className="px-3 py-2 border-l border-slate-200 text-xs text-slate-400">Parcela</th>
                            <th className="px-3 py-2 text-xs text-green-600">Lance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.slice(1).map((row) => (
                            <tr key={row.month} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-center">{row.month}</td>
                                <td className="px-3 py-2 border-l border-slate-200 font-semibold">{formatCurrency(row.finRegularPMT)}</td>
                                <td className="px-3 py-2 text-red-400">{formatCurrency(row.finInterest)}</td>
                                <td className="px-3 py-2 text-blue-400">{formatCurrency(row.finAmortization)}</td>
                                {state.amortMethod === 'sac' && <td className="px-3 py-2 text-slate-400">{formatCurrency(row.finBalance)}</td>}
                                <td className="px-3 py-2 text-green-600 font-bold">{row.finExtra > 0 ? formatCurrency(row.finExtra) : '-'}</td>
                                <td className="px-3 py-2 border-l border-slate-200 font-semibold">{formatCurrency(row.consRegularPMT)}</td>
                                <td className="px-3 py-2 text-green-600 font-bold">{row.consBid > 0 ? formatCurrency(row.consBid) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
