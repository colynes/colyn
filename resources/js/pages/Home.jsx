import React, { useState } from 'react';

const NAV_LINKS = ['About', 'Products', 'Philosophy', 'Contact'];

const PRODUCTS = [
  { name: 'Premium Ribeye', desc: 'Expertly aged for exceptional tenderness and rich marbling.', icon: '🥩' },
  { name: 'Grass-Fed Chicken', desc: 'Free-range, hormone-free chicken raised on natural pastures.', icon: '🍗' },
  { name: 'Artisan Sausages', desc: 'Hand-crafted using traditional recipes with premium spice blends.', icon: '🌭' },
  { name: 'Lamb Cuts', desc: 'Fresh, locally sourced lamb selected for quality and flavor.', icon: '🐑' },
  { name: 'Pork Specialties', desc: 'Premium pork cuts cured and smoked to perfection.', icon: '🐷' },
  { name: 'Custom Orders', desc: 'Bespoke butchery for events, restaurants, and corporate clients.', icon: '📦' },
];

const VALUES = [
  { title: 'Quality First', desc: 'Every cut is carefully inspected and selected by our master butchers to ensure the highest standards.', icon: '🏆' },
  { title: 'Sustainability', desc: 'We work exclusively with local farmers who share our commitment to ethical, humane animal husbandry.', icon: '🌱' },
  { title: 'Community', desc: 'Amani means "peace" in Swahili. We invest in and support our local communities across Tanzania.', icon: '🤝' },
  { title: 'Transparency', desc: 'From farm to your table, we provide full traceability so you always know exactly where your food comes from.', icon: '🔍' },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-[#F9F5EC] font-sans">

      {/* ── Navigation ── */}
      <nav className="bg-[#3B2A1E] text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-[#CDAD7D] rounded-lg p-1 overflow-hidden flex items-center justify-center">
              <img src="/images/amani_brew_mark.png" alt="Amani Brew Logo" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <span className="text-xl font-bold">Amani Brew</span>
              <span className="text-amber-300 text-xs block leading-none">Premium Butchery</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-amber-100/80 hover:text-[#CDAD7D] transition-colors font-medium">{l}</a>
            ))}
            <a href="/login" className="ml-4 bg-[#CDAD7D] text-[#3B2A1E] px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#b59563] transition-colors">
              Admin Login
            </a>
          </div>

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white p-2">
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white mb-1" />
            <div className="w-5 h-0.5 bg-white" />
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} onClick={() => setMenuOpen(false)} className="block text-sm text-amber-100/80 hover:text-[#CDAD7D]">{l}</a>
            ))}
            <a href="/login" className="block bg-[#CDAD7D] text-[#3B2A1E] px-4 py-2 rounded-xl text-sm font-bold text-center">Admin Login</a>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #3B2A1E 0%, #5C3D2E 50%, #8C6F53 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 10% 90%, #CDAD7D 0%, transparent 60%), radial-gradient(circle at 90% 10%, #C8A97E 0%, transparent 60%)'
        }} />
        <div className="max-w-7xl mx-auto px-6 py-28 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-white text-center lg:text-left">
            <div className="inline-block bg-[#CDAD7D]/20 border border-[#CDAD7D]/30 px-4 py-1.5 rounded-full text-[#CDAD7D] text-sm font-semibold mb-6">
              Asili na Urithi
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight mb-6">
              Where <span className="text-[#CDAD7D]">Quality</span><br />Meets Tradition
            </h1>
            <p className="text-amber-100/75 text-lg leading-relaxed max-w-xl mb-10">
              At Amani Brew, we believe the best meals begin with the finest ingredients. Our master butchers handpick every cut, blending time-honored Tanzanian culinary traditions with modern quality standards.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <a href="#products" className="bg-[#CDAD7D] text-[#3B2A1E] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-[#b59563] transition-colors shadow-lg">
                Explore Our Products
              </a>
              <a href="#about" className="border border-white/30 text-white px-8 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors">
                Our Story
              </a>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <div className="relative w-72 h-72 lg:w-96 lg:h-96">
              <div className="absolute inset-0 bg-[#CDAD7D]/20 rounded-full animate-pulse" />
              <div className="absolute inset-6 bg-[#CDAD7D]/30 rounded-full" />
              <div className="absolute inset-12 bg-[#3B2A1E] rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-4 border-[#CDAD7D]/30">
                <img src="/images/premium cuts.jpeg" alt="Premium Cuts" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="max-w-7xl mx-auto px-6 pb-10 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '500+', label: 'Loyal Customers' },
              { value: '15+', label: 'Years Experience' },
              { value: '50+', label: 'Premium Cuts' },
              { value: '3', label: 'Branches' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-center border border-white/10">
                <p className="text-3xl font-extrabold text-[#CDAD7D]">{s.value}</p>
                <p className="text-xs text-amber-200 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <div className="inline-block bg-[#CDAD7D]/20 px-4 py-1.5 rounded-full text-[var(--color-brand-tan)] text-sm font-semibold mb-4">
              Our Story
            </div>
            <h2 className="text-4xl font-extrabold text-[var(--color-brand-dark)] mb-6 leading-tight">
              Rooted in Tanzanian<br />Culinary Heritage
            </h2>
            <p className="text-[var(--color-sys-text-secondary)] text-base leading-relaxed mb-6">
              Founded in 2009 in the heart of Dar es Salaam, Amani Brew began as a small family butchery with one simple mission: to provide the local community with the freshest, highest-quality meat at fair prices. Our name, "Amani," means peace in Swahili — and that spirit of harmony is at the core of everything we do.
            </p>
            <p className="text-[var(--color-sys-text-secondary)] text-base leading-relaxed">
              Today, we operate three branches across Tanzania, serve over 500 clients including homes, restaurants, and hotels, and remain committed to our roots: exceptional quality, honest relationships, and community support.
            </p>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="bg-[var(--color-brand-dark)] rounded-3xl p-0 overflow-hidden text-white text-center flex flex-col group transition-all hover:scale-[1.02]">
              <div className="h-40 w-full overflow-hidden">
                <img src="/images/afrm to table.jpeg" alt="Farm to Table" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <p className="font-bold">Farm to Table</p>
                <p className="text-xs text-amber-200 mt-2">Direct partnerships with local ethical farmers</p>
              </div>
            </div>
            <div className="bg-[var(--color-brand-tan)] rounded-3xl p-0 overflow-hidden text-white text-center flex flex-col mt-6 group transition-all hover:scale-[1.02]">
              <div className="h-40 w-full overflow-hidden">
                <img src="/images/master butcher.jpeg" alt="Master Butchers" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <p className="font-bold">Master Butchers</p>
                <p className="text-xs text-white/80 mt-2">Certified artisans with decades of experience</p>
              </div>
            </div>
            <div className="bg-[var(--color-brand-tan)] rounded-3xl p-0 overflow-hidden text-white text-center flex flex-col group transition-all hover:scale-[1.02]">
              <div className="h-40 w-full overflow-hidden">
                <img src="/images/cold chain.jpeg" alt="Cold Chain" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <p className="font-bold">Cold Chain</p>
                <p className="text-xs text-white/80 mt-2">State-of-the-art refrigeration from farm to you</p>
              </div>
            </div>
            <div className="bg-[var(--color-brand-dark)] rounded-3xl p-0 overflow-hidden text-white text-center flex flex-col mt-6 group transition-all hover:scale-[1.02]">
              <div className="h-40 w-full overflow-hidden">
                <img src="/images/delivery.jpeg" alt="Same-Day Delivery" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="p-6">
                <p className="font-bold">Same-Day Delivery</p>
                <p className="text-xs text-amber-200 mt-2">Fresh to your door across Dar es Salaam</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section id="products" className="py-24 bg-[var(--color-brand-dark)]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="inline-block bg-[#CDAD7D]/20 px-4 py-1.5 rounded-full text-[#CDAD7D] text-sm font-semibold mb-4">
              Our Selection
            </div>
            <h2 className="text-4xl font-extrabold text-white mb-4">Premium Cuts & Products</h2>
            <p className="text-amber-200/70 max-w-lg mx-auto">Handpicked by our master butchers, every product meets our exacting standards for taste, freshness, and ethical sourcing.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.map(p => (
              <div key={p.name} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-7 hover:bg-white/15 transition-all hover:-translate-y-1">
                <div className="text-4xl mb-4">{p.icon}</div>
                <h3 className="text-white font-bold text-lg mb-2">{p.name}</h3>
                <p className="text-amber-200/70 text-sm leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Philosophy ── */}
      <section id="philosophy" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-block bg-[#CDAD7D]/20 px-4 py-1.5 rounded-full text-[var(--color-brand-tan)] text-sm font-semibold mb-4">
            Our Philosophy
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--color-brand-dark)] mb-4">The Amani Brew Way</h2>
          <p className="text-[var(--color-sys-text-secondary)] max-w-lg mx-auto">Four core pillars guide every decision we make — from choosing our farmers to delivering to your door.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {VALUES.map(v => (
            <div key={v.title} className="bg-white rounded-2xl p-8 shadow-sm border border-[var(--color-sys-border)] flex gap-5 hover:shadow-md transition-shadow">
              <div className="text-4xl shrink-0">{v.icon}</div>
              <div>
                <h3 className="font-bold text-[var(--color-brand-dark)] text-lg mb-2">{v.title}</h3>
                <p className="text-[var(--color-sys-text-secondary)] text-sm leading-relaxed">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact / CTA ── */}
      <section id="contact" className="py-24" style={{ background: 'linear-gradient(135deg, #3B2A1E, #5C3D2E)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to Experience the Difference?</h2>
          <p className="text-amber-200/70 mb-10 text-lg">Join our growing list of satisfied customers. Subscribe to our newsletter for recipes, promotions, and new products.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-sm outline-none focus:border-[#CDAD7D] transition"
            />
            <button className="bg-[#CDAD7D] text-[#3B2A1E] px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-[#b59563] transition-colors whitespace-nowrap">
              Subscribe Now
            </button>
          </div>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              { icon: '📍', title: 'Visit Us', detail: 'Dar es Salaam, Tanzania\n3 Branches Citywide' },
              { icon: '📞', title: 'Call Us', detail: '+255 712 345 678\nMon–Sat, 7AM–7PM' },
              { icon: '✉️', title: 'Email Us', detail: 'hello@amanibrew.com\nWe reply within 2 hours' },
            ].map(c => (
              <div key={c.title} className="bg-white/10 rounded-2xl p-6 border border-white/10">
                <div className="text-3xl mb-3">{c.icon}</div>
                <p className="text-white font-bold mb-1">{c.title}</p>
                <p className="text-amber-200/70 text-sm whitespace-pre-line">{c.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#2C1E16] text-amber-200/60 py-8 text-center text-sm">
        <p>© 2026 Amani Brew Premium Butchery. All rights reserved.</p>
        <p className="mt-1 text-xs">Crafted with ❤️ in Dar es Salaam, Tanzania · <a href="/login" className="text-[#CDAD7D] hover:underline">Staff Login</a></p>
      </footer>
    </div>
  );
}
