import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { AlertCircle, ArrowRightLeft, Calculator, Calendar, ChevronDown, DollarSign, Download, Home, Menu, Percent, Plus, Trash2, TrendingUp, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// ─── ASSET CONFIGS ─────────────────────────────────────────────────────────────

const ASSET_CONFIGS = {
  vehicle: {
    maxValue: 500000,
    maxFinTerm: 120,
    maxConsTerm: 120,
    defaultValue: 80000,
    defaultFinTerm: 60,
    defaultConsTerm: 80,
    defaultDownPayment: 20000,
    defaultConsDownPayment: 0,
    defaultFinRate: 3.29,
    defaultAdminRate: 9,
    defaultReserveFund: 0,
    valueStep: 1000,
    labels: {
      value: 'Valor do Veículo',
      consValue: 'Valor do Veículo (Carta)',
    },
  },
  property: {
    maxValue: 2000000,
    maxFinTerm: 420,
    maxConsTerm: 240,
    defaultValue: 600000,
    defaultFinTerm: 360,
    defaultConsTerm: 200,
    defaultDownPayment: 120000,
    defaultConsDownPayment: 0,
    defaultFinRate: 10.65,
    defaultAdminRate: 15,
    defaultReserveFund: 2,
    valueStep: 5000,
    labels: {
      value: 'Valor do Imóvel',
      consValue: 'Valor do Imóvel (Carta)',
    },
  },
};

// ─── PURE SIMULATION FUNCTIONS ─────────────────────────────────────────────────

function simulatePrice({ principal, termMonths, annualRate, monthlyFee, extraEvents, strategy }) {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let balance = principal;
  let accumulated = 0;
  const schedule = [];

  let fixedPMT = 0;
  if (balance > 0 && monthlyRate > 0) {
    fixedPMT = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
  } else if (balance > 0) {
    fixedPMT = balance / termMonths;
  }

  let currentPMT = fixedPMT;
  let paidOff = false;

  for (let m = 1; m <= termMonths; m++) {
    if (paidOff || balance <= 0.01) break;

    const interest = balance * monthlyRate;
    let principalComponent = currentPMT - interest;

    if (balance < principalComponent) {
      principalComponent = balance;
      paidOff = true;
    }

    const extraEvent = extraEvents.find(e => e.month === m);
    const extraValue = extraEvent ? Math.min(extraEvent.value, balance - principalComponent) : 0;

    const regularPMT = interest + principalComponent + monthlyFee;
    const totalPayment = regularPMT + extraValue;

    balance -= (principalComponent + extraValue);
    if (balance <= 0.01) { balance = 0; paidOff = true; }

    accumulated += totalPayment;

    schedule.push({
      month: m, interest, amortization: principalComponent,
      regularPMT, extra: extraValue, balance, accumulated,
    });

    if (extraValue > 0 && balance > 0) {
      const remaining = termMonths - m;
      if (remaining > 0) {
        if (strategy === 'reduce_installment' && monthlyRate > 0) {
          currentPMT = (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -remaining));
        }
      }
    }
  }

  return { schedule, initialPMT: fixedPMT + monthlyFee };
}

function simulateSAC({ principal, termMonths, annualRate, monthlyFee, extraEvents, strategy }) {
  const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
  let balance = principal;
  let baseAmortization = principal / termMonths;
  let accumulated = 0;
  const schedule = [];
  let paidOff = false;

  for (let m = 1; m <= termMonths; m++) {
    if (paidOff || balance <= 0.01) break;

    const interest = balance * monthlyRate;
    const amortization = Math.min(baseAmortization, balance);
    const regularPMT = amortization + interest + monthlyFee;

    const extraEvent = extraEvents.find(e => e.month === m);
    const extraValue = extraEvent ? Math.min(extraEvent.value, balance - amortization) : 0;

    balance -= (amortization + extraValue);
    if (balance < 0.01) { balance = 0; paidOff = true; }

    accumulated += regularPMT + extraValue;

    schedule.push({
      month: m, interest, amortization,
      regularPMT, extra: extraValue, balance, accumulated,
    });

    if (extraValue > 0 && balance > 0) {
      const remaining = termMonths - m;
      if (remaining > 0) {
        if (strategy === 'reduce_installment') {
          baseAmortization = balance / remaining;
        }
      }
    }
  }

  const initialPMT = (principal / termMonths) + (principal * monthlyRate) + monthlyFee;
  return { schedule, initialPMT };
}

