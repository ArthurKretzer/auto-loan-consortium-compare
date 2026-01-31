
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { Calendar, DollarSign, Download, Home, Percent, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { AmortizationTable } from './components/features/results/AmortizationTable';
import { ComparisonCharts } from './components/features/results/ComparisonCharts';
import { Sidebar } from './components/layout/Sidebar';
import { Card } from './components/ui/Card';
import { SimulationProvider, useSimulation } from './context/SimulationContext';


function AppContent() {
  const dashboardRef = useRef(null);
  const { state } = useSimulation();

  const { financingTotal, consortiumTotal } = state.simulationData;
  const difference = financingTotal - consortiumTotal;
  const betterOption = difference > 0 ? state.consLabel : state.finLabel;
  const savings = Math.abs(difference);

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

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

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto flex flex-col max-w-7xl mx-auto w-full" ref={dashboardRef}>

        {/* Header with Export */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {state.assetType === 'property' ? <Home className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
            <span className="font-medium">{state.assetType === 'property' ? 'Imóvel' : 'Veículo'}</span>
            <span className="text-slate-300">•</span>
            <span>{state.amortMethod === 'sac' ? 'SAC' : 'Price'}</span>
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
            title={`Total Pago - ${state.finLabel}`}
            value={formatCurrency(financingTotal)}
            subtext={`${state.amortMethod === 'sac' ? 'SAC' : 'Price'} - ${state.finTermMonths} meses`}
            icon={TrendingUp}
          />
          <Card
            title={`Total Pago - ${state.consLabel}`}
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

        {/* Charts & Table */}
        <ComparisonCharts />

        {/* Parameters Summary */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-slate-200 pt-8">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {state.finLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>{state.config.labels.value}:</span> <strong>{formatCurrency(state.finAssetValue)}</strong></li>
              {state.isOffPlan ? (
                <>
                  <li className="flex justify-between text-orange-600 bg-orange-50 px-1 rounded"><span>Imóvel na Planta:</span> <strong>Sim</strong></li>
                  <li className="flex justify-between"><span>Prazo Obra:</span> <strong>{state.constructionTerm} m</strong></li>
                  <li className="flex justify-between"><span>Total Construtora:</span> <strong>{formatCurrency((state.builderMonthly * state.constructionTerm) + (state.builderBalloons * Math.floor(state.constructionTerm / 12)) + state.builderHandover)}</strong></li>
                </>
              ) : (
                <li className="flex justify-between"><span>Entrada:</span> <strong>{formatCurrency(state.finDownPayment)}</strong></li>
              )}
              <li className="flex justify-between"><span>Prazo (Financ.):</span> <strong>{state.finTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Sistema:</span> <strong>{state.amortMethod === 'sac' ? 'SAC' : 'Price'}</strong></li>
              <li className="flex justify-between"><span>Taxa de Juros:</span> <strong>{state.financingRate}% a.a.</strong></li>
              <li className="flex justify-between"><span>IOF:</span> <strong>{state.finIOF}%</strong></li>
              <li className="flex justify-between"><span>Seguro Prestamista:</span> <strong>{state.finInsurance}%</strong></li>
              <li className="flex justify-between"><span>Estratégia Amort. Extra:</span> <strong>{state.finAmortStrategy === 'reduce_term' ? 'Reduzir Prazo' : 'Reduzir Parcela'}</strong></li>
              <li className="flex justify-between"><span>Total Amortizações Extras:</span> <strong>{formatCurrency(state.finEvents.reduce((acc, e) => acc + e.value, 0))}</strong></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">
              {state.consLabel} - Configuração
            </h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex justify-between"><span>{state.config.labels.consValue}:</span> <strong>{formatCurrency(state.consAssetValue)}</strong></li>
              <li className="flex justify-between"><span>Entrada Inicial:</span> <strong>{formatCurrency(state.consDownPayment)}</strong></li>
              <li className="flex justify-between"><span>Prazo:</span> <strong>{state.consTermMonths} meses</strong></li>
              <li className="flex justify-between"><span>Taxa Adm. Total:</span> <strong>{state.consortiumAdminRate}%</strong></li>
              <li className="flex justify-between"><span>Seguro (Carta):</span> <strong>{state.consInsurance}%</strong></li>
              {state.assetType === 'property' && (
                <li className="flex justify-between"><span>Fundo de Reserva:</span> <strong>{state.consReserveFund}%</strong></li>
              )}
              <li className="flex justify-between"><span>Inflação (IPCA):</span> <strong>{state.inflationRate}% a.a.</strong></li>
              <li className="flex justify-between"><span>Estratégia de Lance:</span> <strong>{state.bidStrategy === 'reduce_term' ? 'Reduzir Prazo' : 'Reduzir Parcela'}</strong></li>
              <li className="flex justify-between"><span>Total Lances:</span> <strong>{formatCurrency(state.consEvents.reduce((acc, e) => acc + e.value, 0))}</strong></li>
            </ul>
          </div>
        </div>

        <AmortizationTable />

      </main >
    </div >
  );
}

function App() {
  return (
    <SimulationProvider>
      <AppContent />
    </SimulationProvider>
  );
}

export default App;
