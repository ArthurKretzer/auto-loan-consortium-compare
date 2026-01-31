export const ASSET_CONFIGS = {
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
        // Off-Plan Defaults
        defaultConstructionTerm: 36,
        defaultBuilderMonthly: 1500,
        defaultBuilderBalloons: 10000, // Annual
        defaultBuilderHandover: 50000,
    },
};
