import { AlertCircle, ArrowRightLeft, Calculator, Calendar, DollarSign, Percent, Plus, Trash2, TrendingUp } from 'lucide-react';
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

const EventList = ({ title, events, onAdd, onRemove, maxMonth }) => {
  const [newMonth, setNewMonth] = useState(1);
  const [newValue, setNewValue] = useState(1000);

  const handleAdd = () => {
    onAdd({ month: Number(newMonth), value: Number(newValue) });
  };

  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
      <h4 className="text-sm font-bold text-slate-600 mb-3">{title}</h4>

      {/* Add Form */}
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

      {/* List */}
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {events.sort((a, b) => a.month - b.month).map((ev, i) => (
          <div key={i} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 text-sm">
            <span>Mês {ev.month}: <strong>R$ {ev.value}</strong></span>
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

function App() {
  // --- State (Inputs) ---
  // Financing State
  const [finVehicleValue, setFinVehicleValue] = useState(80000);
  const [finTermMonths, setFinTermMonths] = useState(60);
  const [finDownPayment, setFinDownPayment] = useState(20000);
  const [financingRate, setFinancingRate] = useState(3.29); // Now treating as Annual Rate (% a.a.)
  const [finIOF, setFinIOF] = useState(0.38); // %
  const [finInsurance, setFinInsurance] = useState(0); // % of Loan Amount
  const [finEvents, setFinEvents] = useState([]); // Array of { month, value }

  // Consortium State
  const [consVehicleValue, setConsVehicleValue] = useState(110000);
  const [consTermMonths, setConsTermMonths] = useState(80);
  const [consDownPayment, setConsDownPayment] = useState(0); // Usually starts with 0 or small entry fee, bid comes later
  const [consortiumAdminRate, setConsortiumAdminRate] = useState(9); // Total %
  const [inflationRate, setInflationRate] = useState(4.5); // % a.a.
  const [consEvents, setConsEvents] = useState([]); // Array of { month, value } (Lances)

  // --- Simulation Logic ---
  const simulationData = useMemo(() => {
    // --- FINANCING SIMULATION (Iterative) ---
    // Rules:
    // 1. Calculate Monthly Interest from Annual Input: (1+i_aa)^(1/12) - 1
    // 2. Initial Loan = Value - DownPayment
    // 3. IOF and Insurance are calculated on the Loan Amount.
    // 4. Per user request: These fees DO NOT accrue interest. They are spread linearly over the term.
    //    MonthlyFee = (Loan * (IOF% + Insurance%)) / Term.
    // 5. PMT (Principal + Interest) is calculated on Loan Amount separately.
    // 6. Total Monthly Payment = PMT + MonthlyFee.

    // Convert Annual Rate to Monthly Factor
    const monthlyRateFactor = Math.pow(1 + financingRate / 100, 1 / 12);
    const monthlyInterestRate = monthlyRateFactor - 1;

    const loanPrincipal = finVehicleValue - finDownPayment;
    let finBalance = loanPrincipal;
    let finAccumulatedPaid = finDownPayment;
    let currentFinPMT = 0;

    // Fee Calculation
    const totalFees = loanPrincipal * ((finIOF + finInsurance) / 100);
    const monthlyFee = totalFees / finTermMonths;

    // Initial PMT Calculation (Pure P+I)
    if (finBalance > 0) {
      currentFinPMT = (finBalance * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -finTermMonths));
    }

    // --- CONSORTIUM SIMULATION (Iterative) ---
    // Rules:
    // 1. Total Debt = Credit + AdminFee.
    // 2. Installment = Debt / Term.
    // 3. Bid (Lance) reduces Debt.
    // 4. Inflation adjusts Credit & Remaining Debt annually.

    // To be precise: Admin fee is on top of Credit.
    // Common Logic: Total to Pay = Credit * (1 + Admin%).
    // Monthly Installment = Total / Term.
    // If you bid (Lance), you pay X amount. This reduces the Balance.
    // New Installment = Remaining Balance / Remaining Term.
    // Inflation: At month 12, 24... the Letter (Credit) adjusts by IPCA. 
    // Usually, the installment ALSO adjusts by same % to cover the group fund.

    let consCredit = consVehicleValue;
    let consTotalDebt = consCredit * (1 + consortiumAdminRate / 100);
    // Initial deduction logic: 
    // Traditionally, 'Down Payment' in simulador is just 'Lance Embutido' or 'Entry'. 
    // If it's entry, it reduces debt immediately.
    let consBalance = consTotalDebt - consDownPayment;
    let consAccumulatedPaid = consDownPayment;
    let currentConsPMT = consBalance / consTermMonths;

    const maxTerm = Math.max(finTermMonths, consTermMonths);
    const finalData = [];

    // Push Month 0 (Start)
    finalData.push({
      month: 0,
      financing: finDownPayment,
      consortium: consDownPayment,
    });

    for (let m = 1; m <= maxTerm; m++) {
      // --- Financing Step ---
      let finPaymentThisMonth = 0;
      if (m <= finTermMonths && finBalance > 0.01) {
        // Interest accrued this month
        const interest = finBalance * monthlyInterestRate;
        // Regular PMT (cannot exceed balance + interest)
        let paymentPrincipalInterest = currentFinPMT;

        // Check for Extra Payment Event
        const extraEvent = finEvents.find(e => e.month === m);
        let extraPayment = extraEvent ? extraEvent.value : 0;

        // Amortization Check
        // Payment covers interest first, then principal
        // If balance is tiny, just pay it off.
        if (finBalance + interest < paymentPrincipalInterest) {
          paymentPrincipalInterest = finBalance + interest;
        }

        // Total Payment = (P+I) + Monthly Fee + Extra
        finPaymentThisMonth = paymentPrincipalInterest + monthlyFee + extraPayment;

        // Update Balance (Only P+I and Extra affect balance, Fees do not reduce principal)
        // New Balance = Old Balance + Interest - (PaymentP+I + Extra)
        // Effectively: PrincipalReduc = (PaymentP+I - Interest) + Extra
        const principalReduction = (paymentPrincipalInterest - interest) + extraPayment;
        finBalance -= principalReduction;

        if (finBalance < 0) {
          // Refund overpayment (logic cleanliness) - mostly from huge extra payment
          // If balance < 0, it means we paid too much principal.
          // Adjust paymentAmount to match exactly 0.
          const refund = Math.abs(finBalance);
          finPaymentThisMonth -= refund;
          finBalance = 0;
        }

        finAccumulatedPaid += finPaymentThisMonth;

        // Recalculate PMT if there was an Extra Payment and balance remains
        if (extraPayment > 0 && finBalance > 0) {
          const remainingMonths = finTermMonths - m;
          if (remainingMonths > 0) {
            currentFinPMT = (finBalance * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -remainingMonths));
          } else {
            // Should be paid off
            finBalance = 0;
          }
        }
      }

      // --- Consortium Step ---
      let consPaymentThisMonth = 0;
      if (m <= consTermMonths && consBalance > 0.01) {
        // 1. Inflation Adjustment (Annual)
        // Adjustment usually happens on month 13, 25, etc. (After 12 months)
        if (m > 1 && (m - 1) % 12 === 0) {
          const adjustmentFactor = 1 + inflationRate / 100;
          // Adjust Balance 
          consBalance *= adjustmentFactor;
          // Adjust Credit Value (Reference only, visual)
          consCredit *= adjustmentFactor;
          // Recalculate PMT based on new balance
          const remainingMonths = consTermMonths - (m - 1);
          if (remainingMonths > 0) currentConsPMT = consBalance / remainingMonths;
        }

        // 2. Regular Payment
        let payment = currentConsPMT;

        // 3. Check for Bid Event (Lance)
        const bidEvent = consEvents.find(e => e.month === m);
        let bidValue = bidEvent ? bidEvent.value : 0;

        consPaymentThisMonth = payment + bidValue;

        // 4. Update Balance
        consBalance -= consPaymentThisMonth;

        if (consBalance < 0) {
          consPaymentThisMonth += consBalance;
          consBalance = 0;
        }

        consAccumulatedPaid += consPaymentThisMonth;

        // Recalculate PMT if Bid occurred
        if (bidValue > 0 && consBalance > 0) {
          const remainingMonths = consTermMonths - m;
          if (remainingMonths > 0) {
            currentConsPMT = consBalance / remainingMonths;
          } else {
            consBalance = 0;
          }
        }
      }

      finalData.push({
        month: m,
        financing: finAccumulatedPaid,
        consortium: consAccumulatedPaid,
        financingMonthlyPaid: finPaymentThisMonth,
        consortiumMonthlyPaid: consPaymentThisMonth
      });
    }

    // Initial Display calculation needs to include the Fee
    const initialFinPMTOnly = loanPrincipal > 0 ? (loanPrincipal * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -finTermMonths)) : 0;
    const initialFinTotalMonthly = initialFinPMTOnly + monthlyFee;

    return {
      data: finalData,
      financingTotal: finAccumulatedPaid,
      consortiumTotal: consAccumulatedPaid,
      // For Initial Display
      financingInitialPMT: initialFinTotalMonthly,
      consortiumInitialPMT: (consVehicleValue * (1 + consortiumAdminRate / 100) - consDownPayment) / consTermMonths
    };

  }, [
    finVehicleValue, finTermMonths, finDownPayment, financingRate, finIOF, finInsurance, finEvents,
    consVehicleValue, consTermMonths, consDownPayment, consortiumAdminRate, inflationRate, consEvents
  ]);

  const { data, financingTotal, consortiumTotal, financingInitialPMT, consortiumInitialPMT } = simulationData;
  const difference = financingTotal - consortiumTotal;
  const betterOption = difference > 0 ? "Consórcio" : "Financiamento";
  const savings = Math.abs(difference);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 border-none rounded-lg p-3 shadow-xl text-slate-50">
          <p className="font-bold mb-2">Mês {label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="mb-2 last:mb-0">
              <div className="flex items-center gap-2 font-semibold" style={{ color: entry.color }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </div>
              <div className="ml-4 text-xs text-slate-300">
                Acumulado: {formatCurrency(entry.value)}
              </div>
              <div className="ml-4 text-xs text-yellow-300">
                Parcela: {formatCurrency(entry.payload[entry.dataKey === 'financing' ? 'financingMonthlyPaid' : 'consortiumMonthlyPaid'])}
              </div>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

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
            <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Completo &copy;</p>
          </div>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              <DollarSign className="w-4 h-4" /> Financiamento
            </h3>
            <SliderInput label="Valor do Veículo" value={finVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setFinVehicleValue} />
            <SliderInput label="Entrada" value={finDownPayment} min={0} max={finVehicleValue * 0.9} step={1000} prefix="R$ " onChange={setFinDownPayment} />
            <SliderInput label="Prazo (Meses)" value={finTermMonths} min={12} max={120} step={12} onChange={setFinTermMonths} />
            <SliderInput label="Taxa de Juros (% a.a.)" value={financingRate} min={0} max={40} step={0.1} suffix="%" onChange={setFinancingRate} />
            <SliderInput label="IOF (% Total)" value={finIOF} min={0} max={5} step={0.01} suffix="%" onChange={setFinIOF} />
            <SliderInput label="Seguro Prestamista (% Total)" value={finInsurance} min={0} max={10} step={0.1} suffix="%" onChange={setFinInsurance} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
              <div className="text-xs text-slate-500 mb-1">Parcela Inicial Estimada (c/ Taxas)</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(financingInitialPMT)}</div>
            </div>

            <EventList
              title="Amortizações Extras"
              events={finEvents}
              maxMonth={finTermMonths}
              onAdd={(ev) => setFinEvents([...finEvents, ev])}
              onRemove={(idx) => setFinEvents(finEvents.filter((_, i) => i !== idx))}
            />
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              <ArrowRightLeft className="w-4 h-4" /> Consórcio
            </h3>
            <SliderInput label="Valor do Veículo (Carta)" value={consVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setConsVehicleValue} />
            <SliderInput label="Entrada Inicial (Não Lance)" value={consDownPayment} min={0} max={consVehicleValue * 0.5} step={1000} prefix="R$ " onChange={setConsDownPayment} />
            <SliderInput label="Prazo (Meses)" value={consTermMonths} min={12} max={120} step={12} onChange={setConsTermMonths} />
            <SliderInput label="Taxa Adm. Total (%)" value={consortiumAdminRate} min={0} max={30} step={0.5} suffix="%" onChange={setConsortiumAdminRate} />
            <SliderInput label="Inflação (IPCA % a.a.)" value={inflationRate} min={0} max={15} step={0.1} suffix="%" onChange={setInflationRate} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
              <div className="text-xs text-slate-500 mb-1">1ª Parcela Estimada</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(consortiumInitialPMT)}</div>
            </div>

            <EventList
              title="Lances (Redução de Prazo/Saldo)"
              events={consEvents}
              maxMonth={consTermMonths}
              onAdd={(ev) => setConsEvents([...consEvents, ev])}
              onRemove={(idx) => setConsEvents(consEvents.filter((_, i) => i !== idx))}
            />
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
                <Tooltip content={<CustomTooltip />} />
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