function simulateConsortium({ assetValue, downPayment, termMonths, adminRate, insuranceRate, reserveFundRate, inflationRate, bidEvents, bidStrategy }) {
  const totalFixedFee = assetValue * ((adminRate + insuranceRate + reserveFundRate) / 100);
  const monthlyFixedFee = totalFixedFee / termMonths;

  let principalBalance = assetValue - downPayment;
  let currentPrincipalPMT = principalBalance / termMonths;
  let accumulated = downPayment;
  const schedule = [];
  let paidOff = false;

  for (let m = 1; m <= termMonths; m++) {
    if (paidOff || principalBalance <= 0.01) break;

    if (m > 1 && (m - 1) % 12 === 0) {
      const factor = 1 + inflationRate / 100;
      principalBalance *= factor;
      if (bidStrategy === 'reduce_installment') {
        const remaining = termMonths - (m - 1);
        if (remaining > 0) currentPrincipalPMT = principalBalance / remaining;
      } else {
        currentPrincipalPMT *= factor;
      }
    }

    const payment = currentPrincipalPMT + monthlyFixedFee;
    const bidEvent = bidEvents.find(e => e.month === m);
    const bidValue = bidEvent ? bidEvent.value : 0;

    let totalPayment = payment + bidValue;
    let regularPMT = payment;
    let principalReduction = currentPrincipalPMT + bidValue;

    if (principalReduction > principalBalance) {
      principalReduction = principalBalance;
      totalPayment = principalReduction + monthlyFixedFee;
      regularPMT = totalPayment;
      paidOff = true;
    }

    principalBalance -= principalReduction;
    if (principalBalance <= 0.01) { principalBalance = 0; paidOff = true; }

    accumulated += totalPayment;

    schedule.push({
      month: m, regularPMT, bid: bidValue, accumulated,
    });

    if (bidValue > 0 && !paidOff) {
      const remaining = termMonths - m;
      if (remaining > 0 && bidStrategy === 'reduce_installment') {
        currentPrincipalPMT = principalBalance / remaining;
      }
    }
  }

  const initialPMT = ((assetValue - downPayment) / termMonths) + monthlyFixedFee;
  return { schedule, initialPMT };
}

// ─── UI COMPONENTS ─────────────────────────────────────────────────────────────

