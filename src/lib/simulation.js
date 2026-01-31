
export function simulateBuilderDirect({ termMonths, monthlyValue, balloonValue, handoverValue, inccRate }) {
    const monthlyIncc = Math.pow(1 + inccRate / 100, 1 / 12) - 1;
    const schedule = [];
    let accumulated = 0;

    for (let m = 1; m <= termMonths; m++) {
        const correctionFactor = Math.pow(1 + monthlyIncc, m);

        // 1. Monthly Payment (Corrigida)
        const monthly = monthlyValue * correctionFactor;

        // 2. Balloon (Annual - Month 12, 24, 36...)
        let balloon = 0;
        if (m % 12 === 0 && m !== termMonths) { // Don't pay balloon on last month if handover exists? Or both? Usually separate.
            balloon = balloonValue * correctionFactor;
        }

        // 3. Handover (Last Month)
        let handover = 0;
        if (m === termMonths) {
            handover = handoverValue * correctionFactor;
        }

        const total = monthly + balloon + handover;
        accumulated += total;

        schedule.push({
            month: m,
            builderMonthly: monthly,
            builderBalloon: balloon,
            builderHandover: handover,
            total,
            accumulated
        });
    }

    return { schedule, totalPaid: accumulated };
}

export function simulateConstructionInterest({ loanAmount, termMonths, annualRate }) {
    // "Juros de Obra": Interest on the amount disbursed by the bank to the builder.
    // We assume a linear dispersion (linear S-curve) from 0% to 100% over the construction term.

    const monthlyRate = Math.pow(1 + annualRate / 100, 1 / 12) - 1;
    const schedule = [];
    let accumulated = 0;

    for (let m = 1; m <= termMonths; m++) {
        // Linear progression: Bank disburses 1/Nth of the loan every month
        // Balance owed to bank increases, so interest paid increases.
        const progress = m / termMonths;
        const disbursedAmount = loanAmount * progress;

        const interestPayment = disbursedAmount * monthlyRate;
        accumulated += interestPayment;

        schedule.push({
            month: m,
            disbursedAmount,
            interestPayment, // This is the "Juros de Obra" payment
            accumulated
        });
    }

    return { schedule, totalPaid: accumulated };
}

export function simulatePrice({ principal, termMonths, annualRate, monthlyFee, extraEvents, strategy }) {
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

export function simulateSAC({ principal, termMonths, annualRate, monthlyFee, extraEvents, strategy }) {
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

export function simulateConsortium({ assetValue, downPayment, termMonths, adminRate, insuranceRate, reserveFundRate, inflationRate, bidEvents, bidStrategy }) {
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
