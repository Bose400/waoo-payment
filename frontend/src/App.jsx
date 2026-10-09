import { useEffect, useMemo, useState } from 'react';

const API_URL = 'http://localhost:5000/api';
const APP_NAME = 'WAOO PAY';
const APP_TAGLINE = 'Pay Smarter. Live Better.';
const VISION_TEXT = 'To become a trusted digital financial platform connecting individuals and businesses to simple, inclusive, and innovative financial services across Africa.';
const MISSION_TEXT = 'To simplify financial transactions and expand access to affordable digital financial services, particularly for underserved youths, entrepreneurs, artisans, SMEs, and informal businesses.';
const CORE_VALUES = ['Simplicity', 'Security', 'Affordability', 'Innovation', 'Inclusion', 'Trust'];
const SERVICE_FEATURES = [
  { title: 'Digital payments', description: 'Fast, secure, and seamless payments for everyday life and business.' },
  { title: 'Money transfers', description: 'Send money across borders and communities with confidence and speed.' },
  { title: 'Merchant tools', description: 'Support SMEs with collection, payment, and business-ready finance tools.' },
  { title: 'Savings & growth', description: 'Track spending, manage cash flow, and build better financial habits.' },
];

const MARKET_PILLARS = [
  { title: 'Spend smarter', value: 'Cashless living', note: 'Pay bills, shop, and recharge instantly from one wallet.' },
  { title: 'Send faster', value: 'Zero friction', note: 'Move funds to family, vendors, and teams in a few taps.' },
  { title: 'Grow stronger', value: 'Smarter insights', note: 'Use AI-powered tracking and wallet analytics to plan better.' },
];

const BENEFITS = [
  { label: 'Instant settle', value: 'Under 2 mins' },
  { label: 'Card lock', value: '24/7 protection' },
  { label: 'Smart insights', value: 'Daily cash flow' },
  { label: 'Global reach', value: '50+ markets' },
];

const PRICING_PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Built for everyday users who want a simple, secure wallet for saving, paying, and transferring with ease.',
    features: ['Personal wallet', 'Instant transfers', 'Virtual card access'],
    highlight: false,
  },
  {
    name: 'Business',
    price: '₦12,500',
    description: 'Designed for SMEs, traders, and growing teams that need speed, visibility, and smarter payment control.',
    features: ['Business dashboard', 'Bulk payouts', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'A tailored solution for larger organizations that need advanced controls, integrations, and scalable infrastructure.',
    features: ['Dedicated onboarding', 'API access', 'Advanced compliance tools'],
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    quote: 'WAOO PAY made our payouts faster and much easier to track. The experience feels premium and trustworthy.',
    author: 'Ada Okafor',
    role: 'Operations Lead',
  },
  {
    quote: 'I moved from regular banking friction to a wallet that helps me save, pay, and plan better in one place.',
    author: 'Michael Bello',
    role: 'Freelance Designer',
  },
  {
    quote: 'Our little business finally has a clean payment flow and a platform that understands local realities.',
    author: 'Chinelo Adebayo',
    role: 'Retail Founder',
  },
];

const PLATFORM_POINTS = [
  { title: 'Built for speed', detail: 'Pay in seconds, settle faster, and keep your operations moving.' },
  { title: 'Built for trust', detail: 'Bank-grade security, simple controls, and safer daily financial habits.' },
  { title: 'Built for growth', detail: 'Track cash flow, automate decisions, and unlock better business momentum.' },
];

const QUICK_BILL_AMOUNTS = ['500', '1000', '2000', '5000', '10000'];
const UTILITY_PROVIDERS = {
  MTN: { color: '#facc15', initials: 'M' },
  Airtel: { color: '#ef4444', initials: 'A' },
  Glo: { color: '#22c55e', initials: 'G' },
  '9mobile': { color: '#f97316', initials: '9' },
  DSTV: { color: '#3b82f6', initials: 'D' },
  'GOtv': { color: '#8b5cf6', initials: 'G' },
  StarTimes: { color: '#10b981', initials: 'S' },
  PHCN: { color: '#f59e0b', initials: 'P' },
};

const formatMoney = (value) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

