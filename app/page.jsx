'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Brand Colors ────────────────────────────────────────────────────────────
const C = {
  dark: '#060430',
  darkMid: '#0d0a2e',
  darkLight: '#161240',
  violet: '#3B128D',
  violetLight: '#5019be',
  orange: '#F75835',
  orangeLight: '#ff7455',
  cream: '#FDF5EF',
  white: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.55)',
  textSub: 'rgba(255,255,255,0.35)',
  border: 'rgba(255,255,255,0.07)',
  borderActive: 'rgba(247,88,53,0.35)',
  green: '#3ecf8e',
};

// ─── Utilities ───────────────────────────────────────────────────────────────
const rHex = (n) => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const genTx = () => '0x' + rHex(64);
const genAddr = () => '0x' + rHex(40);
const trunc = (s, a = 10, b = 8) => s.slice(0, a) + '...' + s.slice(-b);
const fmtNum = (n) => n.toLocaleString();

const COMMODITIES = ['Crude Oil', 'Copper Ore', 'Soybeans', 'Rice', 'Cotton', 'Liquefied Gas', 'Iron Ore', 'Wheat'];
const COUNTRIES = ['UAE', 'Singapore', 'Hong Kong', 'Japan', 'South Korea', 'India', 'Brazil', 'USA', 'Germany', 'Australia'];
const AMOUNTS = [100000, 250000, 500000, 1000000, 2500000, 5000000];
const BLOCK_SEED = 19847000;

// ─── Mock Trade History ──────────────────────────────────────────────────────
const MOCK_TRADES = [
  { id: 'T3-2482', commodity: 'Crude Oil',   amount: 2500000, seller: 'UAE',       buyer: 'Singapore',  status: 'Settled', date: 'Jan 18, 2026', settlement: '22h', fee: 6250,  saved: 68750  },
  { id: 'T3-2461', commodity: 'Iron Ore',    amount: 1200000, seller: 'Australia', buyer: 'Japan',      status: 'Settled', date: 'Jan 09, 2026', settlement: '19h', fee: 3000,  saved: 33000  },
  { id: 'T3-2440', commodity: 'Soybeans',   amount:  800000, seller: 'Brazil',    buyer: 'Hong Kong',  status: 'Settled', date: 'Dec 28, 2025', settlement: '24h', fee: 2000,  saved: 22000  },
  { id: 'T3-2419', commodity: 'Cotton',     amount:  350000, seller: 'India',     buyer: 'Germany',    status: 'Settled', date: 'Dec 15, 2025', settlement: '21h', fee:  875,  saved:  9625  },
  { id: 'T3-2388', commodity: 'Copper Ore', amount: 3000000, seller: 'USA',       buyer: 'S. Korea',   status: 'Settled', date: 'Nov 30, 2025', settlement: '23h', fee: 7500,  saved: 82500  },
  { id: 'T3-2371', commodity: 'Wheat',      amount:  450000, seller: 'Australia', buyer: 'UAE',        status: 'Settled', date: 'Nov 14, 2025', settlement: '20h', fee: 1125,  saved: 12375  },
  { id: 'T3-2350', commodity: 'Rice',       amount:  600000, seller: 'India',     buyer: 'Singapore',  status: 'Active',  date: 'Jan 24, 2026', settlement: '—',   fee: 1500,  saved: null   },
  { id: 'T3-2341', commodity: 'LNG',        amount: 5000000, seller: 'UAE',       buyer: 'Japan',      status: 'Active',  date: 'Jan 22, 2026', settlement: '—',   fee: 12500, saved: null   },
];

const MONTHLY_VOL = [
  { month: 'Aug', vol: 2.1 }, { month: 'Sep', vol: 3.5 },
  { month: 'Oct', vol: 2.8 }, { month: 'Nov', vol: 5.2 },
  { month: 'Dec', vol: 4.1 }, { month: 'Jan', vol: 8.9 },
];

function genTradeData(commodity, amount, seller, buyer) {
  const contractAddr = genAddr();
  const escrowAddr = genAddr();
  const sellerAddr = genAddr();
  const buyerAddr = genAddr();
  const block = BLOCK_SEED + Math.floor(Math.random() * 500 + 100);
  const gasBase = 0.0028 + Math.random() * 0.0018;

  return {
    meta: { commodity, amount, seller, buyer, contractAddr, sellerAddr, buyerAddr, escrowAddr },
    step1: {
      Network: 'Ethereum Mainnet',
      Contract: contractAddr,
      TxHash: genTx(),
      Block: (block).toLocaleString(),
      GasUsed: `${gasBase.toFixed(4)} ETH`,
      Type: 'Contract Deploy',
    },
    step2: {
      Token: 'USDC',
      Amount: `$${fmtNum(amount)}`,
      From: buyerAddr,
      To: contractAddr,
      TxHash: genTx(),
      Block: (block + 9).toLocaleString(),
      GasUsed: `${(gasBase * 0.4).toFixed(4)} ETH`,
    },
    step3: {
      Oracle: 'Chainlink',
      Documents: 'BL + CoO + Invoice',
      DocHash: genTx(),
      TxHash: genTx(),
      Block: (block + 64).toLocaleString(),
      Result: 'VERIFIED ✓',
    },
    step4: {
      Amount: `$${fmtNum(amount)} USDC`,
      To: sellerAddr,
      ProtocolFee: `$${fmtNum(Math.round(amount * 0.0025))} (0.25%)`,
      NetToSeller: `$${fmtNum(amount - Math.round(amount * 0.0025))}`,
      TxHash: genTx(),
      Block: (block + 97).toLocaleString(),
    },
  };
}

// ─── Blockchain Network SVG ──────────────────────────────────────────────────
const NODES = [
  { x: 12, y: 18 }, { x: 38, y: 8 }, { x: 65, y: 14 }, { x: 88, y: 22 },
  { x: 22, y: 42 }, { x: 52, y: 36 }, { x: 78, y: 46 },
  { x: 8, y: 65 },  { x: 35, y: 58 }, { x: 60, y: 68 }, { x: 85, y: 60 },
  { x: 18, y: 84 }, { x: 48, y: 80 }, { x: 74, y: 88 }, { x: 92, y: 76 },
];

const EDGES = [
  [0,1],[1,2],[2,3],[0,4],[1,4],[1,5],[2,5],[2,6],[3,6],
  [4,7],[4,8],[5,8],[5,9],[6,9],[6,10],[3,10],
  [7,11],[8,11],[8,12],[9,12],[9,13],[10,14],[10,13],[13,14],[11,12],[12,13],
];

