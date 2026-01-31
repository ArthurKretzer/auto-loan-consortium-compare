
import { AlertCircle, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSimulation } from '../../../context/SimulationContext';

// Fixed Tooltip moved outside of render loop
const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const CustomTooltip = ({ active, payload, label, finLabel, consLabel, isOffPlan }) => {
    if (active && payload && payload.length) {
        const dataItem = payload[0].payload;

        return (
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 rounded-xl p-4 shadow-2xl text-slate-50 min-w-[200px]">
                <p className="font-bold mb-3 text-slate-200 border-b border-slate-700 pb-2">Mês {label}</p>

                {/* Financing Group */}
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-red-400">{finLabel}</span>
                        <span className="text-xs text-slate-400">Total Acum: {formatCurrency(dataItem.financing)}</span>
                    </div>
                    <div className="text-xl font-bold text-white mb-1">
                        {formatCurrency(dataItem.financingMonthlyPaid)} <span className="text-xs font-normal text-slate-400">/mês</span>
                    </div>
                    {isOffPlan && dataItem.financingMonthlyPaid > 0 && (
                        <div className="text-xs space-y-1 pl-2 border-l-2 border-slate-700 my-2">
                            {dataItem.finBuilder > 0 && <div className="flex justify-between text-orange-300"><span>Construtora:</span> <span>{formatCurrency(dataItem.finBuilder)}</span></div>}
                            {dataItem.finIntObra > 0 && <div className="flex justify-between text-red-300"><span>Juros Obra:</span> <span>{formatCurrency(dataItem.finIntObra)}</span></div>}
                            {dataItem.finBankPMT > 0 && <div className="flex justify-between text-blue-300"><span>Banco:</span> <span>{formatCurrency(dataItem.finBankPMT)}</span></div>}
                        </div>
                    )}
                </div>

                {/* Consortium Group */}
                <div>
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-emerald-400">{consLabel}</span>
                        <span className="text-xs text-slate-400">Total Acum: {formatCurrency(dataItem.consortium)}</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {formatCurrency(dataItem.consortiumMonthlyPaid)} <span className="text-xs font-normal text-slate-400">/mês</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};


export const ComparisonCharts = () => {
    const { state } = useSimulation();
    const { data } = state.simulationData;

    if (!data || data.length === 0) return <div className="p-10 text-center text-slate-500">Carregando dados...</div>;

    return (
        <div>
            {/* Chart 1: Accumulated Total */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-8">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Evolução do Pagamento Acumulado
                </h2>
                <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="month"
                                stroke="#94A3B8"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}m`}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#94A3B8"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip finLabel={state.finLabel} consLabel={state.consLabel} isOffPlan={state.isOffPlan} />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Line
                                type="monotone"
                                dataKey="financing"
                                name={state.finLabel}
                                stroke="#EF4444"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 8 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="consortium"
                                name={state.consLabel}
                                stroke="#10B981"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 8 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p>Este gráfico mostra o <strong>Total Acumulado Pago</strong> (Patrimônio + Juros) ao longo do tempo.</p>
                </div>
            </div>

            {/* Chart 2: Monthly Cashflow */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                    Fluxo de Caixa Mensal (Compromisso)
                </h2>
                <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="month"
                                stroke="#94A3B8"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}m`}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#94A3B8"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                                width={60}
                            />
                            <Tooltip content={<CustomTooltip finLabel={state.finLabel} consLabel={state.consLabel} isOffPlan={state.isOffPlan} />} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

                            {/* Consortium Line */}
                            <Area type="monotone" dataKey="consortiumMonthlyPaid" name={state.consLabel} stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />

                            {/* Financing Stacked */}
                            {state.isOffPlan ? (
                                <>
                                    <Area type="step" dataKey="finBuilder" stackId="1" name="Construtora (Mensal+Balão)" stroke="#F97316" fill="#F97316" fillOpacity={0.6} />
                                    <Area type="monotone" dataKey="finIntObra" stackId="1" name="Juros de Obra" stroke="#EF4444" fill="#EF4444" fillOpacity={0.4} />
                                    <Area type="monotone" dataKey="finBankPMT" stackId="1" name="Financiamento Bancário" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                                </>
                            ) : (
                                <Area type="monotone" dataKey="financingMonthlyPaid" name={state.finLabel} stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} strokeWidth={2} />
                            )}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <p>Este gráfico mostra o <strong>Fluxo de Caixa Mensal</strong> (o quanto você desembolsa a cada mês). Valores empilhados mostram a composição da parcela.</p>
                </div>
            </div>
        </div>
    )
}
