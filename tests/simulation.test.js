
import { describe, expect, it } from 'vitest';
import { simulateBuilderDirect, simulateConsortium, simulateConstructionInterest, simulatePrice, simulateSAC } from '../src/lib/simulation';

describe('Simulation Logic - Golden Master', () => {

    it('should match SAC simulation snapshot', () => {
        const input = {
            principal: 200000,
            termMonths: 360,
            annualRate: 10.5,
            monthlyFee: 25,
            extraEvents: [{ month: 12, value: 5000 }],
            strategy: 'reduce_term'
        };
        const result = simulateSAC(input);
        expect(result).toMatchSnapshot();
    });

    it('should match Price simulation snapshot', () => {
        const input = {
            principal: 50000,
            termMonths: 48,
            annualRate: 15,
            monthlyFee: 0,
            extraEvents: [],
            strategy: 'reduce_installment'
        };
        const result = simulatePrice(input);
        expect(result).toMatchSnapshot();
    });

    it('should match Consortium simulation snapshot', () => {
        const input = {
            assetValue: 100000,
            downPayment: 0,
            termMonths: 100,
            adminRate: 15,
            insuranceRate: 0,
            reserveFundRate: 1,
            inflationRate: 4,
            bidEvents: [{ month: 10, value: 10000 }],
            bidStrategy: 'reduce_term'
        };
        const result = simulateConsortium(input);
        expect(result).toMatchSnapshot();
    });

    it('should match Off-Plan Builder simulation snapshot', () => {
        const input = {
            termMonths: 36,
            monthlyValue: 1500,
            balloonValue: 10000,
            handoverValue: 50000,
            inccRate: 8
        };
        const result = simulateBuilderDirect(input);
        expect(result).toMatchSnapshot();
    });

    it('should match Construction Interest (Juros Obra) snapshot', () => {
        const input = {
            loanAmount: 300000,
            termMonths: 36,
            annualRate: 10
        };
        const result = simulateConstructionInterest(input);
        expect(result).toMatchSnapshot();
    });
});