function BlockchainViz({ className = '' }) {
  const [activeEdgeIdx, setActiveEdgeIdx] = useState(0);
  const [packetPos, setPacketPos] = useState(0);

  useEffect(() => {
    let pos = 0;
    const anim = setInterval(() => {
      pos += 0.04;
      if (pos >= 1) {
        pos = 0;
        setActiveEdgeIdx(i => (i + 1) % EDGES.length);
      }
      setPacketPos(pos);
    }, 30);
    return () => clearInterval(anim);
  }, []);

  const ae = EDGES[activeEdgeIdx];
  const fromNode = NODES[ae[0]];
  const toNode = NODES[ae[1]];
  const px = fromNode.x + (toNode.x - fromNode.x) * packetPos;
  const py = fromNode.y + (toNode.y - fromNode.y) * packetPos;

  return (
    <svg viewBox="0 0 100 100" className={className} preserveAspectRatio="xMidYMid meet">
      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const isActive = i === activeEdgeIdx;
        return (
          <line
            key={i}
            x1={NODES[a].x} y1={NODES[a].y}
            x2={NODES[b].x} y2={NODES[b].y}
            stroke={isActive ? C.orange : C.violet}
            strokeWidth={isActive ? 0.5 : 0.25}
            opacity={isActive ? 0.8 : 0.3}
            style={{ transition: 'all 0.2s ease' }}
          />
        );
      })}
      {/* Nodes */}
      {NODES.map((node, i) => (
        <circle
          key={i}
          cx={node.x} cy={node.y}
          r={1.8}
          fill={C.orange}
          className="node-pulse"
          style={{ animationDelay: `${(i * 0.13) % 2}s` }}
        />
      ))}
      {/* Data packet */}
      <circle cx={px} cy={py} r={1.2} fill={C.orangeLight} opacity={0.95} />
    </svg>
  );
}

