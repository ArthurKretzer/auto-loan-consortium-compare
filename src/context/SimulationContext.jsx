
import { createContext, useContext, useMemo, useState } from 'react';
import { ASSET_CONFIGS } from '../config/constants';
import {
    simulateBuilderDirect,
    simulateConsortium,
    simulateConstructionInterest,
    simulatePrice,
    simulateSAC
} from '../lib/simulation';

const SimulationContext = createContext();

export function SimulationProvider({ children }) {
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

    // Off-Plan State (Property only)
    const [isOffPlan, setIsOffPlan] = useState(false);
    const [constructionTerm, setConstructionTerm] = useState(config.defaultConstructionTerm || 36);
    const [builderMonthly, setBuilderMonthly] = useState(config.defaultBuilderMonthly || 0);
    const [builderBalloons, setBuilderBalloons] = useState(config.defaultBuilderBalloons || 0); // Annual balloons
    const [builderHandover, setBuilderHandover] = useState(config.defaultBuilderHandover || 0); // Key handover
    const [constructionRate, setConstructionRate] = useState(8.0); // INCC estimated annual rate

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

    // Helper to sync defaults when asset type changes
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
        // Reset Off-Plan
        setIsOffPlan(false);
        if (newType === 'property') {
            setConstructionTerm(c.defaultConstructionTerm);
            setBuilderMonthly(c.defaultBuilderMonthly);
            setBuilderBalloons(c.defaultBuilderBalloons);
            setBuilderHandover(c.defaultBuilderHandover);
        }
    };

    // ─── Simulation ────────────────────────────────────────────────────────────

    const simulationData = useMemo(() => {
        // ─── CONSORTIUM ───
        const consResult = simulateConsortium({
            assetValue: consAssetValue, downPayment: consDownPayment, termMonths: consTermMonths,
            adminRate: consortiumAdminRate, insuranceRate: consInsurance, reserveFundRate: consReserveFund,
            inflationRate, bidEvents: consEvents, bidStrategy,
        });

        // ─── FINANCING (Standard vs Off-Plan) ───
        let finResult;
        let constructionData = null;
        let constructionAccumulated = 0;

        // We need to determine the financing start month relative to 0
        let finStartMonth = 0;

        // Safeguard: isOffPlan is only relevant for 'property' assetType
        const effectiveIsOffPlan = isOffPlan && assetType === 'property';

        if (effectiveIsOffPlan) {
            finStartMonth = constructionTerm;

            // 1. Builder Phase
            const balloonsCount = Math.floor(constructionTerm / 12);

            // Calculate Loan Principal (Saldo Devedor a Financiar)
            const nominalBuilderTotal = (builderMonthly * constructionTerm) + (builderBalloons * balloonsCount) + builderHandover;
            let rawPrincipal = finAssetValue - nominalBuilderTotal;
            if (rawPrincipal < 0) rawPrincipal = 0;

            // Apply INCC to the Principal (Saldo Devedor)
            const inccFactor = Math.pow(1 + constructionRate / 100, constructionTerm / 12);
            const loanPrincipal = rawPrincipal * inccFactor;

            // Simulate Builder Payments (with INCC on payments)
            const builderSim = simulateBuilderDirect({
                termMonths: constructionTerm,
                monthlyValue: builderMonthly,
                balloonValue: builderBalloons,
                handoverValue: builderHandover,
                inccRate: constructionRate
            });

            // Simulate Juros de Obra (on the growing Principal)
            const constructionInterestSim = simulateConstructionInterest({
                loanAmount: loanPrincipal,
                termMonths: constructionTerm,
                annualRate: financingRate
            });

            constructionData = { builder: builderSim.schedule, interest: constructionInterestSim.schedule };
            constructionAccumulated = builderSim.totalPaid + constructionInterestSim.totalPaid;

            // 2. Bank Phase
            const totalFinFees = loanPrincipal * ((finIOF + finInsurance) / 100);
            const monthlyFinFee = finTermMonths > 0 ? totalFinFees / finTermMonths : 0;

            const simFn = amortMethod === 'sac' ? simulateSAC : simulatePrice;
            finResult = simFn({
                principal: loanPrincipal,
                termMonths: finTermMonths,
                annualRate: financingRate,
                monthlyFee: monthlyFinFee,
                extraEvents: finEvents,
                strategy: finAmortStrategy
            });

        } else {
            // Standard
            const loanPrincipal = finAssetValue - finDownPayment;
            const totalFinFees = loanPrincipal * ((finIOF + finInsurance) / 100);
            const monthlyFinFee = finTermMonths > 0 ? totalFinFees / finTermMonths : 0;

            const simFn = amortMethod === 'sac' ? simulateSAC : simulatePrice;
            finResult = simFn({
                principal: loanPrincipal,
                termMonths: finTermMonths,
                annualRate: financingRate,
                monthlyFee: monthlyFinFee,
                extraEvents: finEvents,
                strategy: finAmortStrategy
            });
        }

        // ─── MERGE DATA ───
        const maxLen = Math.max(finStartMonth + finResult.schedule.length, consResult.schedule.length);
        const finalData = [];

        // Initial State (Month 0)
        finalData.push({
            month: 0,
            financing: isOffPlan ? 0 : finDownPayment,
            consortium: consDownPayment
        });

        const finTotal = (isOffPlan ? constructionAccumulated : finDownPayment) +
            (finResult.schedule.length > 0 ? finResult.schedule[finResult.schedule.length - 1].accumulated : 0);
        const consTotal = consDownPayment + (consResult.schedule.length > 0 ? consResult.schedule[consResult.schedule.length - 1].accumulated : 0);

        for (let i = 1; i <= maxLen; i++) {
            let finAccumulated = 0;
            let finMonthlyPaid = 0;
            let finMonthlyComponents = { builder: 0, interest: 0, bank: 0 };

            if (isOffPlan && assetType === 'property') {
                if (i <= constructionTerm) {
                    // Construction Phase
                    const bItem = constructionData.builder.find(x => x.month === i);
                    const iItem = constructionData.interest.find(x => x.month === i);

                    const bVal = bItem ? bItem.total : 0;
                    const iVal = iItem ? iItem.interestPayment : 0;

                    const bAcc = bItem ? bItem.accumulated : (constructionData.builder[constructionData.builder.length - 1]?.accumulated || 0);
                    const iAcc = iItem ? iItem.accumulated : (constructionData.interest[constructionData.interest.length - 1]?.accumulated || 0);

                    finAccumulated = bAcc + iAcc;
                    finMonthlyPaid = bVal + iVal;
                    finMonthlyComponents = { builder: bVal, interest: iVal, bank: 0 };
                } else {
                    // Amortization Phase (i > constructionTerm)
                    const bankMonth = i - constructionTerm;
                    const fItem = finResult.schedule.find(x => x.month === bankMonth);

                    if (fItem) {
                        finAccumulated = constructionAccumulated + fItem.accumulated;
                        finMonthlyPaid = fItem.regularPMT + fItem.extra;
                        finMonthlyComponents = { builder: 0, interest: 0, bank: finMonthlyPaid };
                    } else {
                        // Finished bank loan
                        finAccumulated = constructionAccumulated + (finResult.schedule[finResult.schedule.length - 1]?.accumulated || 0);
                        finMonthlyPaid = 0;
                    }
                }
            } else {
                // Standard
                const fItem = finResult.schedule.find(x => x.month === i);
                if (fItem) {
                    finAccumulated = finDownPayment + fItem.accumulated;
                    finMonthlyPaid = fItem.regularPMT + fItem.extra;
                } else {
                    finAccumulated = finDownPayment + (finResult.schedule[finResult.schedule.length - 1]?.accumulated || 0);
                    finMonthlyPaid = 0;
                }
            }

            const cItem = consResult.schedule.find(x => x.month === i);
            const consAccumulated = cItem ? consDownPayment + cItem.accumulated : (finalData[i - 1]?.consortium || consTotal);
            const consMonthlyPaid = cItem ? cItem.regularPMT + cItem.bid : 0;

            // Map construction data to table columns
            let tableRegularPMT = 0;
            let tableInterest = 0;
            let tableAmort = 0;
            let tableBalance = 0;
            let tableExtra = 0;

            if (isOffPlan && assetType === 'property' && i <= constructionTerm) {
                // Construction Phase
                tableRegularPMT = finMonthlyPaid;
                tableInterest = constructionData.interest.find(x => x.month === i)?.interestPayment || 0;
                tableAmort = constructionData.builder.find(x => x.month === i)?.total || 0;
                tableBalance = constructionData.interest.find(x => x.month === i)?.disbursedAmount || 0;
            } else if (isOffPlan && assetType === 'property' && i > constructionTerm) {
                // Off-Plan Bank Phase
                const bankMonth = i - constructionTerm;
                const fItem = finResult.schedule.find(x => x.month === bankMonth);
                if (fItem) {
                    tableRegularPMT = fItem.regularPMT;
                    tableInterest = fItem.interest;
                    tableAmort = fItem.amortization;
                    tableBalance = fItem.balance;
                    tableExtra = fItem.extra;
                }
            } else if (!isOffPlan || assetType !== 'property') {
                // Standard
                const fItem = finResult.schedule.find(x => x.month === i);
                if (fItem) {
                    tableRegularPMT = fItem.regularPMT;
                    tableInterest = fItem.interest;
                    tableAmort = fItem.amortization;
                    tableBalance = fItem.balance;
                    tableExtra = fItem.extra;
                }
            }

            finalData.push({
                month: i,
                financing: finAccumulated,
                consortium: consAccumulated,
                financingMonthlyPaid: finMonthlyPaid,
                consortiumMonthlyPaid: consMonthlyPaid,
                // Components for Stacked Area
                finBuilder: finMonthlyComponents?.builder || 0,
                finIntObra: finMonthlyComponents?.interest || 0,
                finBankPMT: finMonthlyComponents?.bank || (isOffPlan ? 0 : finMonthlyPaid),
                // Table Columns
                finRegularPMT: tableRegularPMT,
                finInterest: tableInterest,
                finAmortization: tableAmort,
                finBalance: tableBalance,
                finExtra: tableExtra,
                consRegularPMT: cItem ? cItem.regularPMT : 0,
                consBid: cItem ? cItem.bid : 0,
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
        // Off-Plan deps
        isOffPlan, constructionTerm, builderMonthly, builderBalloons, builderHandover, constructionRate, assetType
    ]);


    const value = {
        state: {
            assetType, config, amortMethod,
            finLabel, consLabel,
            finAssetValue, finTermMonths, finDownPayment, financingRate, finIOF, finInsurance, finEvents, finAmortStrategy,
            isOffPlan, constructionTerm, builderMonthly, builderBalloons, builderHandover, constructionRate,
            consAssetValue, consTermMonths, consDownPayment, consortiumAdminRate, consInsurance, consReserveFund, inflationRate, consEvents, bidStrategy,
            simulationData
        },
        actions: {
            setAssetType, handleAssetTypeChange, setAmortMethod,
            setFinLabel, setConsLabel,
            setFinAssetValue, setFinTermMonths, setFinDownPayment, setFinancingRate, setFinIOF, setFinInsurance, setFinEvents, setFinAmortStrategy,
            setIsOffPlan, setConstructionTerm, setBuilderMonthly, setBuilderBalloons, setBuilderHandover, setConstructionRate,
            setConsAssetValue, setConsTermMonths, setConsDownPayment, setConsortiumAdminRate, setConsInsurance, setConsReserveFund, setInflationRate, setConsEvents, setBidStrategy
        }
    };

    return (
        <SimulationContext.Provider value={value}>
            {children}
        </SimulationContext.Provider>
    );
}

export const useSimulation = () => useContext(SimulationContext);