const Card = ({ title, value, subtext, highlight, icon: Icon }) => (
  <div className={`p-4 sm:p-6 rounded-2xl border transition-all duration-300 ${highlight ? 'bg-indigo-600 border-indigo-500 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
      <div className={highlight ? 'text-indigo-100' : 'text-slate-500'}>{title}</div>
      {Icon && <Icon className={`w-5 h-5 ${highlight ? 'text-indigo-200' : 'text-slate-400'}`} />}
    </div>
    <div className={`text-2xl sm:text-3xl font-bold mb-1 ${highlight ? 'text-white' : 'text-slate-900'}`}>
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
        {prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}{suffix}
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

const ToggleGroup = ({ label, options, value, onChange, description }) => (
  <div className="mb-6">
    {label && <label className="text-sm font-medium text-slate-700 mb-2 block">{label}</label>}
    <div className="flex bg-slate-100 p-1 rounded-lg">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-md transition-colors ${value === opt.value ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
    {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
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

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
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

// ─── MAIN APP ──────────────────────────────────────────────────────────────────

function App() {
  const dashboardRef = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Asset Type & Amortization Method
  const [assetType, setAssetType] = useState('vehicle');
  const [amortMethod, setAmortMethod] = useState('price');

  const config = ASSET_CONFIGS[assetType];

  // Scenario Naming
  const [finLabel, setFinLabel] = useState("Financiamento");
  const [consLabel, setConsLabel] = useState("Consórcio");

  // Financing State
  const [finAssetValue, setFinAssetValue] = useState(config.defaultValue);
  const [finTermMonths, setFinTermMonths] = useState(config.defaultFinTerm);
  const [finDownPayment, setFinDownPayment] = useState(config.defaultDownPayment);
  const [financingRate, setFinancingRate] = useState(config.defaultFinRate);
  const [finIOF, setFinIOF] = useState(0.38);
  const [finInsurance, setFinInsurance] = useState(0);
  const [finEvents, setFinEvents] = useState([]);
  const [finAmortStrategy, setFinAmortStrategy] = useState('reduce_term');

  // Consortium State
  const [consAssetValue, setConsAssetValue] = useState(config.defaultValue);
  const [consTermMonths, setConsTermMonths] = useState(config.defaultConsTerm);
  const [consDownPayment, setConsDownPayment] = useState(config.defaultConsDownPayment);
  const [consortiumAdminRate, setConsortiumAdminRate] = useState(config.defaultAdminRate);
  const [consInsurance, setConsInsurance] = useState(0);
  const [consReserveFund, setConsReserveFund] = useState(config.defaultReserveFund);
  const [inflationRate, setInflationRate] = useState(4.5);
  const [consEvents, setConsEvents] = useState([]);
  const [bidStrategy, setBidStrategy] = useState('reduce_term');

  const handleAssetTypeChange = (newType) => {
    const c = ASSET_CONFIGS[newType];
    setAssetType(newType);
    setFinAssetValue(c.defaultValue);
    setFinTermMonths(c.defaultFinTerm);
    setFinDownPayment(c.defaultDownPayment);
    setFinancingRate(c.defaultFinRate);
    setConsAssetValue(c.defaultValue);
    setConsTermMonths(c.defaultConsTerm);
    setConsDownPayment(c.defaultConsDownPayment);
    setConsortiumAdminRate(c.defaultAdminRate);
    setConsReserveFund(c.defaultReserveFund);
    setFinEvents([]);
    setConsEvents([]);
  };

  // ─── Simulation ────────────────────────────────────────────────────────────

  const simulationData = useMemo(() => {
    const loanPrincipal = finAssetValue - finDownPayment;
    const totalFinFees = loanPrincipal * ((finIOF + finInsurance) / 100);
    const monthlyFinFee = finTermMonths > 0 ? totalFinFees / finTermMonths : 0;

    const finResult = amortMethod === 'sac'
      ? simulateSAC({ principal: loanPrincipal, termMonths: finTermMonths, annualRate: financingRate, monthlyFee: monthlyFinFee, extraEvents: finEvents, strategy: finAmortStrategy })
      : simulatePrice({ principal: loanPrincipal, termMonths: finTermMonths, annualRate: financingRate, monthlyFee: monthlyFinFee, extraEvents: finEvents, strategy: finAmortStrategy });

    const consResult = simulateConsortium({
      assetValue: consAssetValue, downPayment: consDownPayment, termMonths: consTermMonths,
      adminRate: consortiumAdminRate, insuranceRate: consInsurance, reserveFundRate: consReserveFund,
      inflationRate, bidEvents: consEvents, bidStrategy,
    });

    const maxLen = Math.max(finResult.schedule.length, consResult.schedule.length);
    const finalData = [{ month: 0, financing: finDownPayment, consortium: consDownPayment }];

    const finTotal = finDownPayment + (finResult.schedule.length > 0 ? finResult.schedule[finResult.schedule.length - 1].accumulated : 0);
    const consTotal = consDownPayment + (consResult.schedule.length > 0 ? consResult.schedule[consResult.schedule.length - 1].accumulated : 0);

    for (let i = 0; i < maxLen; i++) {
      const fin = finResult.schedule[i];
      const cons = consResult.schedule[i];
      finalData.push({
        month: i + 1,
        financing: fin ? finDownPayment + fin.accumulated : finalData[finalData.length - 1].financing,
        consortium: cons ? consDownPayment + cons.accumulated : finalData[finalData.length - 1].consortium,
        financingMonthlyPaid: fin ? fin.regularPMT + fin.extra : 0,
        consortiumMonthlyPaid: cons ? cons.regularPMT + cons.bid : 0,
        finInterest: fin ? fin.interest : 0,
        finAmortization: fin ? fin.amortization : 0,
        finRegularPMT: fin ? fin.regularPMT : 0,
        finExtra: fin ? fin.extra : 0,
        finBalance: fin ? fin.balance : 0,
        consRegularPMT: cons ? cons.regularPMT : 0,
        consBid: cons ? cons.bid : 0,
      });
    }

    return {
      data: finalData,
      financingTotal: finTotal,
      consortiumTotal: consTotal,
      financingInitialPMT: finResult.initialPMT,
      consortiumInitialPMT: consResult.initialPMT,
    };
  }, [
    finAssetValue, finTermMonths, finDownPayment, financingRate, finIOF, finInsurance, finEvents, finAmortStrategy, amortMethod,
    consAssetValue, consTermMonths, consDownPayment, consortiumAdminRate, consInsurance, consReserveFund, inflationRate, consEvents, bidStrategy,
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
                {entry.name === finLabel ? finLabel : entry.name === consLabel ? consLabel : entry.name}
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
      const dataUrl = await toPng(dashboardRef.current, {
        cacheBust: true,
        backgroundColor: '#f8fafc',
        height: dashboardRef.current.scrollHeight,
        style: { height: 'auto', overflow: 'visible', minWidth: '1024px' },
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);

      const pdfWidth = 210;
      const pdfHeight = (img.height * pdfWidth) / img.width;

      const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [pdfWidth, pdfHeight] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('simulacao-financeira.pdf');
    } catch (err) {
      console.error("PDF Export failed", err);
      alert("Erro ao exportar PDF: " + err.message);
    }
  };

  const amortMethodDescription = amortMethod === 'sac'
    ? 'SAC: Amortização constante, parcelas decrescentes.'
    : 'Price: Parcelas fixas, juros decrescentes.';

  const finStrategyDescription = finAmortStrategy === 'reduce_term'
    ? 'Mantém parcela fixa, reduz o prazo.'
    : 'Mantém prazo original, reduz a parcela.';

  const bidStrategyDescription = bidStrategy === 'reduce_term'
    ? 'Mantém o valor da parcela e quita saldo mais rápido.'
    : 'Mantém o prazo original e diminui o valor da parcela.';

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans">

      {/* Mobile Sidebar Toggle */}
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

      {/* Sidebar Controls */}
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
          value={assetType}
          onChange={handleAssetTypeChange}
        />

        <div className="space-y-6">
          {/* Financing Section */}
          <CollapsibleSection title={finLabel} icon={DollarSign}>
            <input
              type="text"
              value={finLabel}
              onChange={(e) => setFinLabel(e.target.value)}
              className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full mb-4 text-sm"
              placeholder="Nome do cenário"
            />

            <ToggleGroup
              label="Sistema de Amortização"
              options={[
                { value: 'price', label: 'Price' },
                { value: 'sac', label: 'SAC' },
              ]}
              value={amortMethod}
              onChange={setAmortMethod}
              description={amortMethodDescription}
            />

            <SliderInput label={config.labels.value} value={finAssetValue} min={20000} max={config.maxValue} step={config.valueStep} prefix="R$ " onChange={setFinAssetValue} />
            <SliderInput label="Entrada" value={finDownPayment} min={0} max={Math.round(finAssetValue * 0.9)} step={config.valueStep} prefix="R$ " onChange={setFinDownPayment} />
            <SliderInput label="Prazo (Meses)" value={finTermMonths} min={12} max={config.maxFinTerm} step={1} onChange={setFinTermMonths} />
            <SliderInput label="Taxa de Juros (% a.a.)" value={financingRate} min={0} max={40} step={0.01} suffix="%" onChange={setFinancingRate} />
            <SliderInput label="IOF (% Total)" value={finIOF} min={0} max={5} step={0.01} suffix="%" onChange={setFinIOF} />
            <SliderInput label="Seguro Prestamista (% Total)" value={finInsurance} min={0} max={10} step={0.01} suffix="%" onChange={setFinInsurance} />

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-4">
              <div className="text-xs text-slate-500 mb-1">Parcela Inicial Estimada (c/ Taxas)</div>
              <div className="text-lg font-semibold text-slate-700">{formatCurrency(financingInitialPMT)}</div>
            </div>

            <ToggleGroup
              label="Estratégia de Amortização Extra"
              options={[
                { value: 'reduce_term', label: 'Reduzir Prazo' },
                { value: 'reduce_installment', label: 'Reduzir Parcela' },
              ]}
              value={finAmortStrategy}
              onChange={setFinAmortStrategy}
              description={finStrategyDescription}
            />

            <EventList
              title="Amortizações Extras"
              events={finEvents}
              maxMonth={finTermMonths}
              onAdd={(ev) => setFinEvents([...finEvents, ev])}
              onRemove={(idx) => setFinEvents(finEvents.filter((_, i) => i !== idx))}
            />
          </CollapsibleSection>

          {/* Consortium Section */}
          <CollapsibleSection title={consLabel} icon={ArrowRightLeft}>
            <input
              type="text"
              value={consLabel}
              onChange={(e) => setConsLabel(e.target.value)}
              className="font-bold text-slate-600 border-none bg-transparent focus:ring-0 focus:border-b focus:border-indigo-500 p-0 w-full mb-4 text-sm"
              placeholder="Nome do cenário"
            />

            <SliderInput label={config.labels.consValue} value={consAssetValue} min={20000} max={config.maxValue} step={config.valueStep} prefix="R$ " onChange={setConsAssetValue} />
            <SliderInput label="Entrada Inicial (Não Lance)" value={consDownPayment} min={0} max={Math.round(consAssetValue * 0.5)} step={config.valueStep} prefix="R$ " onChange={setConsDownPayment} />
            <SliderInput label="Prazo (Meses)" value={consTermMonths} min={12} max={config.maxConsTerm} step={1} onChange={setConsTermMonths} />
            <SliderInput label="Taxa Adm. Total (%)" value={consortiumAdminRate} min={0} max={30} step={0.01} suffix="%" onChange={setConsortiumAdminRate} />
            <SliderInput label="Seguro (% Variável/Total)" value={consInsurance} min={0} max={10} step={0.01} suffix="%" onChange={setConsInsurance} />
            {assetType === 'property' && (
              <SliderInput label="Fundo de Reserva (%)" value={consReserveFund} min={0} max={5} step={0.1} suffix="%" onChange={setConsReserveFund} />
            )}
            <SliderInput label="Inflação (IPCA % a.a.)" value={inflationRate} min={0} max={15} step={0.01} suffix="%" onChange={setInflationRate} />

            <ToggleGroup
              label="Estratégia de Lance"
              options={[
                { value: 'reduce_term', label: 'Reduzir Prazo' },
                { value: 'reduce_installment', label: 'Reduzir Parcela' },
              ]}
              value={bidStrategy}
              onChange={setBidStrategy}
              description={bidStrategyDescription}
            />

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
          </CollapsibleSection>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col max-w-7xl mx-auto w-full" ref={dashboardRef}>

        {/* Header with Export */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {assetType === 'property' ? <Home className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            <span className="font-medium">{assetType === 'property' ? 'Imóvel' : 'Veículo'}</span>
            <span className="text-slate-300">•</span>
            <span>{amortMethod === 'sac' ? 'SAC' : 'Price'}</span>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm text-sm"
          >
            <Download className="w-4 h-4" /> Exportar PDF
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card
            title={`Total Pago - ${finLabel}`}
            value={formatCurrency(financingTotal)}
            subtext={`${amortMethod === 'sac' ? 'SAC' : 'Price'} - ${finTermMonths} meses`}
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
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col min-h-[400px] sm:min-h-[500px]">
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
            <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <p>Os valores do consórcio sofrem reajuste anual (IPCA). O financiamento usa {amortMethod === 'sac' ? 'SAC (parcelas decrescentes)' : 'Price (parcelas fixas)'}.</p>
          </div>
        </div>

        {/* Parameters Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 pt-8">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {finLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>{config.labels.value}:</span> <strong>{formatCurrency(finAssetValue)}</strong></li>
              <li className="flex justify-between"><span>Entrada:</span> <strong>{formatCurrency(finDownPayment)}</strong></li>
              <li className="flex justify-between"><span>Prazo:</span> <strong>{finTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Sistema:</span> <strong>{amortMethod === 'sac' ? 'SAC' : 'Price'}</strong></li>
              <li className="flex justify-between"><span>Taxa de Juros:</span> <strong>{financingRate}% a.a.</strong></li>
              <li className="flex justify-between"><span>IOF:</span> <strong>{finIOF}%</strong></li>
              <li className="flex justify-between"><span>Seguro Prestamista:</span> <strong>{finInsurance}%</strong></li>
              <li className="flex justify-between"><span>Estratégia Amort. Extra:</span> <strong>{finAmortStrategy === 'reduce_term' ? 'Reduzir Prazo' : 'Reduzir Parcela'}</strong></li>
              <li className="flex justify-between"><span>Total Amortizações Extras:</span> <strong>{formatCurrency(finEvents.reduce((acc, e) => acc + e.value, 0))}</strong></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {consLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>{config.labels.consValue}:</span> <strong>{formatCurrency(consAssetValue)}</strong></li>
              <li className="flex justify-between"><span>Entrada Inicial:</span> <strong>{formatCurrency(consDownPayment)}</strong></li>
              <li className="flex justify-between"><span>Prazo:</span> <strong>{consTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Taxa Adm. Total:</span> <strong>{consortiumAdminRate}%</strong></li>
              <li className="flex justify-between"><span>Seguro (Carta):</span> <strong>{consInsurance}%</strong></li>
              {assetType === 'property' && (
                <li className="flex justify-between"><span>Fundo de Reserva:</span> <strong>{consReserveFund}%</strong></li>
              )}
              <li className="flex justify-between"><span>Inflação (IPCA):</span> <strong>{inflationRate}% a.a.</strong></li>
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
                  <th className="px-3 py-2 text-center" rowSpan="2">Mês</th>
                  <th className="px-3 py-2 text-center border-l border-slate-200" colSpan={amortMethod === 'sac' ? 5 : 4}>{finLabel}</th>
                  <th className="px-3 py-2 text-center border-l border-slate-200" colSpan="2">{consLabel}</th>
                </tr>
                <tr>
                  <th className="px-3 py-2 border-l border-slate-200 text-xs text-slate-400">Parcela</th>
                  <th className="px-3 py-2 text-xs text-slate-400">Juros</th>
                  <th className="px-3 py-2 text-xs text-slate-400">Amortização</th>
                  {amortMethod === 'sac' && <th className="px-3 py-2 text-xs text-slate-400">Saldo</th>}
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
                    {amortMethod === 'sac' && <td className="px-3 py-2 text-slate-400">{formatCurrency(row.finBalance)}</td>}
                    <td className="px-3 py-2 text-green-600 font-bold">{row.finExtra > 0 ? formatCurrency(row.finExtra) : '-'}</td>
                    <td className="px-3 py-2 border-l border-slate-200 font-semibold">{formatCurrency(row.consRegularPMT)}</td>
                    <td className="px-3 py-2 text-green-600 font-bold">{row.consBid > 0 ? formatCurrency(row.consBid) : '-'}</td>
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
