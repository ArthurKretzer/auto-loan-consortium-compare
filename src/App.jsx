import { AlertCircle, ArrowRightLeft, Calculator, Calendar, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const Card = ({ title, value, subtext, highlight, icon: Icon }) => (
  <div className={`p-6 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-indigo-600 border-indigo-500 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={highlight ? 'text-indigo-100' : 'text-slate-500'}>{title}</div>
      {Icon && <Icon className={`w-5 h-5 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`} />}
    </div>
    <div className={`text-3xl font-bold mb-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>
      {value}
    </div>
    <div className={`text-sm ${highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
      {subtext}
    </div>
  </div>
);

const SliderInput = ({ label, value, onChange, min, max, step, prefix = "", suffix = "" }) => (
  <div className="mb-6">
    <div className="flex justify-between mb-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
        {prefix}{value}{suffix}
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

function App() {
  // --- State (Inputs) ---
  // Financing State
  const [finVehicleValue, setFinVehicleValue] = useState(80000);
  const [finTermMonths, setFinTermMonths] = useState(60);
  const [finDownPayment, setFinDownPayment] = useState(30000);
  const [financingRate, setFinancingRate] = useState(1.49); // % a.a.

  // Consortium State
  const [consVehicleValue, setConsVehicleValue] = useState(80000);
  const [consTermMonths, setConsTermMonths] = useState(60);
  const [consDownPayment, setConsDownPayment] = useState(30000);
  const [consortiumAdminRate, setConsortiumAdminRate] = useState(15); // Total %
  const [inflationRate, setInflationRate] = useState(4.5); // % a.a.

  // --- Simulation Logic ---
  const simulationData = useMemo(() => {
    const data = [];
    let financingAccumulated = finDownPayment;
    let consortiumAccumulated = consDownPayment;

    // Financing Calculations (Price Table)
    const loanAmount = finVehicleValue - finDownPayment;
    const monthlyInterestRate = financingRate / 12 / 100;

    // PMT Formula
    const financingPmt = loanAmount > 0
      ? (loanAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -finTermMonths))
      : 0;

    // Consortium Calculations
    let consortiumTotalDebt = consVehicleValue * (1 + consortiumAdminRate / 100);
    // Installment = (Debt - Lance) / Term
    let consortiumInstallment = (consortiumTotalDebt - consDownPayment) / consTermMonths;

    // Use the longer term to drive the loop
    const maxTerm = Math.max(finTermMonths, consTermMonths);

    for (let month = 0; month <= maxTerm; month++) {
      if (month === 0) {
        data.push({
          month,
          financing: finDownPayment,
          consortium: consDownPayment,
        });
        continue;
      }

      // Financing Accumulation
      if (month <= finTermMonths) {
        financingAccumulated += financingPmt;
      }

      // Consortium accumulations (Inflation Logic)
      if (month <= consTermMonths) {
        if ((month - 1) > 0 && (month - 1) % 12 === 0) {
          consortiumInstallment *= (1 + inflationRate / 100);
        }
        consortiumAccumulated += consortiumInstallment;
      }

      data.push({
        month,
        financing: financingAccumulated,
        consortium: consortiumAccumulated,
      });
    }

    return {
      data,
      financingTotal: financingAccumulated,
      consortiumTotal: consortiumAccumulated,
      financingMonthly: financingPmt,
      initialConsortiumMonthly: (consortiumTotalDebt - consDownPayment) / consTermMonths
    };
  }, [finVehicleValue, finTermMonths, finDownPayment, financingRate, consVehicleValue, consTermMonths, consDownPayment, consortiumAdminRate, inflationRate]);

  const { data, financingTotal, consortiumTotal, financingMonthly, initialConsortiumMonthly } = simulationData;
  const difference = financingTotal - consortiumTotal;
  const betterOption = difference > 0 ? "Consórcio" : "Financiamento";
  const savings = Math.abs(difference);

  // Find Break Even
  const breakEvenPoint = useMemo(() => {
    // We need to find where lines cross.
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      const prevDiff = prev.financing - prev.consortium;
      const currDiff = curr.financing - curr.consortium;

      if ((prevDiff > 0 && currDiff < 0) || (prevDiff < 0 && currDiff > 0)) {
        return curr;
      }
    }
    return null;
  }, [data]);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans">

      {/* Sidebar Controls */}
      <aside className="w-full md:w-96 bg-white border-r border-slate-200 p-6 shadow-lg z-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-indigo-600 rounded-xl shadow-lg">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Simulador</h1>
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Consórcio vs Finam</p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Removed shared section, moved to specific sections */}

          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              <DollarSign className="w-4 h-4" /> Financiamento
            </h3>
            <SliderInput label="Valor do Veículo" value={finVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setFinVehicleValue} />
            <SliderInput label="Entrada" value={finDownPayment} min={0} max={finVehicleValue * 0.9} step={1000} prefix="R$ " onChange={setFinDownPayment} />
            <SliderInput label="Prazo (Meses)" value={finTermMonths} min={12} max={120} step={1} onChange={setFinTermMonths} />
            <SliderInput label="Taxa de Juros (% a.a.)" value={financingRate} min={0} max={40} step={0.01} suffix="%" onChange={setFinancingRate} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Parcela Estimada (Fixa)</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(financingMonthly)}</div>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              <ArrowRightLeft className="w-4 h-4" /> Consórcio
            </h3>
            <SliderInput label="Valor do Veículo (Carta)" value={consVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setConsVehicleValue} />
            <SliderInput label="Lance / Entrada" value={consDownPayment} min={0} max={consVehicleValue * 0.9} step={1000} prefix="R$ " onChange={setConsDownPayment} />
            <SliderInput label="Prazo (Meses)" value={consTermMonths} min={12} max={120} step={1} onChange={setConsTermMonths} />
            <SliderInput label="Taxa Adm. Total (%)" value={consortiumAdminRate} min={0} max={30} step={0.01} suffix="%" onChange={setConsortiumAdminRate} />
            <SliderInput label="Inflação Projetada (IPCA % a.a.)" value={inflationRate} min={0} max={15} step={0.1} suffix="%" onChange={setInflationRate} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-500 mb-1">1ª Parcela (Reajustável)</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(initialConsortiumMonthly)}</div>
            </div>
          </section>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-hidden flex flex-col">

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            title="Total Pago - Financiamento"
            value={formatCurrency(financingTotal)}
            subtext={`${finTermMonths} parcelas fixas`}
            icon={TrendingUp}
          />
          <Card
            title="Total Pago - Consórcio"
            value={formatCurrency(consortiumTotal)}
            subtext="Com reajustes anuais (IPCA)"
            icon={Calendar}
          />
          <Card
            title="Economia Estimada"
            value={formatCurrency(savings)}
            subtext={`Melhor opção: ${betterOption}`}
            highlight={true}
            icon={Percent}
          />
        </div>

        {/* Chart */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Evolução do Pagamento Acumulado
          </h2>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="month"
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}m`}
                />
                <YAxis
                  stroke="#94A3B8"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px', color: '#F8FAFC' }}
                  itemStyle={{ color: '#F8FAFC' }}
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Mês ${label}`}
                />
                <Legend iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="financing"
                  name="Financiamento"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="consortium"
                  name="Consórcio"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <p>Os valores do consórcio sofrem reajuste anual baseado na inflação configurada. O financiamento assume parcelas fixas (Tabela Price).</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
