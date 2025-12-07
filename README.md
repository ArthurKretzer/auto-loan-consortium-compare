# Simulador Financeiro: Financiamento vs. Consórcio

Este projeto é uma aplicação web interativa desenvolvida em React para simular e comparar cenários de **Financiamento** e **Consórcio**, focada no mercado brasileiro.

A ferramenta permite aos usuários configurar detalhadamente cada modalidade, visualizar a evolução dos pagamentos em gráficos, analisar tabelas de amortização mês a mês e exportar um relatório completo em PDF.

## 🚀 Funcionalidades Principais

### 🏦 Financiamento (Tabela Price)

- **Cálculo de Parcelas Fixas**: Baseado na Tabela Price.
- **Taxas e Seguros**: Inclusão de IOF (0.38%) e Seguro Prestamista nas parcelas.
- **Amortização Extra**: Simulação de pagamentos extras pontuais que reduzem o saldo devedor e o prazo (mantendo o valor da parcela).

### 🤝 Consórcio

- **Reajuste Anual**: Correção do saldo devedor e parcelas baseado na inflação (IPCA) configurada.
- **Taxas Administrativas**: Taxa de administração e seguro de vida/quebra de garantia.
- **Estratégias de Lance**:
  - **Reduzir Prazo**: O lance abate o saldo devedor, mantendo o valor da parcela (fundo comum) e reduzindo o número de meses restantes.
  - **Reduzir Parcela**: O lance abate o saldo devedor e recalcula (reduz) o valor das parcelas futuras para o restante do prazo original.

### 📊 Análise e Relatórios

- **Comparativo Visual**: Gráfico de linha interativo mostrando o "Total Pago Acumulado" ao longo do tempo.
- **Tabelas Detalhadas**: Visualização mês a mês de juros, amortização, lances e pagamentos extras.
- **Exportação PDF**: Geração de relatório completo com um clique.
- **Nomes Personalizáveis**: Identifique os cenários (ex: "Banco X" vs "Consórcio Y").

## 📂 Estrutura do Projeto

O projeto utiliza **Vite** como build tool e **React** como biblioteca principal, com estilos em **Tailwind CSS**.

```bash
fin-simulations/
├── public/              # Arquivos estáticos
├── src/
│   ├── assets/          # Imagens e ícones
│   ├── App.jsx          # Componente Principal (Lógica e UI)
│   ├── main.jsx         # Ponto de entrada React
│   └── index.css        # Configuração do Tailwind CSS
├── index.html           # HTML base
├── package.json         # Dependências e scripts
├── tailwind.config.js   # Configuração do Tailwind
├── postcss.config.js    # Configuração do PostCSS
└── vite.config.js       # Configuração do Vite
```

> **Nota**: A aplicação foi desenhada como uma solução *Single-File Component* (`App.jsx`) para facilitar o entendimento do fluxo de simulação e a portabilidade.

## 🛠️ Como Executar

### Pré-requisitos

- Node.js (v18+ recomendado)
- npm (v9+)

### Instalação

1. Clone o repositório:

   ```bash
   git clone https://github.com/seu-usuario/fin-simulations.git
   cd fin-simulations
   ```

2. Instale as dependências:

   ```bash
   npm install
   ```

### Desenvolvimento

Para rodar o servidor de desenvolvimento local:

```bash
npm run dev
```

Acesse `http://localhost:5173`.

### Build de Produção

Para gerar a versão otimizada para produção:

```bash
npm run build
```

Os arquivos serão gerados na pasta `dist/`.

## 🤝 Como Contribuir

Contribuições são bem-vindas! Se você deseja melhorar a lógica de cálculo, adicionar novos gráficos ou corrigir bugs:

1. Faça um **Fork** do projeto.
2. Crie uma **Branch** para sua feature (`git checkout -b feature/nova-logica`).
3. Faça o **Commit** das suas alterações (`git commit -m 'Adiciona cálculo SAC'`).
4. Faça o **Push** para a Branch (`git push origin feature/nova-logica`).
5. Abra um **Pull Request**.

## 📄 Licença

Este projeto é de uso livre para fins educacionais e pessoais.