function App() {
  const [token, setToken] = useState(localStorage.getItem('paymeny_token') || '');
  const [user, setUser] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [adminSummary, setAdminSummary] = useState(null);
  const [adminKycQueue, setAdminKycQueue] = useState([]);
  const [kyc, setKyc] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({
    name: '',
    email: 'jane@paymeny.com',
    password: 'password123',
  });
  const [transfer, setTransfer] = useState({ recipient: '', amount: '', note: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '50000', email: 'jane@paymeny.com', channel: 'card', note: 'School fees' });
  const [paymentResult, setPaymentResult] = useState(null);
  const [utilityForm, setUtilityForm] = useState({
    category: 'airtime',
    provider: 'MTN',
    phone: '08031234567',
    amount: '2000',
    plan: 'Daily 1GB',
  });
  const [cardForm, setCardForm] = useState({ brand: 'Visa', last4: '4567', type: 'Virtual', expiry: '09/29', name: 'Jane Doe' });
  const [kycForm, setKycForm] = useState({ fullName: 'Jane Doe', bvn: '22123456789', nin: '12345678901', documentType: 'passport' });
  const [message, setMessage] = useState('');

  const isAuthenticated = Boolean(token);

  const loadData = async (authToken) => {
    try {
      const [meRes, dashboardRes, transactionsRes, cardsRes, kycRes] = await Promise.all([
        fetch(`${API_URL}/me`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/cards`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/kyc`, { headers: { Authorization: `Bearer ${authToken}` } }),
      ]);

      const meData = await meRes.json();
      if (meData.user) setUser(meData.user);

      const dashboardData = await dashboardRes.json();
      if (dashboardData.balance !== undefined) setDashboard(dashboardData);

      const transactionsData = await transactionsRes.json();
      setTransactions(transactionsData.transactions || []);

      const cardsData = await cardsRes.json();
      setCards(cardsData.cards || []);

      const kycData = await kycRes.json();
      setKyc(kycData.kyc || null);

      if ((meData.user?.role || 'customer') === 'admin') {
        const [adminRes, adminKycRes] = await Promise.all([
          fetch(`${API_URL}/admin/summary`, { headers: { Authorization: `Bearer ${authToken}` } }),
          fetch(`${API_URL}/admin/kyc`, { headers: { Authorization: `Bearer ${authToken}` } }),
        ]);

        const adminData = await adminRes.json();
        const adminKycData = await adminKycRes.json();
        setAdminSummary(adminData);
        setAdminKycQueue(adminKycData.kycQueue || []);
      }
    } catch (error) {
      console.error(error);
      setToken('');
      localStorage.removeItem('paymeny_token');
    }
  };

  useEffect(() => {
    if (!token) return;

    localStorage.setItem('paymeny_token', token);
    loadData(token);
  }, [token]);

  const savingsRate = useMemo(() => dashboard?.savingsRate ?? 0, [dashboard]);

  const submitAuth = async (event) => {
    event.preventDefault();
    setMessage('');

    const endpoint = authMode === 'login' ? '/login' : '/register';
    const payload = authMode === 'login'
      ? { email: form.email, password: form.password }
      : { name: form.name, email: form.email, password: form.password };

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'Authentication failed.');
      return;
    }

    setToken(data.token);
    setUser(data.user);
    setMessage(authMode === 'login' ? 'Welcome back!' : 'Account created successfully!');
    setForm({ name: '', email: '', password: '' });
  };

  const handleTransfer = async (event) => {
    event.preventDefault();
    setMessage('');

    const response = await fetch(`${API_URL}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: transfer.recipient,
        amount: Number(transfer.amount),
        note: transfer.note,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'Transfer failed.');
      return;
    }

    setTransfer({ recipient: '', amount: '', note: '' });
    setMessage(data.message);
    setDashboard((current) => ({
      ...current,
      balance: data.balance,
    }));
    setTransactions((current) => [
      { ...data.transaction, createdAt: data.transaction.createdAt },
      ...current,
    ]);
  };

  const handleUtilityPurchase = (event) => {
    event.preventDefault();
    setMessage('');

    const isSubscription = utilityForm.category === 'subscription';
    const serviceLabel = isSubscription ? `${utilityForm.provider} subscription` : `${utilityForm.provider} airtime`;
    const purchaseNote = isSubscription ? `Plan: ${utilityForm.plan}` : 'Mobile recharge';

    setTransactions((current) => [
      {
        id: Date.now(),
        title: serviceLabel,
        note: `${purchaseNote} • ${utilityForm.phone}`,
        amount: Number(utilityForm.amount),
        direction: 'out',
        createdAt: new Date().toISOString(),
        counterparty: utilityForm.provider,
      },
      ...current,
    ]);

    setMessage(`${serviceLabel} for ${utilityForm.phone} is being processed.`);
  };

  const handleCardCreate = async (event) => {
    event.preventDefault();
    setMessage('');

    const response = await fetch(`${API_URL}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cardForm),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'Card creation failed.');
      return;
    }

    setCards((current) => [data.card, ...current]);
    setMessage(data.message);
    setCardForm({ brand: 'Visa', last4: '', type: 'Virtual', expiry: '09/29', name: user?.name || 'Jane Doe' });
  };

  const handleKycSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    const response = await fetch(`${API_URL}/kyc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fullName: kycForm.fullName,
        bvn: kycForm.bvn,
        nin: kycForm.nin,
        documentType: kycForm.documentType,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'KYC submission failed.');
      return;
    }

    setKyc(data.kyc);
    setMessage(data.message);
    if (dashboard) {
      setDashboard({ ...dashboard, kycStatus: 'pending' });
    }
  };

  const handleGatewayPayment = async (event) => {
    event.preventDefault();
    setMessage('');

    const response = await fetch(`${API_URL}/payments/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        amount: Number(paymentForm.amount),
        email: paymentForm.email || user?.email,
        channel: paymentForm.channel,
        note: paymentForm.note,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'Payment failed to initialize.');
      return;
    }

    setPaymentResult(data);
    setMessage(data.message);
  };

  const handleKycDecision = async (kycId, decision) => {
    const response = await fetch(`${API_URL}/admin/kyc/${kycId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        status: decision,
        reviewNotes: decision === 'verified' ? 'Identity verified and approved.' : 'Document review rejected. Please resubmit or update KYC details.',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.message || 'KYC update failed.');
      return;
    }

    const refreshed = await fetch(`${API_URL}/admin/kyc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const refreshedData = await refreshed.json();
    setAdminKycQueue(refreshedData.kycQueue || []);
    setMessage(data.message);
  };

  const logout = () => {
    localStorage.removeItem('paymeny_token');
    setToken('');
    setUser(null);
    setDashboard(null);
    setTransactions([]);
    setCards([]);
    setKyc(null);
    setAdminSummary(null);
    setMessage('You have been logged out.');
  };

  if (!isAuthenticated) {
    return (
      <div className="website-shell">
        <header className="site-header">
          <div className="brand-row">
            <img src="/images/logo.png" alt="WAOO PAY logo" className="app-logo app-logo-small" />
          </div>

          <nav className="site-nav" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#services">Services</a>
            <a href="#mission">Mission</a>
            <a href="#values">Values</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="site-actions">
            <button className="ghost-btn" type="button" onClick={() => setAuthMode('login')}>Login</button>
            <button className="primary-btn" type="button" onClick={() => setAuthMode('register')}>Create account</button>
          </div>
        </header>

        <main className="site-main" id="home">
          <section className="hero-section">
            <div className="hero-copy">
              <p className="eyebrow">Digital finance for everyday life</p>
              <h1>{APP_TAGLINE}</h1>
              <p className="hero-text">
                WAOO PAY helps young people, traders, entrepreneurs, artisans, and businesses move money faster,
                pay smarter, and stay in control of their financial future.
              </p>

              <div className="hero-mini-badges" aria-label="WAOO PAY features">
                <span>Instant transfer</span>
                <span>Secure wallet</span>
                <span>Business-ready</span>
              </div>

              <div className="live-promo-panel" aria-label="WAOO PAY bill payment highlight">
                <span className="promo-live">Live</span>
                <div className="promo-copy">
                  <strong>Buy airtime, data, and utility bills in seconds.</strong>
                  <span>MTN • Airtel • Glo • 9mobile • DSTV • GOtv • PHCN</span>
                </div>
              </div>

              <div className="hero-portrait-showcase" aria-label="WAOO PAY wallet mockup">
                <div className="mobile-wallet-shell hero-wallet-shell">
                  <div className="wallet-header-row">
                    <span>WAOO WALLET</span>
                    <span>•••</span>
                  </div>
                  <div className="wallet-balance-box">
                    <small>Available balance</small>
                    <strong>₦524,900</strong>
                  </div>
                  <div className="wallet-actions-row">
                    <button type="button">Send</button>
                    <button type="button">Top up</button>
                    <button type="button">Pay</button>
                  </div>
                  <div className="mini-chart" aria-hidden="true">
                    <span style={{ height: '32%' }} />
                    <span style={{ height: '55%' }} />
                    <span style={{ height: '72%' }} />
                    <span style={{ height: '48%' }} />
                    <span style={{ height: '86%' }} />
                    <span style={{ height: '100%' }} />
                  </div>
                </div>
                <div className="portrait-badge">
                  <strong>4.9/5</strong>
                  <span>Customer love</span>
                </div>
                <div className="floating-mini-wallet">
                  <span>WAOO PAY</span>
                  <strong>•••• 3812</strong>
                  <small>Tap to pay</small>
                </div>
              </div>

              <div className="hero-metric-strip" aria-label="WAOO PAY wallet insights">
                <div className="metric-chip">
                  <strong>₦524,900</strong>
                  <span>Wallet balance</span>
                </div>
                <div className="metric-chip">
                  <strong>1.2k</strong>
                  <span>Monthly transfers</span>
                </div>
                <div className="metric-chip">
                  <strong>18.4%</strong>
                  <span>Growth</span>
                </div>
              </div>

              <div className="cta-row">
                <button className="primary-btn" type="button" onClick={() => setAuthMode('register')}>Get started</button>
                <button className="ghost-btn" type="button" onClick={() => setAuthMode('login')}>Sign in</button>
              </div>

              <div className="hero-banner" aria-label="WAOO PAY dashboard preview">
                <div className="hero-banner-image-wrap">
                  <div className="mobile-wallet-shell">
                    <div className="wallet-header-row">
                      <span>WAOO WALLET</span>
                      <span>•••</span>
                    </div>
                    <div className="wallet-balance-box">
                      <small>Available balance</small>
                      <strong>₦524,900</strong>
                    </div>
                    <div className="wallet-actions-row">
                      <button type="button">Send</button>
                      <button type="button">Top up</button>
                      <button type="button">Pay</button>
                    </div>
                    <div className="mini-chart" aria-hidden="true">
                      <span style={{ height: '32%' }} />
                      <span style={{ height: '55%' }} />
                      <span style={{ height: '72%' }} />
                      <span style={{ height: '48%' }} />
                      <span style={{ height: '86%' }} />
                      <span style={{ height: '100%' }} />
                    </div>
                  </div>
                  <div className="floating-card wallet-card">
                    <span>Wallet balance</span>
                    <strong>₦524,900</strong>
                  </div>
                  <div className="floating-card growth-card">
                    <span>Growth</span>
                    <strong>+18.4%</strong>
                  </div>
                </div>
              </div>

              <div className="stats-row">
                <div>
                  <strong>1M+</strong>
                  <span>Transactions</span>
                </div>
                <div>
                  <strong>24/7</strong>
                  <span>Support</span>
                </div>
                <div>
                  <strong>99.9%</strong>
                  <span>Secure</span>
                </div>
              </div>
            </div>

            <div className="home-auth-card">
              <div className="auth-card-header">
                <div>
                  <p className="eyebrow">Secure access</p>
                  <h3>Welcome back</h3>
                </div>
                <span className="security-pill">256-bit encrypted</span>
              </div>

              <div className="switch-row">
                <button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')} type="button">Login</button>
                <button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')} type="button">Register</button>
              </div>

              <div className="feature-badges">
                {BENEFITS.slice(0, 3).map((benefit) => (
                  <span key={benefit.label} className="meta-badge">{benefit.label}</span>
                ))}
              </div>

              <form onSubmit={submitAuth} className="auth-form">
                {authMode === 'register' && (
                  <label>
                    Full name
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sarah Smith" />
                  </label>
                )}

                <label>
                  Email address
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </label>

                <label>
                  Password
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
                </label>

                <button className="primary-btn" type="submit">{authMode === 'login' ? 'Sign in securely' : 'Create account'}</button>
              </form>

              {message && <p className="message">{message}</p>}

              <div className="demo-box">
                <strong>Demo access</strong>
                <p>Email: jane@paymeny.com</p>
                <p>Password: password123</p>
                <p>Admin: admin@paymeny.com / admin123</p>
              </div>
            </div>
          </section>

          <section className="trust-bar" aria-label="WAOO PAY trust metrics">
            <div className="trust-item">
              <strong>50k+</strong>
              <span>payments cleared</span>
            </div>
            <div className="trust-item">
              <strong>2 min</strong>
              <span>average settlement</span>
            </div>
            <div className="trust-item">
              <strong>256-bit</strong>
              <span>bank-grade security</span>
            </div>
            <div className="trust-item">
              <strong>99.9%</strong>
              <span>platform uptime</span>
            </div>
          </section>

          <section className="benefits-strip" aria-label="WAOO PAY benefits">
            {BENEFITS.map((benefit) => (
              <div key={benefit.label} className="benefit-pill">
                <strong>{benefit.value}</strong>
                <span>{benefit.label}</span>
              </div>
            ))}
          </section>

          <section className="market-pillar-section" aria-label="WAOO PAY platform advantages">
            <div className="section-heading">
              <p className="eyebrow">Everything in one wallet</p>
              <h2>Financial tools designed for modern life and growing businesses.</h2>
            </div>

            <div className="market-pillar-grid">
              {MARKET_PILLARS.map((pillar) => (
                <article key={pillar.title} className="market-pillar-card">
                  <span className="pillar-kicker">{pillar.title}</span>
                  <strong>{pillar.value}</strong>
                  <p>{pillar.note}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="app-cta-band" aria-label="WAOO PAY call to action">
            <div className="cta-band-copy">
              <p className="eyebrow">Ready when you are</p>
              <h2>Simple payments. Smarter savings. Better daily control.</h2>
            </div>
            <div className="cta-band-points">
              <span>Wallet</span>
              <span>Transfers</span>
              <span>Cards</span>
              <span>Utility</span>
            </div>
            <button className="primary-btn" type="button" onClick={() => setAuthMode('register')}>Open your wallet</button>
          </section>

          <section className="feature-spotlight">
            <div className="spotlight-copy">
              <p className="eyebrow">Built for real life</p>
              <h2>Move money with confidence, whether you are paying bills, sending funds, or scaling your business.</h2>
            </div>
            <div className="spotlight-cards">
              <article className="spotlight-card primary">
                <span>Wallet</span>
                <strong>₦524,900</strong>
                <small>Available balance</small>
              </article>
              <article className="spotlight-card">
                <span>Transfers</span>
                <strong>1.2k</strong>
                <small>Completed this month</small>
              </article>
            </div>
          </section>

          <section className="feature-section" id="services">
            <div className="section-heading">
              <p className="eyebrow">Why WAOO PAY?</p>
              <h2>Built for simplicity, trust, and inclusive financial access.</h2>
            </div>

            <div className="service-grid">
              {SERVICE_FEATURES.map((service) => (
                <article key={service.title} className="service-card">
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="platform-advantage-section">
            <div className="platform-advantage-copy">
              <p className="eyebrow">Confidence built in</p>
              <h2>Smarter wallets create better financial decisions.</h2>
            </div>

            <div className="platform-point-grid">
              {PLATFORM_POINTS.map((point) => (
                <article key={point.title} className="platform-point-card">
                  <strong>{point.title}</strong>
                  <p>{point.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="pricing-section">
            <div className="section-heading">
              <p className="eyebrow">Pricing</p>
              <h2>Simple plans for people, businesses, and teams.</h2>
            </div>

            <div className="pricing-grid">
              {PRICING_PLANS.map((plan) => (
                <article key={plan.name} className={`pricing-card ${plan.highlight ? 'featured' : ''}`}>
                  <div className="pricing-topline">
                    <span className="plan-name">{plan.name}</span>
                    {plan.highlight && <span className="featured-tag">Popular</span>}
                  </div>
                  <h3>{plan.price}</h3>
                  <p>{plan.description}</p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <button className={plan.highlight ? 'primary-btn full-width' : 'ghost-btn full-width'} type="button">
                    {plan.highlight ? 'Start with business' : 'Get started'}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="trust-section">
            <div className="section-heading">
              <p className="eyebrow">Why customers trust us</p>
              <h2>Reliable tools for a more confident financial life.</h2>
            </div>

            <div className="testimonial-grid">
              {TESTIMONIALS.map((item) => (
                <article key={item.author} className="quote-card">
                  <div className="quote-mark">“</div>
                  <p>{item.quote}</p>
                  <div className="quote-author">
                    <strong>{item.author}</strong>
                    <span>{item.role}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="story-section" id="mission">
            <div className="story-block">
              <p className="eyebrow">Our Mission</p>
              <p>{MISSION_TEXT}</p>
            </div>
            <div className="story-block">
              <p className="eyebrow">Our Vision</p>
              <p>{VISION_TEXT}</p>
            </div>
          </section>

          <section className="values-section" id="values">
            <div className="section-heading">
              <p className="eyebrow">Our Core Values</p>
              <h2>Built around trust, inclusion, and innovation.</h2>
            </div>

            <div className="value-pills">
              {CORE_VALUES.map((value) => (
                <span key={value} className="value-pill">{value}</span>
              ))}
            </div>
          </section>
        </main>

        <footer className="site-footer" id="contact">
          <div>
            <img src="/images/logo.png" alt="WAOO PAY logo" className="app-logo app-logo-small" />
          </div>
          <div className="footer-branding">
            <p>WAOO PAY — PAY SMARTER.</p>
            <p>© 2026 WAOO PAY. All rights reserved.</p>
          </div>
          <div className="footer-links" aria-label="Footer legal links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Support</a>
          </div>
        </footer>
      </div>
    );
  }

  const navItems = [
    { key: 'overview', label: 'Overview' },
    { key: 'payments', label: 'Payments' },
    { key: 'cards', label: 'Cards' },
    { key: 'transfers', label: 'Transfers' },
    { key: 'kyc', label: 'KYC' },
    { key: 'admin', label: 'Admin', hidden: user?.role !== 'admin' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-header brand-header-logo-only">
          <img src="/images/logo.png" alt="WAOO PAY logo" className="app-logo app-logo-small" />
        </div>

        <div className="profile-spotlight">
          <div className="profile-avatar">{(user?.name || 'W').charAt(0).toUpperCase()}</div>
          <div>
            <strong>{user?.name || 'WAOO User'}</strong>
            <span>{user?.role || 'Customer'}</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.filter((item) => !item.hidden).map((item) => (
            <button
              key={item.key}
              className={`nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="ussd-box">
          <span>USSD</span>
          <strong>*347#</strong>
        </div>

        <button className="logout-btn" onClick={logout} type="button">Log out</button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>{user?.name || 'User'}</h1>
          </div>
          <div className="topbar-actions">
            <button className="ghost-btn" type="button">+ Add money</button>
            <button className="primary-btn" type="button">Request payout</button>
          </div>
        </header>

        <section className="dashboard-highlight">
          <div>
            <p className="eyebrow">Treasury overview</p>
            <h2>Cash flow is healthy and on track.</h2>
          </div>
          <div className="mini-metrics">
            <div>
              <span>Available</span>
              <strong>{formatMoney(dashboard?.balance || user?.wallet?.balance || 0)}</strong>
            </div>
            <div>
              <span>Settlements</span>
              <strong>87%</strong>
            </div>
          </div>
        </section>

        {activeTab === 'overview' && (
          <>
            <section className="stats-grid">
              <article className="stat-card accent">
                <span>Wallet balance</span>
                <strong>{formatMoney(dashboard?.balance || user?.wallet?.balance || 0)}</strong>
                <small>{dashboard?.accountNumber || user?.accountNumber || '---'} • Ready to spend</small>
              </article>
              <article className="stat-card">
                <span>Income</span>
                <strong>{formatMoney(dashboard?.income || 0)}</strong>
                <small>Monthly target</small>
              </article>
              <article className="stat-card">
                <span>Spending</span>
                <strong>{formatMoney(dashboard?.spending || 0)}</strong>
                <small>Last 30 days</small>
              </article>
              <article className="stat-card">
                <span>Savings rate</span>
                <strong>{Number(savingsRate).toFixed(1)}%</strong>
                <small>{dashboard?.kycStatus || user?.kycStatus || 'KYC pending'}</small>
              </article>
            </section>

            <section className="content-grid">
              <div className="panel transfer-panel">
                <div className="panel-header">
                  <h3>Send money</h3>
                </div>

                <form onSubmit={handleTransfer} className="transfer-form">
                  <label>
                    Recipient
                    <input value={transfer.recipient} onChange={(e) => setTransfer({ ...transfer, recipient: e.target.value })} placeholder="Name or account" />
                  </label>
                  <label>
                    Amount
                    <input type="number" value={transfer.amount} onChange={(e) => setTransfer({ ...transfer, amount: e.target.value })} placeholder="15000" />
                  </label>
                  <label>
                    Note
                    <input value={transfer.note} onChange={(e) => setTransfer({ ...transfer, note: e.target.value })} placeholder="School fees" />
                  </label>
                  <button className="primary-btn" type="submit">Transfer now</button>
                </form>
              </div>

              <div className="panel quick-actions">
                <div className="panel-header">
                  <h3>Quick actions</h3>
                </div>
                <div className="action-list">
                  <button type="button">Pay bills</button>
                  <button type="button">Airtime top-up</button>
                  <button type="button">Card freeze</button>
                  <button type="button">Bank transfer</button>
                </div>
              </div>
            </section>

            <section className="panel transactions-panel">
              <div className="panel-header">
                <h3>Recent activity</h3>
                <button className="ghost-btn" type="button">View all</button>
              </div>

              <div className="transactions-list">
                {transactions.length === 0 ? (
                  <p>No transactions yet.</p>
                ) : (
                  transactions.map((tx) => (
                    <div className="transaction-row" key={tx.id}>
                      <div className="tx-bullet">{tx.direction === 'in' ? '↗' : '↘'}</div>
                      <div className="tx-meta">
                        <strong>{tx.title}</strong>
                        <small>{tx.note || 'Payment'}</small>
                      </div>
                      <div className="tx-amount" data-direction={tx.direction}>
                        {tx.direction === 'in' ? '+' : '-'}{formatMoney(tx.amount)}
                      </div>
                      <span className="tx-date">{formatDate(tx.createdAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {activeTab === 'payments' && (
          <section className="panel section-panel">
            <div className="panel-header">
              <h3>Payment gateway</h3>
            </div>

            <div className="payment-hero">
              <div>
                <p className="eyebrow">Live-ready checkout</p>
                <h4>Card, bank, USSD, and wallet payment flows</h4>
              </div>
              <span className="provider-pill">{paymentResult?.provider || 'Demo mode'}</span>
            </div>

            <form className="form-box" onSubmit={handleGatewayPayment}>
              <div className="two-column-form">
                <label>
                  Amount (NGN)
                  <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                </label>
                <label>
                  Email
                  <input type="email" value={paymentForm.email} onChange={(e) => setPaymentForm({ ...paymentForm, email: e.target.value })} />
                </label>
                <label>
                  Channel
                  <select value={paymentForm.channel} onChange={(e) => setPaymentForm({ ...paymentForm, channel: e.target.value })}>
                    <option value="card">Card</option>
                    <option value="bank">Bank transfer</option>
                    <option value="ussd">USSD</option>
                    <option value="wallet">Wallet</option>
                  </select>
                </label>
                <label>
                  Note
                  <input value={paymentForm.note} onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} />
                </label>
              </div>

              <button className="primary-btn" type="submit">Initialize payment</button>
            </form>

            {paymentResult && (
              <div className="success-box">
                <div>
                  <strong>Reference:</strong> {paymentResult.reference}
                </div>
                <div>
                  <strong>Status:</strong> {paymentResult.status}
                </div>
                <div>
                  <strong>Provider:</strong> {paymentResult.provider}
                </div>
                <a href={paymentResult.authorizationUrl} target="_blank" rel="noreferrer">
                  {paymentResult.authorizationUrl?.startsWith('http') ? 'Open checkout' : 'View checkout'}
                </a>
              </div>
            )}

            <div className="panel section-panel utility-panel" style={{ marginTop: '1.5rem' }}>
              <div className="panel-header">
                <div>
                  <p className="eyebrow">Recharge & bills</p>
                  <h3>Airtime & utility purchases</h3>
                </div>
                <span className="utility-tag">Fast • secure</span>
              </div>

              <div className="utility-toggle-row">
                <button
                  type="button"
                  className={utilityForm.category === 'airtime' ? 'utility-toggle active' : 'utility-toggle'}
                  onClick={() => setUtilityForm({ ...utilityForm, category: 'airtime' })}
                >
                  Airtime
                </button>
                <button
                  type="button"
                  className={utilityForm.category === 'subscription' ? 'utility-toggle active' : 'utility-toggle'}
                  onClick={() => setUtilityForm({ ...utilityForm, category: 'subscription' })}
                >
                  Subscription
                </button>
              </div>

              <div className="utility-provider-grid">
                {(utilityForm.category === 'airtime' ? ['MTN', 'Airtel', 'Glo', '9mobile'] : ['DSTV', 'GOtv', 'StarTimes', 'PHCN']).map((provider) => {
                  const meta = UTILITY_PROVIDERS[provider];
                  return (
                    <button
                      key={provider}
                      type="button"
                      className={utilityForm.provider === provider ? 'provider-option selected' : 'provider-option'}
                      onClick={() => setUtilityForm({ ...utilityForm, provider })}
                    >
                      <span className="provider-dot" style={{ background: meta.color }}>{meta.initials}</span>
                      <span>{provider}</span>
                    </button>
                  );
                })}
              </div>

              <div className="quick-amount-grid">
                {QUICK_BILL_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={utilityForm.amount === amount ? 'quick-amount selected' : 'quick-amount'}
                    onClick={() => setUtilityForm({ ...utilityForm, amount })}
                  >
                    ₦{amount}
                  </button>
                ))}
              </div>

              <form className="form-box utility-form-box" onSubmit={handleUtilityPurchase}>
                <div className="two-column-form">
                  <label>
                    Phone / customer number
                    <input value={utilityForm.phone} onChange={(e) => setUtilityForm({ ...utilityForm, phone: e.target.value })} placeholder={utilityForm.category === 'airtime' ? '0803 123 4567' : 'Customer number / meter'} />
                  </label>

                  <label>
                    {utilityForm.category === 'subscription' ? 'Plan' : 'Amount (NGN)'}
                    {utilityForm.category === 'subscription' ? (
                      <select value={utilityForm.plan} onChange={(e) => setUtilityForm({ ...utilityForm, plan: e.target.value })}>
                        {utilityForm.provider === 'DSTV' && (
                          <>
                            <option value="DSTV Compact">DSTV Compact</option>
                            <option value="DSTV Confam">DSTV Confam</option>
                            <option value="DSTV Premium">DSTV Premium</option>
                          </>
                        )}
                        {utilityForm.provider === 'GOtv' && (
                          <>
                            <option value="GOtv Smallie">GOtv Smallie</option>
                            <option value="GOtv Jinja">GOtv Jinja</option>
                            <option value="GOtv Max">GOtv Max</option>
                          </>
                        )}
                        {utilityForm.provider === 'StarTimes' && (
                          <>
                            <option value="Nova">Nova</option>
                            <option value="Smart">Smart</option>
                            <option value="Super">Super</option>
                          </>
                        )}
                        {utilityForm.provider === 'PHCN' && (
                          <>
                            <option value="Prepaid Meter">Prepaid Meter</option>
                            <option value="Postpaid">Postpaid</option>
                            <option value="Band A">Band A</option>
                          </>
                        )}
                        {!['DSTV', 'GOtv', 'StarTimes', 'PHCN'].includes(utilityForm.provider) && (
                          <>
                            <option value="Daily 1GB">Daily 1GB</option>
                            <option value="Weekly 5GB">Weekly 5GB</option>
                            <option value="Monthly 15GB">Monthly 15GB</option>
                          </>
                        )}
                      </select>
                    ) : (
                      <input type="number" value={utilityForm.amount} onChange={(e) => setUtilityForm({ ...utilityForm, amount: e.target.value })} placeholder="2000" />
                    )}
                  </label>

                  {utilityForm.category === 'subscription' && (
                    <label>
                      Amount (NGN)
                      <input type="number" value={utilityForm.amount} onChange={(e) => setUtilityForm({ ...utilityForm, amount: e.target.value })} placeholder="5000" />
                    </label>
                  )}
                </div>

                <div className="utility-summary">
                  <span>{utilityForm.category === 'airtime' ? 'Recharge summary' : 'Subscription summary'}</span>
                  <strong>{utilityForm.provider} • ₦{utilityForm.amount || '0'}</strong>
                </div>

                <button className="primary-btn" type="submit">
                  {utilityForm.category === 'subscription' ? 'Buy subscription' : 'Buy airtime'}
                </button>
              </form>
            </div>
          </section>
        )}

        {activeTab === 'cards' && (
          <section className="panel section-panel">
            <div className="panel-header">
              <h3>Cards</h3>
            </div>

            <div className="card-grid">
              {cards.length === 0 ? (
                <p>No cards yet.</p>
              ) : (
                cards.map((card) => (
                  <article key={card.id} className="credit-card">
                    <div className="chip" />
                    <div className="card-topline">
                      <span>{card.brand}</span>
                      <span>{card.type}</span>
                    </div>
                    <strong>•••• {card.last4}</strong>
                    <div className="card-footer">
                      <small>{card.name}</small>
                      <small>{card.expiry}</small>
                    </div>
                  </article>
                ))
              )}
            </div>

            <form className="form-box" onSubmit={handleCardCreate}>
              <h4>Add a card</h4>
              <div className="two-column-form">
                <label>
                  Brand
                  <input value={cardForm.brand} onChange={(e) => setCardForm({ ...cardForm, brand: e.target.value })} />
                </label>
                <label>
                  Last 4
                  <input value={cardForm.last4} onChange={(e) => setCardForm({ ...cardForm, last4: e.target.value })} />
                </label>
                <label>
                  Type
                  <input value={cardForm.type} onChange={(e) => setCardForm({ ...cardForm, type: e.target.value })} />
                </label>
                <label>
                  Expiry
                  <input value={cardForm.expiry} onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })} />
                </label>
                <label className="full-width">
                  Card holder
                  <input value={cardForm.name} onChange={(e) => setCardForm({ ...cardForm, name: e.target.value })} />
                </label>
              </div>
              <button className="primary-btn" type="submit">Add card</button>
            </form>
          </section>
        )}

        {activeTab === 'transfers' && (
          <section className="panel section-panel">
            <div className="panel-header">
              <h3>Transfer history</h3>
            </div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <p>No transfers yet.</p>
              ) : (
                transactions.map((tx) => (
                  <div className="transaction-row" key={tx.id}>
                    <div className="tx-bullet">{tx.direction === 'in' ? '↗' : '↘'}</div>
                    <div className="tx-meta">
                      <strong>{tx.counterparty || tx.title}</strong>
                      <small>{tx.note || 'Transfer'}</small>
                    </div>
                    <div className="tx-amount" data-direction={tx.direction}>
                      {tx.direction === 'in' ? '+' : '-'}{formatMoney(tx.amount)}
                    </div>
                    <span className="tx-date">{formatDate(tx.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeTab === 'kyc' && (
          <section className="panel section-panel">
            <div className="panel-header">
              <h3>KYC</h3>
            </div>

            <form className="form-box" onSubmit={handleKycSubmit}>
              <div className="two-column-form">
                <label>
                  Full name
                  <input value={kycForm.fullName} onChange={(e) => setKycForm({ ...kycForm, fullName: e.target.value })} />
                </label>
                <label>
                  BVN
                  <input value={kycForm.bvn} onChange={(e) => setKycForm({ ...kycForm, bvn: e.target.value })} />
                </label>
                <label>
                  NIN
                  <input value={kycForm.nin} onChange={(e) => setKycForm({ ...kycForm, nin: e.target.value })} />
                </label>
                <label>
                  Document type
                  <select value={kycForm.documentType} onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="driver_license">Driver License</option>
                  </select>
                </label>
              </div>
              <button className="primary-btn" type="submit">Submit KYC</button>
            </form>

            {kyc && (
              <div className="kyc-status">
                <strong>Status:</strong> {kyc.status}
              </div>
            )}
          </section>
        )}

        {activeTab === 'admin' && user?.role === 'admin' && (
          <section className="panel section-panel">
            <div className="panel-header">
              <h3>Admin dashboard</h3>
            </div>

            {adminSummary ? (
              <div className="admin-grid">
                <div className="mini-stat">
                  <span>Total users</span>
                  <strong>{adminSummary.totals.users}</strong>
                </div>
                <div className="mini-stat">
                  <span>Wallet value</span>
                  <strong>{formatMoney(adminSummary.totals.walletValue)}</strong>
                </div>
                <div className="mini-stat">
                  <span>Transactions</span>
                  <strong>{adminSummary.totals.transactionCount}</strong>
                </div>
                <div className="mini-stat">
                  <span>Pending KYC</span>
                  <strong>{adminSummary.totals.pendingKyc}</strong>
                </div>
              </div>
            ) : (
              <p>Loading admin summary...</p>
            )}

            <div className="admin-queue">
              <h4>KYC queue</h4>
              {adminKycQueue.length === 0 ? (
                <p>No KYC submissions in the queue.</p>
              ) : (
                adminKycQueue.map((entry) => (
                  <div key={entry.id} className="kyc-review-card">
                    <div className="kyc-review-header">
                      <div>
                        <strong>{entry.fullName || entry.name}</strong>
                        <small>{entry.email}</small>
                      </div>
                      <span className={`status-badge ${entry.status}`}>{entry.status}</span>
                    </div>

                    <div className="kyc-review-meta">
                      <span>BVN: {entry.bvn}</span>
                      <span>NIN: {entry.nin}</span>
                      <span>Document: {entry.documentType}</span>
                    </div>

                    {entry.reviewNotes && <p>{entry.reviewNotes}</p>}

                    <div className="kyc-actions">
                      <button type="button" className="ghost-btn" onClick={() => handleKycDecision(entry.id, 'verified')}>Approve</button>
                      <button type="button" className="danger-btn" onClick={() => handleKycDecision(entry.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {adminSummary?.users && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>KYC</th>
                      <th>Wallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminSummary.users.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.name}</td>
                        <td>{entry.email}</td>
                        <td>{entry.role}</td>
                        <td>{entry.kycStatus}</td>
                        <td>{formatMoney(entry.walletBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {message && <p className="message banner-message">{message}</p>}
      </main>
    </div>
  );
}

export default App;
