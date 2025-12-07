import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { AlertCircle, ArrowRightLeft, Calculator, Calendar, DollarSign, Download, Percent, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
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
  const dashboardRef = useRef(null);

  // --- State (Inputs) ---
  // Scenario Naming
  const [finLabel, setFinLabel] = useState("Financiamento");
  const [consLabel, setConsLabel] = useState("Consórcio");

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
  const [consInsurance, setConsInsurance] = useState(0); // % of Letter
  const [inflationRate, setInflationRate] = useState(4.5); // % a.a.
  const [consEvents, setConsEvents] = useState([]); // Array of { month, value } (Lances)
  const [bidStrategy, setBidStrategy] = useState('reduce_term'); // 'reduce_term' | 'reduce_installment'

  // --- Simulation Logic ---
  const simulationData = useMemo(() => {
    // --- FINANCING SIMULATION (Term Reduction / Amortização por Prazo) ---
    // Refined Rules:
    // 1. Installment (PMT) is FIXED based on initial calculation (Price Table).
    // 2. Fees (IOF/Insurance) are also fixed monthly additions.
    // 3. Extra Payments reduce the Principal Balance immediately.
    // 4. CRITICAL: We do NOT recalculate PMT. We keep paying the SAME amount.
    //    Result: Balance drops faster -> Debt paid off in fewer months.

    // Convert Annual Rate to Monthly Factor
    const monthlyRateFactor = Math.pow(1 + financingRate / 100, 1 / 12);
    const monthlyInterestRate = monthlyRateFactor - 1;

    const loanPrincipal = finVehicleValue - finDownPayment;
    let finBalance = loanPrincipal;
    let finAccumulatedPaid = finDownPayment;

    // Fee Calculation (Fixed Monthly)
    const totalFinFees = loanPrincipal * ((finIOF + finInsurance) / 100);
    const monthlyFinFee = totalFinFees / finTermMonths;

    // Base PMT Calculation (Pure P+I, Fixed throughout the contract)
    let fixedFinPMT = 0;
    if (finBalance > 0) {
      fixedFinPMT = (finBalance * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -finTermMonths));
    }

    // --- CONSORTIUM SIMULATION (Fixed Fees + Principal Inflation + Bid Strategy) ---
    // Refined Rules:
    // 1. Fees (Admin + Insurance) are calculated on INITIAL Credit and are FIXED. (Divided by Term).
    // 2. Inflation only adjusts the "Fundo Comum" (Principal Balance).
    // 3. Bids (Lances) reduce the Principal Balance.
    // 4. Bid Strategy:
    //    - 'reduce_term': Keep currentConsPrincipalPMT fixed (inflation updates it only). Shorter term.
    //    - 'reduce_installment': Recalculate currentConsPrincipalPMT = Balance / RemainingMonths. Same term, lower PMT.

    // Independent Fee Bucket
    let consTotalFixedAdminFee = consVehicleValue * (consortiumAdminRate / 100);
    let consTotalFixedInsurance = consVehicleValue * (consInsurance / 100);
    let consMonthlyFixedFee = (consTotalFixedAdminFee + consTotalFixedInsurance) / consTermMonths;

    // Principal Bucket (Fundo Comum) - Starts equal to Vehicle Value
    let consPrincipalBalance = consVehicleValue;

    // Initial Down Payment Handling for Consortium
    // If "Entrada" is treated as an initial "Lance Embutido" or "Aport", it reduces Principal.
    consPrincipalBalance -= consDownPayment;

    // Current Principal Installment (Floating, affected by Inflation & Bids based on Strategy)
    let currentConsPrincipalPMT = consPrincipalBalance / consTermMonths;
    // We need to track 'Virtual Remaining Months' for 'reduce_term' strategy to know if we finished early?
    // Actually simpler: we just pay until balance is 0.
    // BUT for 'reduce_term', we maintain the PMT value.
    // For 'reduce_installment', we recalculate PMT to fit the Original Term.

    let consAccumulatedPaid = consDownPayment;

    const maxTerm = Math.max(finTermMonths, consTermMonths);
    const finalData = [];

    // Push Month 0 (Start)
    finalData.push({
      month: 0,
      financing: finDownPayment,
      consortium: consDownPayment,
    });

    let finPaidOff = false;
    let consPaidOff = false;

    for (let m = 1; m <= maxTerm; m++) {
      // --- Financing Step ---
      let currentFinInterest = 0;
      let currentFinAmortization = 0;
      let currentFinRegularPMT = 0;
      let currentFinExtra = 0;

      let finPaymentThisMonth = 0;

      // Only pay if not already paid off
      if (!finPaidOff && finBalance > 0.01) {
        // Interest accrued this month on current balance
        const interest = finBalance * monthlyInterestRate;

        // The base payment to attempt is the Fixed PMT
        let paymentPrincipalComponent = fixedFinPMT - interest;

        // NOTE: If balance is low, the Fixed PMT might exceed what is needed.
        // In 'Term Reduction', if (Interest + Balance) < FixedPMT, we just pay off the rest.
        let realPrincipalPayment = paymentPrincipalComponent;

        if (finBalance < paymentPrincipalComponent) {
          realPrincipalPayment = finBalance;
          finPaidOff = true;
        }

        // Check for Extra Payment Event (Amortization)
        const extraEvent = finEvents.find(e => e.month === m);
        let extraPayment = extraEvent ? extraEvent.value : 0;

        // Total Payment for User = (Interest + RealPrincipal) + MonthlyFee + Extra
        const regularPMT = (interest + realPrincipalPayment) + monthlyFinFee;
        finPaymentThisMonth = regularPMT + extraPayment;

        // Reduce Balance
        finBalance -= (realPrincipalPayment + extraPayment);

        if (finBalance <= 0.01) {
          finBalance = 0;
          finPaidOff = true;
        }

        finAccumulatedPaid += finPaymentThisMonth;

        // Store details for Table
        currentFinInterest = interest;
        currentFinAmortization = realPrincipalPayment;
        currentFinRegularPMT = regularPMT;
        currentFinExtra = extraPayment;

        // NO RECALCULATION of fixedFinPMT. Term reduces naturally.
      }

      // --- Consortium Step ---
      let consPaymentThisMonth = 0;
      let currentConsRegularPMT = 0;
      let currentConsBid = 0;

      if (!consPaidOff && consPrincipalBalance > 0.01) {
        // 1. Inflation Adjustment (Annual)
        // Adjusts Principal Balance AND Credit Value (Visual)
        // Fees are FIXED, so they don't change.
        if (m > 1 && (m - 1) % 12 === 0) {
          const adjustmentFactor = 1 + inflationRate / 100;
          consPrincipalBalance *= adjustmentFactor;

          // Update PMT due to Inflation
          if (bidStrategy === 'reduce_installment') {
            // Fully recalculate for remaining term
            const remainingMonths = consTermMonths - (m - 1);
            if (remainingMonths > 0) {
              currentConsPrincipalPMT = consPrincipalBalance / remainingMonths;
            }
          } else {
            // 'reduce_term': Just adjust the Fixed Principal PMT by inflation
            currentConsPrincipalPMT *= adjustmentFactor;
          }
        }

        // 2. Regular Payment = Principal Part + Fixed Fees
        let payment = currentConsPrincipalPMT + consMonthlyFixedFee;

        // 3. Check for Bid Event (Lance)
        const bidEvent = consEvents.find(e => e.month === m);
        let bidValue = bidEvent ? bidEvent.value : 0;

        consPaymentThisMonth = payment + bidValue;
        currentConsRegularPMT = payment;
        currentConsBid = bidValue;

        // 4. Update Balance (Only Principal Part and Bid reduce Principal Balance)
        let principalReduction = currentConsPrincipalPMT + bidValue;

        // Cap to balance
        if (principalReduction > consPrincipalBalance) {
          principalReduction = consPrincipalBalance;
          consPaymentThisMonth = principalReduction + consMonthlyFixedFee;
          consPaidOff = true;
          currentConsRegularPMT = consPaymentThisMonth; // Adjust regular PMT if it was the last partial one
          if (currentConsBid > 0) {
            // If the bid covered it, then regular PMT might be small or 0, simplified logic here:
            // We assume user pays fees + remaining principal.
          }
        }

        consPrincipalBalance -= principalReduction;

        if (consPrincipalBalance <= 0.01) {
          consPrincipalBalance = 0;
          consPaidOff = true;
        }

        consAccumulatedPaid += consPaymentThisMonth;

        // 5. Post-Bid Strategy Execution
        if (bidValue > 0 && !consPaidOff) {
          const remainingMonths = consTermMonths - m;
          if (remainingMonths > 0) {
            if (bidStrategy === 'reduce_installment') {
              // Recalculate PMT to spread new balance over ALL remaining months
              currentConsPrincipalPMT = consPrincipalBalance / remainingMonths;
            }
            // if 'reduce_term', we CHANGE NOTHING about currentConsPrincipalPMT.
            // We just keep paying the same amount, which will kill the balance faster.
          }
        }
      }

      finalData.push({
        month: m,
        financing: finAccumulatedPaid,
        consortium: consAccumulatedPaid,
        financingMonthlyPaid: finPaymentThisMonth,
        consortiumMonthlyPaid: consPaymentThisMonth,
        // Detailed Fin Props
        finInterest: currentFinInterest,
        finAmortization: currentFinAmortization,
        finRegularPMT: currentFinRegularPMT,
        finExtra: currentFinExtra,
        // Detailed Cons Props
        consRegularPMT: currentConsRegularPMT,
        consBid: currentConsBid
      });
    }

    // Initial Display
    const initialFinTotalMonthly = fixedFinPMT + monthlyFinFee;
    // Initial Cons PMT = (Principal / Term) + Fixed Fees
    const initialConsPrincipalPMT = (consVehicleValue - consDownPayment) / consTermMonths;
    const initialConsTotalMonthly = initialConsPrincipalPMT + consMonthlyFixedFee;

    return {
      data: finalData,
      financingTotal: finAccumulatedPaid,
      consortiumTotal: consAccumulatedPaid,
      financingInitialPMT: initialFinTotalMonthly,
      consortiumInitialPMT: initialConsTotalMonthly
    };

  }, [
    finVehicleValue, finTermMonths, finDownPayment, financingRate, finIOF, finInsurance, finEvents,
    consVehicleValue, consTermMonths, consDownPayment, consortiumAdminRate, consInsurance, inflationRate, consEvents, bidStrategy
  ]);

  const { data, financingTotal, consortiumTotal, financingInitialPMT, consortiumInitialPMT } = simulationData;
  const difference = financingTotal - consortiumTotal;
  const betterOption = difference > 0 ? consLabel : finLabel;
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
                {entry.name === 'financing' ? finLabel : entry.name === 'consortium' ? consLabel : entry.name}
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

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;

    try {
      // Use html-to-image instead of html2canvas
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
        height: dashboardRef.current.scrollHeight,
        style: {
          height: 'auto',
          overflow: 'visible'
        }
      });

      // Load image to get dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);

      // Calculate PDF dimensions based on A4 width (210mm) and image aspect ratio
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (img.height * pdfWidth) / img.width;

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [pdfWidth, pdfHeight] // Custom format to fit content exactly
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('simulacao-financeira.pdf');
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Erro ao exportar PDF: " + err.message);
    }
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
            {/* Name Input for Financing */}
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={finLabel}
                onChange={(e) => setFinLabel(e.target.value)}
                className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full"
              />
            </div>

            <SliderInput label="Valor do Veículo" value={finVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setFinVehicleValue} />
            <SliderInput label="Entrada" value={finDownPayment} min={0} max={finVehicleValue * 0.9} step={1000} prefix="R$ " onChange={setFinDownPayment} />
            <SliderInput label="Prazo (Meses)" value={finTermMonths} min={12} max={120} step={1} onChange={setFinTermMonths} />
            <SliderInput label="Taxa de Juros (% a.a.)" value={financingRate} min={0} max={40} step={0.01} suffix="%" onChange={setFinancingRate} />
            <SliderInput label="IOF (% Total)" value={finIOF} min={0} max={5} step={0.01} suffix="%" onChange={setFinIOF} />
            <SliderInput label="Seguro Prestamista (% Total)" value={finInsurance} min={0} max={10} step={0.01} suffix="%" onChange={setFinInsurance} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
              <div className="text-xs text-slate-500 mb-1">Parcela Inicial Estimada (c/ Taxas)</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(financingInitialPMT)}</div>
            </div>

            <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 mb-4">
              <strong>Nota:</strong> Amortizações extras reduzem o saldo devedor e o prazo (antecipação de parcelas), mantendo o valor da parcela fixo.
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
            {/* Name Input for Consortium */}
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={consLabel}
                onChange={(e) => setConsLabel(e.target.value)}
                className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full"
              />
            </div>

            <SliderInput label="Valor do Veículo (Carta)" value={consVehicleValue} min={20000} max={500000} step={1000} prefix="R$ " onChange={setConsVehicleValue} />
            <SliderInput label="Entrada Inicial (Não Lance)" value={consDownPayment} min={0} max={consVehicleValue * 0.5} step={1000} prefix="R$ " onChange={setConsDownPayment} />
            <SliderInput label="Prazo (Meses)" value={consTermMonths} min={12} max={120} step={1} onChange={setConsTermMonths} />
            <SliderInput label="Taxa Adm. Total (%)" value={consortiumAdminRate} min={0} max={30} step={0.01} suffix="%" onChange={setConsortiumAdminRate} />
            <SliderInput label="Seguro (% Variável/Total)" value={consInsurance} min={0} max={10} step={0.01} suffix="%" onChange={setConsInsurance} />
            <SliderInput label="Inflação (IPCA % a.a.)" value={inflationRate} min={0} max={15} step={0.01} suffix="%" onChange={setInflationRate} />

            <div className="mb-6">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Estratégia de Lance (Contemplação)</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition-colors ${bidStrategy === 'reduce_term' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setBidStrategy('reduce_term')}
                >
                  Reduzir Prazo
                </button>
                <button
                  className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition-colors ${bidStrategy === 'reduce_installment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  onClick={() => setBidStrategy('reduce_installment')}
                >
                  Reduzir Parcela
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {bidStrategy === 'reduce_term' ? 'Mantém o valor da parcela (fundo comum) e quita saldo mais rápido.' : 'Mantém o prazo original e diminui o valor da parcela mensal.'}
              </p>
            </div>

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
      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col" ref={dashboardRef}>

        {/* Header with Export */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card
            title={`Total Pago - ${finLabel}`}
            value={formatCurrency(financingTotal)}
            subtext={`${finTermMonths} parcelas fixas`}
            icon={TrendingUp}
          />
          <Card
            title={`Total Pago - ${consLabel}`}
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
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col min-h-[500px]">
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
                  name={finLabel}
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="consortium"
                  name={consLabel}
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

        {/* Parameters Summary (Included in PDF) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 pt-8">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {finLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>Valor do Veículo:</span> <strong>{formatCurrency(finVehicleValue)}</strong></li>
              <li className="flex justify-between"><span>Entrada:</span> <strong>{formatCurrency(finDownPayment)}</strong></li>
              <li className="flex justify-between"><span>Prazo:</span> <strong>{finTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Taxa de Juros:</span> <strong>{financingRate}% a.a.</strong></li>
              <li className="flex justify-between"><span>IOF:</span> <strong>{finIOF}%</strong></li>
              <li className="flex justify-between"><span>Seguro Prestamista:</span> <strong>{finInsurance}%</strong></li>
              <li className="flex justify-between"><span>Total Amortizações Extras:</span> <strong>{formatCurrency(finEvents.reduce((acc, e) => acc + e.value, 0))}</strong></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {consLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>Valor da Carta:</span> <strong>{formatCurrency(consVehicleValue)}</strong></li>
              <li className="flex justify-between"><span>Entrada Inicial:</span> <strong>{formatCurrency(consDownPayment)}</strong></li>
              <li className="flex justify-between"><span>Prazo:</span> <strong>{consTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Taxa Adm. Total:</span> <strong>{consortiumAdminRate}%</strong></li>
              <li className="flex justify-between"><span>Seguro (Carta):</span> <strong>{consInsurance}%</strong></li>
              <li className="flex justify-between"><span>Inflação Estimada (IPCA):</span> <strong>{inflationRate}% a.a.</strong></li>
              <li className="flex justify-between"><span>Estratégia de Lance:</span> <strong>{bidStrategy === 'reduce_term' ? 'Reduzir Prazo' : 'Reduzir Parcela'}</strong></li>
              <li className="flex justify-between"><span>Total Lances:</span> <strong>{formatCurrency(consEvents.reduce((acc, e) => acc + e.value, 0))}</strong></li>
            </ul>
          </div>
        </div>

        {/* Amortization Table */}
        <div className="mt-8 border-t border-slate-200 pt-8">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Tabela de Amortização (Mensal)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-600">
              <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-center" rowSpan="2">Mês</th>
                  <th className="px-4 py-2 text-center border-l border-slate-200" colSpan="4">{finLabel}</th>
                  <th className="px-4 py-2 text-center border-l border-slate-200" colSpan="2">{consLabel}</th>
                </tr>
                <tr>
                  {/* Financing Sub-headers */}
                  <th className="px-4 py-2 border-l border-slate-200 text-xs text-slate-400">Parcela Total</th>
                  <th className="px-4 py-2 text-xs text-slate-400">Juros</th>
                  <th className="px-4 py-2 text-xs text-slate-400">Amortização</th>
                  <th className="px-4 py-2 text-xs text-slate-400 text-green-600">Extra</th>
                  {/* Consortium Sub-headers */}
                  <th className="px-4 py-2 border-l border-slate-200 text-xs text-slate-400">Parcela Total</th>
                  <th className="px-4 py-2 text-xs text-slate-400 text-green-600">Lance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slice(1).map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium text-center">{row.month}</td>

                    {/* Fin Columns */}
                    <td className="px-4 py-2 border-l border-slate-200 font-semibold">{formatCurrency(row.finRegularPMT)}</td>
                    <td className="px-4 py-2 text-red-400">{formatCurrency(row.finInterest)}</td>
                    <td className="px-4 py-2 text-blue-400">{formatCurrency(row.finAmortization)}</td>
                    <td className="px-4 py-2 text-green-600 font-bold">{row.finExtra > 0 ? formatCurrency(row.finExtra) : '-'}</td>

                    {/* Cons Columns */}
                    <td className="px-4 py-2 border-l border-slate-200 font-semibold">{formatCurrency(row.consRegularPMT)}</td>
                    <td className="px-4 py-2 text-green-600 font-bold">{row.consBid > 0 ? formatCurrency(row.consBid) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