// ─── Navigation ──────────────────────────────────────────────────────────────
function Nav({ blockHeight, onTryDemo }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(6,4,48,0.97)' : 'rgba(6,4,48,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <span className="font-display font-bold text-xl text-white">trade</span>
            <span className="font-display font-bold text-xl" style={{ color: C.orange }}>3</span>
          </div>

          {/* Block height ticker — hidden on smallest screens */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-body" style={{ color: C.textMuted }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            <span>ETH Block #{blockHeight.toLocaleString()}</span>
            <span className="opacity-40 mx-1">|</span>
            <span className="text-emerald-400">● Live</span>
          </div>

          {/* CTA */}
          <button
            onClick={onTryDemo}
            className="font-body font-semibold text-sm px-4 py-2 rounded-lg text-white transition-all duration-200"
            style={{ backgroundColor: C.orange }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.orangeLight; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.orange; e.currentTarget.style.transform = ''; }}
          >
            Try Demo
          </button>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────
function Hero({ onTryDemo }) {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden pt-16"
      style={{ backgroundColor: C.dark }}
    >
      {/* Gradient blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${C.violet}, transparent)` }}
      />
      <div
        className="absolute bottom-1/4 left-0 w-64 h-64 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${C.orange}, transparent)` }}
      />

      {/* Blockchain viz — desktop right side */}
      <div className="absolute right-0 top-0 w-1/2 h-full opacity-25 pointer-events-none hidden lg:block">
        <BlockchainViz className="w-full h-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-32 w-full">
        <div className="max-w-2xl">
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
            <span className="font-body text-sm" style={{ color: C.textMuted }}>
              Trade Finance · Blockchain · DeFi
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-display font-extrabold text-white leading-tight mb-6"
            style={{ fontSize: 'clamp(2.25rem, 6vw, 4rem)', letterSpacing: '-0.02em' }}
          >
            Making Trade Finance{' '}
            <span style={{ color: C.orange }}>Web3 Investable</span>
          </h1>

          {/* Subtext */}
          <p className="font-body text-lg sm:text-xl leading-relaxed mb-8" style={{ color: C.textMuted, maxWidth: '560px' }}>
            $2.5T in global trade goes unfunded each year. Trade3 uses blockchain smart contracts
            to eliminate delays, cut costs, and unlock capital for traders worldwide.
          </p>

          {/* Before/After pills */}
          <div className="flex flex-wrap gap-3 mb-10">
            {[
              { label: 'Settlement', was: '60+ days', now: '24 hrs' },
              { label: 'Fees', was: '3–5%', now: '0.25%' },
              { label: 'Access', was: 'Banks only', now: 'Global' },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center gap-2 px-3 py-2 rounded-lg font-body text-xs"
                style={{
                  backgroundColor: 'rgba(247,88,53,0.08)',
                  border: `1px solid rgba(247,88,53,0.2)`,
                }}
              >
                <span style={{ color: C.textSub }}>{item.label}:</span>
                <span className="line-through" style={{ color: C.textSub }}>{item.was}</span>
                <span style={{ color: C.textMuted }}>→</span>
                <span className="font-bold" style={{ color: C.orange }}>{item.now}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onTryDemo}
              className="font-body font-bold text-base px-8 py-4 rounded-xl text-white transition-all duration-200"
              style={{ backgroundColor: C.orange }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = C.orangeLight;
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(247,88,53,0.4)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = C.orange;
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '';
              }}
            >
              Try Live Demo →
            </button>
            <a
              href="mailto:contact@trade3.io"
              className="font-body font-semibold text-base px-8 py-4 rounded-xl text-white text-center transition-all duration-200"
              style={{ border: `2px solid ${C.border}`, backgroundColor: 'transparent' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
            >
              Contact Us
            </a>
          </div>
        </div>

        {/* Mobile blockchain viz */}
        <div className="mt-8 lg:hidden opacity-20 max-w-[200px] mx-auto">
          <BlockchainViz className="w-full h-28" />
        </div>
      </div>
    </section>
  );
}

// ─── Problem Section ─────────────────────────────────────────────────────────
function ProblemSection() {
  const pain = [
    {
      emoji: '⏱️',
      title: 'Inefficient',
      body: 'Outdated infrastructure and paper-based processes result in 60+ day settlement times, trapping working capital.',
    },
    {
      emoji: '🔒',
      title: 'Illiquid',
      body: 'Archaic credit structures and per-transaction KYC prevent secondary markets and limit institutional capital.',
    },
    {
      emoji: '🚫',
      title: 'Inaccessible',
      body: 'SMEs in emerging markets face high fees, opaque underwriting, and collateral requirements that exclude them from global trade.',
    },
  ];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.darkMid }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Big stat */}
        <div
          className="rounded-2xl p-6 sm:p-12 mb-10 sm:mb-16 text-center"
          style={{
            background: `linear-gradient(135deg, rgba(59,18,141,0.3), rgba(247,88,53,0.12))`,
            border: `1px solid rgba(247,88,53,0.2)`,
          }}
        >
          <div
            className="font-display font-extrabold text-white mb-2"
            style={{ fontSize: 'clamp(3rem, 10vw, 5rem)' }}
          >
            $2.5T
          </div>
          <div className="font-body text-lg sm:text-xl mb-1" style={{ color: C.textMuted }}>
            Annual Global Trade Finance Gap
          </div>
          <div className="font-body text-sm" style={{ color: C.textSub }}>
            Source: ADB Global Trade Finance Gap Survey 2024
          </div>
        </div>

        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>The Problem</span>
        </div>
        <h2 className="font-display font-bold text-white mb-12" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          The Old System Is Holding<br />Global Trade Back
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {pain.map(p => (
            <div
              key={p.title}
              className="rounded-xl p-6 transition-all duration-200 hover:-translate-y-1"
              style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}
            >
              <div className="text-3xl mb-4">{p.emoji}</div>
              <h3 className="font-display font-bold text-white text-lg mb-2">{p.title}</h3>
              <p className="font-body text-sm leading-relaxed" style={{ color: C.textMuted }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ADB 4 Priorities ────────────────────────────────────────────────────────
function ADBPrioritiesSection() {
  const priorities = [
    {
      num: '01', icon: '📊', badge: 'Data Infrastructure',
      title: 'Expand Trade Finance Register',
      adb: 'Making the Register more robust and granular provides the evidence base for better capital treatment of trade assets, reducing risk perceptions and freeing financing capacity for trade.',
      trade3: 'Every Trade3 transaction is hashed on-chain — creating a permanent, auditable register of verified trade finance activity that reduces information asymmetry for lenders globally.',
    },
    {
      num: '02', icon: '⚡', badge: 'Digitalisation 2030',
      title: 'Accelerate Trade Digitalisation',
      adb: 'Converting paper-based processes across exporters, shipping, ports, customs, warehousing, and finance would be transformational. A plan exists to achieve this by 2030.',
      trade3: 'Trade3 replaces paper docs with blockchain-native smart contracts. Bills of lading, certificates of origin, and invoices are hashed and oracle-verified on-chain in real time.',
    },
    {
      num: '03', icon: '🔗', badge: 'SCF Expansion',
      title: 'Scale Supply Chain Finance',
      adb: 'Expanding SCF solutions — including pre-shipment finance — allows more firms, especially SMEs, to access affordable liquidity and adjust to shifting global trade patterns.',
      trade3: "Trade3's financing vault structure lets any lender globally participate in funding verified trade transactions, creating a permissionless SCF layer on public blockchain.",
    },
    {
      num: '04', icon: '🌐', badge: 'SME Inclusion',
      title: 'Deep-Tier Supply Chain Finance',
      adb: 'DTSCF extends financing deeper into supply networks using anchor buyer creditworthiness, unlocking liquidity for smaller suppliers traditionally excluded from financial markets.',
      trade3: 'Trade3 tokenises trade receivables as RWA tokens backed by verified on-chain agreements — enabling lower-tier SME suppliers to access institutional liquidity at scale.',
    },
  ];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.dark }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>ADB Global Trade Finance Gap Survey 2025</span>
        </div>
        <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Trade3 Addresses the 4 Industry Priorities
        </h2>
        <p className="font-body text-lg mb-10 sm:mb-16" style={{ color: C.textMuted, maxWidth: '580px' }}>
          The ADB's 2025 report identifies four critical actions to close the $2.5T gap. Trade3 is purpose-built to deliver on all four.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {priorities.map(p => (
            <div
              key={p.num}
              className="rounded-2xl p-6 sm:p-7"
              style={{ backgroundColor: C.darkMid, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{p.icon}</span>
                  <span className="font-body text-xs font-bold" style={{ color: C.orange }}>{p.num}</span>
                </div>
                <span
                  className="font-body text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: 'rgba(59,18,141,0.3)', color: 'rgba(255,255,255,0.55)', border: `1px solid rgba(59,18,141,0.4)` }}
                >
                  {p.badge}
                </span>
              </div>
              <h3 className="font-display font-bold text-white text-lg mb-4">{p.title}</h3>
              <div className="space-y-2.5">
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
                  <div className="font-body text-xs font-semibold mb-1.5" style={{ color: C.textSub }}>ADB Priority</div>
                  <p className="font-body text-xs leading-relaxed" style={{ color: C.textMuted }}>{p.adb}</p>
                </div>
                <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(247,88,53,0.06)', border: `1px solid rgba(247,88,53,0.2)` }}>
                  <div className="font-body text-xs font-semibold mb-1.5" style={{ color: C.orange }}>Trade3 Response</div>
                  <p className="font-body text-xs leading-relaxed" style={{ color: C.textMuted }}>{p.trade3}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Fund Smart Agreement',
      body: 'Buyer and seller agree on trade terms. Buyer funds are deposited into a blockchain smart contract escrow — secure, transparent, automatically enforced.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
    {
      num: '02',
      title: 'Verify & Track',
      body: 'Bills of lading, certificates of origin, and invoices are hashed on-chain via Chainlink oracles. Real-time shipment tracking without paper.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      num: '03',
      title: 'Instant Payment Release',
      body: 'Once delivery is verified on-chain, the smart contract automatically releases funds to the seller. No bank delays, no intermediaries, no disputes.',
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.cream }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm font-medium" style={{ color: C.violet }}>Our solution</span>
        </div>
        <h2 className="font-display font-bold mb-4" style={{ color: C.dark, fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Trade Done Right
        </h2>
        <p className="font-body text-lg mb-10 sm:mb-16 max-w-xl" style={{ color: 'rgba(6,4,48,0.55)' }}>
          Three steps. Full transparency on-chain. No intermediaries.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {steps.map(step => (
            <div key={step.num}>
              <div
                className="bg-white rounded-2xl p-8 h-full transition-all duration-200 hover:-translate-y-1"
                style={{ boxShadow: '0 2px 12px rgba(6,4,48,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(6,4,48,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(6,4,48,0.06)'; }}
              >
                <div className="mb-6" style={{ color: C.dark }}>{step.icon}</div>
                <div className="font-body text-sm font-bold mb-2" style={{ color: C.orange }}>{step.num}</div>
                <h3 className="font-display font-bold text-xl mb-3" style={{ color: C.dark }}>{step.title}</h3>
                <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(6,4,48,0.55)' }}>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tokenised Bill of Exchange ──────────────────────────────────────────────
function TokenizedBoESection() {
  const [activeStep, setActiveStep] = useState(0);
  const [fading, setFading] = useState(false);

  const steps = [
    {
      num: '01', icon: '📄', label: 'Issue',
      title: 'Paper → Digital Token',
      desc: 'A traditional bill of exchange is converted into a unique digital token on Ethereum. All trade terms — amount, counterparties, maturity date, and legal obligations — are cryptographically embedded. Electronic signatures replace physical wet stamps entirely.',
      data: { Standard: 'UK ETDA 2023 / US UCC Art. 12', Type: 'Negotiable Instrument Token', Network: 'Ethereum Mainnet', Format: 'ERC-3475 (Bond Token)' },
      badge: '⚖️ Legally binding under UK Electronic Trade Documents Act 2023',
    },
    {
      num: '02', icon: '💰', label: 'Finance',
      title: 'Instant Working Capital',
      desc: 'The tokenised bill is offered to financing participants across the Trade3 network. Blockchain transparency enables rapid due diligence. Suppliers sell the bill at a discount for immediate USDC — cutting the traditional 30–90 day wait to under 24 hours.',
      data: { Mechanism: 'Discount Financing', Currency: 'USDC Stablecoin', Speed: '< 24 hours', 'vs Traditional': '30–90 day wait' },
      badge: '🔍 Chainlink oracle-verified receivables',
    },
    {
      num: '03', icon: '🔄', label: 'Transfer',
      title: 'Frictionless Ownership Transfer',
      desc: 'Ownership transfers automatically with the token — no physical delivery, re-endorsement, or new legal agreement per transfer. Any institution globally can hold the token. All transfers are instant, atomic, and immutably recorded on-chain with full audit trail.',
      data: { Type: 'Atomic Token Transfer', Settlement: 'T+0 (immediate)', Endorsement: 'Automatic on-chain', Audit: 'Immutable ledger' },
      badge: '🔒 Zero manual reconciliation required',
    },
    {
      num: '04', icon: '✅', label: 'Settle',
      title: 'Automated Payment Release',
      desc: 'At maturity, a smart contract automatically triggers payment execution to the current token holder. No need to track paper across institutions. Funds flow directly to the rightful owner in USDC, eliminating all manual reconciliation and bank delays.',
      data: { Trigger: 'Smart Contract Auto', Currency: 'USDC Stablecoin', Speed: 'Instant at maturity', Reconciliation: 'Zero manual steps' },
      badge: '✓ Validated: Citi × PwC × Solana Proof of Concept',
    },
  ];

  const goTo = (i) => {
    if (i === activeStep || fading) return;
    setFading(true);
    setTimeout(() => { setActiveStep(i); setFading(false); }, 180);
  };

  const s = steps[activeStep];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.darkLight }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>Validated: Citi × PwC × Solana Proof of Concept</span>
        </div>
        <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Tokenised Bill of Exchange
        </h2>
        <p className="font-body text-lg mb-10 sm:mb-12" style={{ color: C.textMuted, maxWidth: '560px' }}>
          Paper bills of exchange — the backbone of $10T in annual trade — converted into programmable digital tokens. Legal. Instant. Global.
        </p>

        {/* Step selector */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {steps.map((st, i) => (
            <button
              key={st.num}
              onClick={() => goTo(i)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-body font-semibold text-sm transition-all duration-200"
              style={{
                backgroundColor: i === activeStep ? C.orange : 'rgba(255,255,255,0.05)',
                color: i === activeStep ? C.white : C.textMuted,
                border: `1px solid ${i === activeStep ? C.orange : C.border}`,
              }}
            >
              <span>{st.icon}</span>
              <span>{st.label}</span>
            </button>
          ))}
        </div>

        {/* Content panel */}
        <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.18s ease' }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Description */}
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: C.darkMid, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-3 mb-5">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <div className="font-body text-xs font-bold" style={{ color: C.orange }}>Step {s.num}</div>
                  <h3 className="font-display font-bold text-white text-xl">{s.title}</h3>
                </div>
              </div>
              <p className="font-body text-sm leading-relaxed mb-6" style={{ color: C.textMuted }}>{s.desc}</p>
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg font-body text-xs"
                style={{ backgroundColor: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)' }}
              >
                <span style={{ color: C.green }}>✓</span>
                <span style={{ color: C.green }}>{s.badge}</span>
              </div>
            </div>

            {/* Right: On-chain params + lifecycle progress */}
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'rgba(247,88,53,0.04)', border: `1px solid rgba(247,88,53,0.2)` }}>
              <div className="font-body text-xs font-bold mb-5" style={{ color: C.orange }}>On-Chain Parameters</div>
              <div className="mb-6">
                {Object.entries(s.data).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5 border-b font-mono text-sm" style={{ borderColor: C.border }}>
                    <span style={{ color: C.textSub }}>{k}</span>
                    <span className="text-right" style={{ color: C.white }}>{v}</span>
                  </div>
                ))}
              </div>
              {/* Lifecycle progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-body text-xs" style={{ color: C.textSub }}>Lifecycle Progress</span>
                  <span className="font-body text-xs font-bold" style={{ color: C.orange }}>{Math.round(((activeStep + 1) / 4) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-500"
                    style={{ backgroundColor: C.orange, width: `${((activeStep + 1) / 4) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between">
                  {steps.map((st, i) => (
                    <button
                      key={i}
                      onClick={() => goTo(i)}
                      className="font-body text-xs transition-colors"
                      style={{ color: i <= activeStep ? C.orange : C.textSub }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legal footnotes */}
        <div className="mt-8 flex flex-wrap gap-4 sm:gap-8 font-body text-xs" style={{ color: C.textSub }}>
          {[
            '⚖️ UK Electronic Trade Documents Act 2023',
            '⚖️ US Uniform Commercial Code Article 12',
            '🔬 Citi × PwC × Solana PoC — $1T DLT trade finance forecast by 2030',
          ].map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
    </section>
  );
}

// ─── Transaction Card ─────────────────────────────────────────────────────────
const TX_LABEL_MAP = {
  TxHash: 'Tx Hash', GasUsed: 'Gas Used', DocHash: 'Doc Hash',
  NetToSeller: 'Net Seller', ProtocolFee: 'Protocol Fee',
  Documents: 'Docs', Oracle: 'Oracle', Network: 'Network',
};
function fmtKey(k) { return TX_LABEL_MAP[k] || k; }

function TxCard({ label, data, status }) {
  if (status === null) return null;

  const isLoading = status === 'loading';
  const isConfirmed = status === 'confirmed';

  return (
    <div
      className="rounded-xl p-4 fade-in-up"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${isConfirmed ? 'rgba(62,207,142,0.35)' : isLoading ? C.borderActive : C.border}`,
        ...(isConfirmed ? { boxShadow: '0 0 12px rgba(62,207,142,0.1)' } : {}),
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-body font-semibold text-sm text-white">{label}</span>
        {isLoading && (
          <span className="flex items-center gap-1.5 font-body text-xs" style={{ color: C.orange }}>
            <svg className="animate-spin w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
              <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
            Processing…
          </span>
        )}
        {isConfirmed && (
          <span
            className="font-body text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'rgba(62,207,142,0.15)', color: C.green }}
          >
            ✓ Confirmed
          </span>
        )}
      </div>

      {isConfirmed && data && (
        <div className="space-y-1.5 font-mono text-xs" style={{ color: C.textMuted }}>
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2 min-w-0">
              <span className="opacity-60 whitespace-nowrap flex-shrink-0">{fmtKey(k)}:</span>
              <span
                className="text-right truncate min-w-0"
                style={{
                  color: String(v).startsWith('0x') ? 'rgba(255,255,255,0.5)'
                    : k === 'Result' || k === 'Oracle' ? C.green
                    : k === 'Amount' || k === 'NetToSeller' ? C.orange
                    : 'rgba(255,255,255,0.75)',
                }}
              >
                {String(v).startsWith('0x') ? trunc(v) : v}
              </span>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2 mt-1">
          {[80, 60, 90].map((w, i) => (
            <div key={i} className="h-2 rounded-full animate-pulse" style={{ width: `${w}%`, backgroundColor: 'rgba(255,255,255,0.07)' }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Live Demo Section ────────────────────────────────────────────────────────
function LiveDemo({ demoRef }) {
  const [phase, setPhase] = useState('idle'); // idle | connecting | trade | running | done
  const [statuses, setStatuses] = useState([null, null, null, null]);
  const [tradeData, setTradeData] = useState(null);
  const [walletAddr, setWalletAddr] = useState('');
  const [form, setForm] = useState({ commodity: 'Crude Oil', amount: 500000, seller: 'UAE', buyer: 'Singapore' });
  const [liveFeed, setLiveFeed] = useState([]);
  const timeoutsRef = useRef([]);

  // Generate live feed
  useEffect(() => {
    const TYPES = ['USDC Transfer', 'Contract Deploy', 'Payment Release', 'Escrow Fund', 'Oracle Verify'];
    const EMOJIS = { 'USDC Transfer': '💵', 'Contract Deploy': '📄', 'Payment Release': '💸', 'Escrow Fund': '🔐', 'Oracle Verify': '🔍' };

    const mkEntry = (id) => {
      const type = TYPES[Math.floor(Math.random() * TYPES.length)];
      return {
        id,
        type,
        emoji: EMOJIS[type],
        tx: genTx(),
        amount: `$${fmtNum(Math.floor(Math.random() * 4900000 + 100000))}`,
        ago: 'just now',
      };
    };

    setLiveFeed(Array.from({ length: 6 }, (_, i) => ({ ...mkEntry(i), ago: `${i * 7 + 3}s ago` })));

    const iv = setInterval(() => {
      setLiveFeed(prev => [mkEntry(Date.now()), ...prev.slice(0, 8)]);
    }, 4500);
    return () => clearInterval(iv);
  }, []);

  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
  }, []);

  const connectWallet = useCallback(() => {
    setPhase('connecting');
    const t = setTimeout(() => {
      setWalletAddr(genAddr());
      setPhase('trade');
    }, 1800);
    timeoutsRef.current.push(t);
  }, []);

  const startTrade = useCallback(() => {
    const data = genTradeData(form.commodity, form.amount, form.seller, form.buyer);
    setTradeData(data);
    setPhase('running');
    setStatuses(['loading', null, null, null]);

    const schedule = [
      [1600, ['confirmed', null, null, null]],
      [2600, ['confirmed', 'loading', null, null]],
      [4400, ['confirmed', 'confirmed', null, null]],
      [5400, ['confirmed', 'confirmed', 'loading', null]],
      [7800, ['confirmed', 'confirmed', 'confirmed', null]],
      [8800, ['confirmed', 'confirmed', 'confirmed', 'loading']],
    ];

    schedule.forEach(([delay, s]) => {
      const t = setTimeout(() => setStatuses(s), delay);
      timeoutsRef.current.push(t);
    });

    const done = setTimeout(() => {
      setStatuses(['confirmed', 'confirmed', 'confirmed', 'confirmed']);
      setPhase('done');
    }, 10800);
    timeoutsRef.current.push(done);
  }, [form]);

  const reset = useCallback(() => {
    clearTimeouts();
    setPhase('trade');
    setStatuses([null, null, null, null]);
    setTradeData(null);
  }, [clearTimeouts]);

  useEffect(() => () => clearTimeouts(), [clearTimeouts]);

  const confirmedCount = statuses.filter(s => s === 'confirmed').length;
  const progressPct = phase === 'done' ? 100 : (confirmedCount / 4) * 100;

  const stepDefs = tradeData
    ? [
        { label: '1. Smart Agreement Created', data: tradeData.step1 },
        { label: '2. Escrow Funded', data: tradeData.step2 },
        { label: '3. Shipment Documents Verified', data: tradeData.step3 },
        { label: '4. Payment Released to Seller', data: tradeData.step4 },
      ]
    : [];

  return (
    <section ref={demoRef} className="py-14 sm:py-28" style={{ backgroundColor: C.dark }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>Interactive Demo</span>
        </div>
        <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          See It In Action
        </h2>
        <p className="font-body text-lg mb-8 sm:mb-12" style={{ color: C.textMuted }}>
          Simulate a real blockchain trade finance transaction — step by step.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Terminal panel ── */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: C.darkMid, border: `1px solid ${C.border}` }}
            >
              {/* Terminal chrome */}
              <div
                className="flex items-center gap-2 px-5 py-3.5 border-b"
                style={{ borderColor: C.border }}
              >
                <span className="w-3 h-3 rounded-full bg-red-500 opacity-70" />
                <span className="w-3 h-3 rounded-full bg-yellow-500 opacity-70" />
                <span className="w-3 h-3 rounded-full bg-green-500 opacity-70" />
                <span className="ml-3 font-mono text-xs" style={{ color: C.textSub }}>
                  trade3.io — blockchain terminal
                </span>
              </div>

              <div className="p-4 sm:p-6 min-h-[260px] sm:min-h-96">
                {/* ── IDLE ── */}
                {phase === 'idle' && (
                  <div className="flex flex-col items-center justify-center h-52 sm:h-64 gap-5 text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(247,88,53,0.1)', border: `1px solid rgba(247,88,53,0.25)` }}
                    >
                      <svg className="w-8 h-8" fill="none" stroke={C.orange} strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.328l5.603 3.113z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-white mb-1">Ready to simulate a trade</p>
                      <p className="font-body text-sm" style={{ color: C.textMuted }}>Connect your wallet to begin</p>
                    </div>
                    <button
                      onClick={connectWallet}
                      className="flex items-center gap-2 font-body font-semibold text-sm px-6 py-3 rounded-xl text-white transition-all duration-200"
                      style={{ backgroundColor: C.orange }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.orangeLight; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.orange; }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7H5a2 2 0 010-4h14v4M21 12v5H5a2 2 0 010 4h14v-4M21 12H3" />
                      </svg>
                      Connect Wallet
                    </button>
                  </div>
                )}

                {/* ── CONNECTING ── */}
                {phase === 'connecting' && (
                  <div className="flex flex-col items-center justify-center h-52 sm:h-64 gap-5 text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(247,88,53,0.1)', border: `1px solid rgba(247,88,53,0.35)` }}
                    >
                      <svg className="animate-spin w-8 h-8" fill="none" stroke={C.orange} strokeWidth={2} viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.2" strokeWidth="4" />
                        <path d="M12 3a9 9 0 019 9" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-display font-semibold text-white mb-1">Connecting Wallet…</p>
                      <p className="font-mono text-xs animate-pulse" style={{ color: C.textMuted }}>Awaiting signature…</p>
                    </div>
                  </div>
                )}

                {/* ── TRADE FORM ── */}
                {phase === 'trade' && (
                  <div>
                    {/* Wallet badge */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-6 font-mono text-xs"
                      style={{ backgroundColor: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.2)' }}
                    >
                      <span style={{ color: C.green }}>●</span>
                      <span style={{ color: C.green }}>Wallet: {trunc(walletAddr)}</span>
                      <span className="ml-auto" style={{ color: C.green }}>Connected</span>
                    </div>

                    <h3 className="font-display font-bold text-white mb-5">Configure Trade</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                      {[
                        {
                          label: 'Commodity',
                          key: 'commodity',
                          options: COMMODITIES.map(c => ({ value: c, label: c })),
                        },
                        {
                          label: 'Trade Value (USD)',
                          key: 'amount',
                          options: AMOUNTS.map(v => ({ value: v, label: `$${fmtNum(v)}` })),
                        },
                        {
                          label: 'Seller Country',
                          key: 'seller',
                          options: COUNTRIES.map(c => ({ value: c, label: c })),
                        },
                        {
                          label: 'Buyer Country',
                          key: 'buyer',
                          options: COUNTRIES.filter(c => c !== form.seller).map(c => ({ value: c, label: c })),
                        },
                      ].map(field => (
                        <div key={field.key}>
                          <label
                            className="block font-body text-xs font-medium mb-1.5"
                            style={{ color: C.textMuted }}
                          >
                            {field.label}
                          </label>
                          <select
                            className="w-full px-3 py-2.5 rounded-lg font-body text-sm text-white"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}` }}
                            value={form[field.key]}
                            onChange={e => {
                              const val = field.key === 'amount' ? Number(e.target.value) : e.target.value;
                              setForm(f => ({ ...f, [field.key]: val }));
                            }}
                          >
                            {field.options.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Summary */}
                    <div
                      className="rounded-lg p-4 mb-5 font-mono text-xs"
                      style={{ backgroundColor: 'rgba(247,88,53,0.06)', border: `1px solid rgba(247,88,53,0.15)` }}
                    >
                      <span style={{ color: C.textSub }}>Trade Summary: </span>
                      <span style={{ color: C.orange }}>
                        {form.commodity} | ${fmtNum(form.amount)} USDC | {form.seller} → {form.buyer}
                      </span>
                      <br />
                      <span style={{ color: C.textSub }}>
                        Protocol fee: ${fmtNum(Math.round(form.amount * 0.0025))} (0.25%)
                      </span>
                    </div>

                    <button
                      onClick={startTrade}
                      className="w-full py-3.5 rounded-xl font-display font-bold text-base text-white transition-all duration-200"
                      style={{ backgroundColor: C.orange }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.orangeLight; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.orange; }}
                    >
                      Initialize Blockchain Trade →
                    </button>
                  </div>
                )}

                {/* ── RUNNING / DONE ── */}
                {(phase === 'running' || phase === 'done') && tradeData && (
                  <div className="space-y-3">
                    {/* Trade header */}
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="font-display font-bold text-white">{form.commodity} Trade</p>
                        <p className="font-body text-xs" style={{ color: C.textMuted }}>
                          {form.seller} → {form.buyer} · ${fmtNum(form.amount)} USDC
                        </p>
                      </div>
                      {phase === 'done' && (
                        <span
                          className="font-body text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap"
                          style={{ backgroundColor: 'rgba(62,207,142,0.15)', color: C.green }}
                        >
                          ✓ Complete
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div
                      className="w-full h-1 rounded-full mb-4 overflow-hidden"
                      style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
                    >
                      <div
                        className="h-1 rounded-full transition-all duration-700"
                        style={{ backgroundColor: C.orange, width: `${progressPct}%` }}
                      />
                    </div>

                    {/* Step cards */}
                    {stepDefs.map((s, i) => (
                      <TxCard key={i} label={s.label} data={s.data} status={statuses[i]} />
                    ))}

                    {/* Done state */}
                    {phase === 'done' && (
                      <div className="pt-3 text-center">
                        <div className="font-display font-bold text-2xl mb-1" style={{ color: C.green }}>
                          Trade Complete ✓
                        </div>
                        <div className="font-body text-sm mb-4" style={{ color: C.textMuted }}>
                          ${fmtNum(form.amount)} USDC auto-released to seller
                        </div>
                        <button
                          onClick={reset}
                          className="font-body text-sm font-semibold px-5 py-2.5 rounded-lg transition-all"
                          style={{ border: `1px solid rgba(247,88,53,0.3)`, color: C.orange, backgroundColor: 'transparent' }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(247,88,53,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          Start New Trade
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right: Live network feed ── */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl overflow-hidden h-full flex flex-col"
              style={{ backgroundColor: C.darkMid, border: `1px solid ${C.border}` }}
            >
              <div
                className="px-5 py-3.5 border-b flex items-center gap-2"
                style={{ borderColor: C.border }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-body text-sm font-semibold text-white">Live Network Activity</span>
              </div>

              <div className="p-3 space-y-2 overflow-y-auto flex-1" style={{ maxHeight: '520px' }}>
                {liveFeed.map(tx => (
                  <div
                    key={tx.id}
                    className="flex items-start gap-3 p-3 rounded-xl transition-all"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                      style={{ backgroundColor: 'rgba(247,88,53,0.12)' }}
                    >
                      {tx.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="font-body text-xs font-semibold text-white truncate">{tx.type}</span>
                        <span className="font-body text-xs flex-shrink-0" style={{ color: C.textSub }}>{tx.ago}</span>
                      </div>
                      <div className="font-mono text-xs truncate mb-0.5" style={{ color: C.textSub }}>
                        {trunc(tx.tx)}
                      </div>
                      <div className="font-body text-xs font-bold" style={{ color: C.orange }}>
                        {tx.amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Section ────────────────────────────────────────────────────────────
function StatsSection() {
  const stats = [
    { value: '$2.5T', label: 'Annual trade finance gap', sub: 'ADB 2024 Survey' },
    { value: '0.25%', label: 'Protocol fee', sub: 'vs 3–5% traditional' },
    { value: '24 hrs', label: 'Settlement time', sub: 'vs 60+ days' },
    { value: '$5T+', label: 'Total addressable market', sub: 'Annual trade volume' },
  ];

  return (
    <section className="py-12 sm:py-24" style={{ backgroundColor: C.violet }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12 text-center">
          {stats.map(s => (
            <div key={s.value}>
              <div
                className="font-display font-extrabold text-white mb-1"
                style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)' }}
              >
                {s.value}
              </div>
              <div className="font-body text-sm text-white opacity-80 mb-0.5">{s.label}</div>
              <div className="font-body text-xs text-white opacity-50">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Financing Vault Section ─────────────────────────────────────────────────
function FinancingSection() {
  const segments = [
    {
      icon: '🏭',
      title: 'Trade',
      desc: 'Initial focus on Asia & Middle East commodities with standardised, digitised trade transactions settled in secure escrow on public blockchain.',
    },
    {
      icon: '🏦',
      title: 'Lenders',
      desc: 'Private credit market access through financing vaults — earn yield on low-risk, high-return trade assets previously unavailable to web3 investors.',
    },
    {
      icon: '🌐',
      title: 'Applications',
      desc: 'Expandable escrow infrastructure for real estate, supply chain, and other high-value transactions requiring trustless settlement.',
    },
  ];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.darkLight }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>Market segments</span>
        </div>
        <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Built for Every Participant
        </h2>
        <p className="font-body text-lg mb-10 sm:mb-16" style={{ color: C.textMuted, maxWidth: '520px' }}>
          Trade3 creates value for sellers, buyers, and lenders simultaneously.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {segments.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl p-6 sm:p-8 transition-all duration-200 hover:-translate-y-1"
              style={{ backgroundColor: C.darkMid, border: `1px solid ${C.border}` }}
            >
              <div className="text-3xl mb-4">{s.icon}</div>
              <div className="font-body text-xs font-bold mb-2" style={{ color: C.orange }}>
                Target {i + 1}
              </div>
              <h3 className="font-display font-bold text-xl text-white mb-3">{s.title}</h3>
              <p className="font-body text-sm leading-relaxed" style={{ color: C.textMuted }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SME Dashboard ────────────────────────────────────────────────────────────
function SMEDashboard() {
  const [tab, setTab] = useState('overview');

  const settled  = MOCK_TRADES.filter(t => t.status === 'Settled');
  const active   = MOCK_TRADES.filter(t => t.status === 'Active');
  const totalVol   = MOCK_TRADES.reduce((s, t) => s + t.amount, 0);
  const totalFees  = MOCK_TRADES.reduce((s, t) => s + t.fee, 0);
  const totalSaved = settled.reduce((s, t) => s + (t.saved || 0), 0);
  const maxVol = Math.max(...MONTHLY_VOL.map(d => d.vol));

  const ss = (status) => status === 'Settled'
    ? { bg: 'rgba(62,207,142,0.12)', color: C.green,   icon: '✓' }
    : { bg: 'rgba(247,88,53,0.12)',  color: C.orange,  icon: '◐' };

  const TABS = [['overview','Overview'],['transactions','Transactions'],['analytics','Analytics']];

  return (
    <section className="py-14 sm:py-28" style={{ backgroundColor: C.darkMid }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.orange }} />
          <span className="font-body text-sm" style={{ color: C.textMuted }}>SME Portal</span>
        </div>
        <h2 className="font-display font-bold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
          Your Trade Finance Dashboard
        </h2>
        <p className="font-body text-lg mb-8 sm:mb-10" style={{ color: C.textMuted }}>
          Full visibility into every transaction — past, present, and pending.
        </p>

        {/* Tab bar */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl w-fit" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}` }}>
          {TABS.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="px-4 sm:px-5 py-2 rounded-lg font-body font-semibold text-sm transition-all duration-200"
              style={{ backgroundColor: tab === id ? C.orange : 'transparent', color: tab === id ? C.white : C.textMuted }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div>
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Volume',   value: `$${(totalVol/1e6).toFixed(1)}M`, sub: `${MOCK_TRADES.length} trades`,  color: C.orange },
                { label: 'Fees Saved',     value: `$${fmtNum(totalSaved)}`,          sub: 'vs 3–5% banks',                 color: C.green  },
                { label: 'Active Trades',  value: active.length,                     sub: 'In escrow now',                 color: C.violetLight },
                { label: 'Avg Settlement', value: '21.5h',                           sub: 'vs 60+ day avg',                color: C.orange },
              ].map(k => (
                <div key={k.label} className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}>
                  <div className="font-display font-extrabold text-2xl mb-1" style={{ color: k.color }}>{k.value}</div>
                  <div className="font-body text-xs font-semibold text-white mb-0.5">{k.label}</div>
                  <div className="font-body text-xs" style={{ color: C.textSub }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Recent trades list */}
            <div className="rounded-2xl overflow-hidden mb-4" style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}>
              <div className="px-5 py-3.5 border-b flex items-center justify-between" style={{ borderColor: C.border }}>
                <span className="font-display font-bold text-white">Recent Transactions</span>
                <button onClick={() => setTab('transactions')} className="font-body text-xs font-semibold" style={{ color: C.orange }}>
                  View all →
                </button>
              </div>
              {MOCK_TRADES.slice(0, 5).map((t, i) => {
                const st = ss(t.status);
                return (
                  <div
                    key={t.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                    style={{ borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-body text-sm font-semibold text-white">{t.commodity}</span>
                        <span className="font-mono text-xs" style={{ color: C.textSub }}>{t.id}</span>
                      </div>
                      <div className="font-body text-xs" style={{ color: C.textSub }}>{t.seller} → {t.buyer} · {t.date}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-body text-sm font-bold mb-1" style={{ color: C.orange }}>${fmtNum(t.amount)}</div>
                      <span className="font-body text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>
                        {st.icon} {t.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active trade trackers */}
            {active.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {active.map(t => (
                  <div key={t.id} className="rounded-xl p-4" style={{ backgroundColor: 'rgba(247,88,53,0.06)', border: `1px solid rgba(247,88,53,0.25)` }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-xs font-bold" style={{ color: C.orange }}>◐ {t.id}</span>
                      <span className="font-body text-xs animate-pulse" style={{ color: C.orange }}>In escrow</span>
                    </div>
                    <div className="font-display font-bold text-white mb-0.5">{t.commodity}</div>
                    <div className="font-body text-xs mb-3" style={{ color: C.textMuted }}>{t.seller} → {t.buyer} · {t.date}</div>
                    <div className="w-full h-1 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-1 rounded-full animate-pulse" style={{ backgroundColor: C.orange, width: '45%' }} />
                    </div>
                    <div className="flex justify-between">
                      <span className="font-body text-xs" style={{ color: C.textSub }}>Document verification in progress</span>
                      <span className="font-body text-xs font-bold text-white">${fmtNum(t.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {tab === 'transactions' && (
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: C.darkLight, borderBottom: `1px solid ${C.border}` }}>
                    {['ID', 'Commodity', 'Route', 'Amount', 'Fee (0.25%)', 'Saved vs Banks', 'Settlement', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-body text-xs font-semibold" style={{ color: C.textSub }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRADES.map((t, i) => {
                    const st = ss(t.status);
                    return (
                      <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? C.darkLight : 'rgba(22,18,64,0.6)', borderBottom: `1px solid ${C.border}` }}>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: C.textMuted }}>{t.id}</td>
                        <td className="px-4 py-3 font-body text-sm text-white font-semibold">{t.commodity}</td>
                        <td className="px-4 py-3 font-body text-xs" style={{ color: C.textMuted }}>{t.seller} → {t.buyer}</td>
                        <td className="px-4 py-3 font-body text-sm font-bold" style={{ color: C.orange }}>${fmtNum(t.amount)}</td>
                        <td className="px-4 py-3 font-body text-xs text-white">${fmtNum(t.fee)}</td>
                        <td className="px-4 py-3 font-body text-xs font-bold" style={{ color: C.green }}>{t.saved ? `+$${fmtNum(t.saved)}` : '—'}</td>
                        <td className="px-4 py-3 font-body text-xs text-white">{t.settlement}</td>
                        <td className="px-4 py-3">
                          <span className="font-body text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: st.bg, color: st.color }}>
                            {st.icon} {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden divide-y" style={{ borderColor: C.border }}>
              {MOCK_TRADES.map(t => {
                const st = ss(t.status);
                return (
                  <div key={t.id} className="p-4" style={{ backgroundColor: C.darkLight }}>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <span className="font-body font-bold text-white">{t.commodity}</span>
                        <span className="font-mono text-xs ml-2" style={{ color: C.textSub }}>{t.id}</span>
                      </div>
                      <span className="font-body text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: st.bg, color: st.color }}>
                        {st.icon} {t.status}
                      </span>
                    </div>
                    <div className="font-body text-xs mb-2" style={{ color: C.textSub }}>{t.seller} → {t.buyer} · {t.date}</div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-body font-bold" style={{ color: C.orange }}>${fmtNum(t.amount)}</span>
                      {t.saved && <span className="font-body text-xs font-bold" style={{ color: C.green }}>+${fmtNum(t.saved)} saved</span>}
                      <span className="font-body text-xs" style={{ color: C.textMuted }}>
                        {t.settlement !== '—' ? `⚡ ${t.settlement}` : '◐ Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div className="space-y-6">
            {/* Volume bar chart */}
            <div className="rounded-2xl p-6 sm:p-8" style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}>
              <div className="flex items-start justify-between mb-6 gap-4">
                <div>
                  <h3 className="font-display font-bold text-white mb-1">Monthly Trade Volume</h3>
                  <p className="font-body text-xs" style={{ color: C.textSub }}>Aug 2025 – Jan 2026</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display font-bold text-2xl" style={{ color: C.orange }}>$26.6M</div>
                  <div className="font-body text-xs font-bold" style={{ color: C.green }}>↑ 324% YoY</div>
                </div>
              </div>
              <div className="flex items-end gap-2 sm:gap-3 h-40">
                {MONTHLY_VOL.map((d, i) => {
                  const isLast = i === MONTHLY_VOL.length - 1;
                  const barH = Math.max((d.vol / maxVol) * 128, 4);
                  return (
                    <div key={d.month} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="font-body text-xs font-bold" style={{ color: C.orange, minHeight: '16px' }}>
                        {isLast ? `$${d.vol}M` : ''}
                      </span>
                      <div
                        className="w-full rounded-t-lg"
                        style={{
                          height: `${barH}px`,
                          background: isLast
                            ? `linear-gradient(180deg, ${C.orange}, ${C.violetLight})`
                            : `linear-gradient(180deg, ${C.violet}, rgba(59,18,141,0.35))`,
                        }}
                      />
                      <span className="font-body text-xs" style={{ color: C.textSub }}>{d.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fee savings breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Trade3 Fees Paid',   value: `$${fmtNum(totalFees)}`,                             sub: '0.25% on-chain rate',                                       color: C.orange },
                { label: 'Traditional Est.',   value: `$${fmtNum(Math.round(totalSaved + totalFees))}`,    sub: 'Estimated at 3% average',                                   color: C.textMuted },
                { label: 'Net Savings',        value: `$${fmtNum(totalSaved)}`,                             sub: `${Math.round((totalSaved/(totalSaved+totalFees))*100)}% cost reduction`, color: C.green },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}>
                  <div className="font-display font-extrabold text-2xl mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-body text-sm font-semibold text-white mb-0.5">{s.label}</div>
                  <div className="font-body text-xs" style={{ color: C.textSub }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Commodity breakdown */}
            <div className="rounded-2xl p-6" style={{ backgroundColor: C.darkLight, border: `1px solid ${C.border}` }}>
              <h3 className="font-display font-bold text-white mb-5">Volume by Commodity</h3>
              <div className="space-y-3.5">
                {[
                  { name: 'LNG',        pct: 36 },
                  { name: 'Copper Ore', pct: 22 },
                  { name: 'Crude Oil',  pct: 18 },
                  { name: 'Iron Ore',   pct:  9 },
                  { name: 'Others',     pct: 15 },
                ].map(item => (
                  <div key={item.name}>
                    <div className="flex justify-between mb-1.5">
                      <span className="font-body text-sm text-white">{item.name}</span>
                      <span className="font-body text-sm font-bold" style={{ color: C.orange }}>{item.pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
                      <div className="h-1.5 rounded-full" style={{ backgroundColor: C.orange, width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Footer / CTA ─────────────────────────────────────────────────────────────
function Footer({ onTryDemo }) {
  return (
    <footer style={{ backgroundColor: C.darkMid }}>
      {/* CTA block */}
      <div className="py-14 sm:py-28 text-center px-4">
        <div className="max-w-xl mx-auto">
          <h2 className="font-display font-extrabold text-white mb-4" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)' }}>
            Ready to Trade Smarter?
          </h2>
          <p className="font-body text-lg mb-10" style={{ color: C.textMuted }}>
            Join the future of global trade finance. Powered by blockchain, built for the world.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onTryDemo}
              className="font-display font-bold text-lg px-8 py-4 rounded-xl text-white transition-all duration-200"
              style={{ backgroundColor: C.orange }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = C.orangeLight;
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(247,88,53,0.35)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = C.orange;
                e.currentTarget.style.boxShadow = '';
                e.currentTarget.style.transform = '';
              }}
            >
              Try Live Demo
            </button>
            <a
              href="mailto:contact@trade3.io"
              className="font-display font-semibold text-lg px-8 py-4 rounded-xl text-white text-center transition-all duration-200"
              style={{ border: `2px solid ${C.border}` }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
            >
              contact@trade3.io
            </a>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t py-6 px-4 sm:px-6 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderColor: C.border }}
      >
        <div className="flex items-center gap-1">
          <span className="font-display font-bold text-xl text-white">trade</span>
          <span className="font-display font-bold text-xl" style={{ color: C.orange }}>3</span>
        </div>
        <div className="font-body text-xs text-center" style={{ color: C.textSub }}>
          © 2025 XTRAA Ltd. All Rights Reserved.
          <span className="mx-2 opacity-40">·</span>
          <a href="mailto:contact@trade3.io" style={{ color: C.orange }} className="hover:underline">
            contact@trade3.io
          </a>
          <span className="mx-2 opacity-40">·</span>
          <span>Demo for Consensus HK 2026</span>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [blockHeight, setBlockHeight] = useState(19847392);
  const demoRef = useRef(null);

  // Simulate Ethereum block production (~12s per block)
  useEffect(() => {
    const iv = setInterval(() => {
      setBlockHeight(h => h + 1);
    }, 12000);
    return () => clearInterval(iv);
  }, []);

  const scrollToDemo = useCallback(() => {
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <main>
      <Nav blockHeight={blockHeight} onTryDemo={scrollToDemo} />
      <Hero onTryDemo={scrollToDemo} />
      <ProblemSection />
      <ADBPrioritiesSection />
      <HowItWorks />
      <TokenizedBoESection />
      <FinancingSection />
      <SMEDashboard />
      <LiveDemo demoRef={demoRef} />
      <StatsSection />
      <Footer onTryDemo={scrollToDemo} />
    </main>
  );
}
