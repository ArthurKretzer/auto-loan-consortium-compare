# Simulador Financeiro: Financiamento vs. Consórcio

> Ferramenta interativa para comparação avançada de crédito, incluindo imóveis na planta, financiamentos (SAC/Price) e consórcios.

![Status do Build](https://img.shields.io/badge/build-passing-brightgreen)
![Versão React](https://img.shields.io/badge/react-v19-blue)
![Licença](https://img.shields.io/badge/license-MIT-green)

## Visão Geral

Este projeto é uma aplicação web desenvolvida para simular e comparar detalhadamente cenários de aquisição de bens (Imóveis e Veículos) via **Financiamento Bancário** ou **Consórcio**.

Diferente de simuladores simples, esta ferramenta permite modelar cenários complexos do mercado brasileiro, como **compra de imóveis na planta** (com fluxo de obra e juros de obra), amortizações extraordinárias, lances em consórcio e diferentes sistemas de amortização (SAC vs. Price).

## 🚀 Funcionalidades Principais

### 🏠 Novidade: Simulador de Imóvel na Planta (Off-Plan)
- **Fluxo de Obras**: Modele pagamentos mensais, anuais (balões) e chaves diretamente à construtora.
- **Juros de Obra**: Simulação automática da correção do saldo devedor (INCC) e pagamentos de juros sobre o valor desembolsado pelo banco durante a obra.
- **Gráfico de Fluxo de Caixa**: Visualização em área empilhada (Stacked Area) mostrando exatamente quanto sai do bolso mês a mês (Construtora + Juros de Obra + Financiamento).

### 🏦 Financiamento
- **Sistemas de Amortização**: Suporte completo a **Tabela SAC** (Parcelas decrescentes) e **Tabela Price** (Parcelas fixas).
- **Custos Reais**: Inclusão de IOF, Seguro Prestamista e Taxas Administrativas no Custo Efetivo Total.
- **Amortização Extra**: Simule o impacto de abater o saldo devedor (reduzindo prazo ou valor da parcela) com "dinheiro extra".

### 🤝 Consórcio
- **Lances Estratégicos**: Simule lances livres ou embutidos.
- **Estratégias de Contemplação**: Escolha entre reduzir o prazo ou reduzir a parcela após a contemplação.
- **Inflação Anual**: Projeção de reajuste das parcelas e do crédito pelo IPCA/INCC.

### 📊 Análise e Relatórios
- **Comparativo Visual**: Gráfico de evolução do "Patrimônio Pago" vs. "Dívida Restante".
- **Tabelas Detalhadas**: Cronograma mês a mês de todos os pagamentos.
- **Exportação PDF**: Gere relatórios profissionais para clientes ou uso pessoal.

## 🛠️ Instalação e Execução

### Pré-requisitos
- Node.js (v18+)
- npm ou yarn

### Passo a Passo

1. **Clone o repositório**
   ```bash
   git clone https://github.com/ArthurKretzer/auto-loan-consortium-compare.git
   cd auto-loan-consortium-compare
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Execute localmente**
   ```bash
   npm run dev
   ```
   Acesse `http://localhost:5173`.

## 📂 Estrutura do Projeto

O projeto utiliza **Vite** + **React** com uma arquitetura focada em simulação local (Client-Side).

```text
src/
├── App.jsx             # Lógica central e Interface (Single-File Component pattern)
├── main.jsx            # Entry point
└── index.css           # Estilos globais (Tailwind CSS)
```

## 🤝 Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir Issues ou enviar Pull Requests.

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/MinhaFeature`)
3. Faça o Commit (`git commit -m 'Adiciona funcionalidade X'`)
4. Faça o Push (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença [MIT](LICENSE).

---
Desenvolvido com ❤️ para ajudar brasileiros a tomarem melhores decisões financeiras.
