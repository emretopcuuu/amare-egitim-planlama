// Hakkımızda — OneTeam Girişimcilik Ekosistemi kurumsal sayfası
// Misyon + Vizyon + ileride Değerler/Liderler/İletişim için geniş.
// İçerik şimdilik hard-coded; ileride Firestore'a alınabilir.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Compass, GraduationCap, Building2, Crown, ArrowRight } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useTranslation } from '../context/LanguageContext';
import { useSmartBack } from '../utils/navigation';

const I18N = {
  tr: {
    anasayfa: 'Anasayfa',
    geri: 'Geri',
    kicker: 'One Team',
    baslikSol: 'Girişimcilik',
    baslikSag: 'Ekosistemi',
    intro: 'Sağlık, varlık ve özgürlük için yola çıkan, girişimci adaylarına destek olan aile.',
    misyon: 'Misyon',
    misyonMetin1: 'Sağlık, varlık ve özgürlük dolu bir yaşamın',
    misyonVurgu: ' herkes için ',
    misyonMetin2: 'mümkün olduğuna inanıyoruz. One Team ailesi olarak hep birlikte bunun için çalışıyoruz.',
    vizyon: 'Vizyon',
    vizyonMetin1: 'Bireylerin ve toplulukların yaşamını iyileştiren,',
    vizyonVurgu: ' dünyanın en büyük ve en etkili ',
    vizyonMetin2: 'girişimcilik ekosistemi olmak.',
    altKicker: 'Birlikte Daha Güçlü',
    altMetin: 'One Team, Amare liderlerin kurduğu dünyanın en başarılı girişimci dayanışma topluluklarından biridir.',
    sekmelerKicker: 'Ekosistemi Keşfet',
    egitmenlerBaslik: 'Eğitmenler',
    egitmenlerAciklama: 'Aramıza katılıp bilgi ve deneyimlerini paylaşan uzmanlar',
    komisyonlarBaslik: 'Komisyonlar',
    komisyonlarAciklama: 'Yürütme Kurulu’nun kurduğu 11 görev komisyonu',
    yurutmeBaslik: 'Yürütme Kurulu',
    yurutmeAciklama: 'OneTeam ekosistemini yönlendiren liderler',
    ke: 'Keşfet',
    copyright: '© 2026 Powered by OneTeam',
  },
  en: {
    anasayfa: 'Home',
    geri: 'Back',
    kicker: 'One Team',
    baslikSol: 'Entrepreneurship',
    baslikSag: 'Ecosystem',
    intro: 'A family setting out for health, prosperity and freedom, supporting aspiring entrepreneurs.',
    misyon: 'Mission',
    misyonMetin1: 'We believe a life full of health, prosperity and freedom is',
    misyonVurgu: ' possible for everyone',
    misyonMetin2: '. As the One Team family, we work together for this.',
    vizyon: 'Vision',
    vizyonMetin1: 'To become',
    vizyonVurgu: ' the world\'s largest and most influential ',
    vizyonMetin2: 'entrepreneurship ecosystem improving the lives of individuals and communities.',
    altKicker: 'Stronger Together',
    altMetin: 'One Team is one of the world’s most successful entrepreneur solidarity communities, founded by Amare leaders.',
    sekmelerKicker: 'Explore the Ecosystem',
    egitmenlerBaslik: 'Trainers',
    egitmenlerAciklama: 'Experts who join us to share their knowledge and experience',
    komisyonlarBaslik: 'Committees',
    komisyonlarAciklama: '11 task committees established by the Executive Board',
    yurutmeBaslik: 'Executive Board',
    yurutmeAciklama: 'The leaders guiding the OneTeam ecosystem',
    ke: 'Explore',
    copyright: '© 2026 Powered by OneTeam',
  },
  de: {
    anasayfa: 'Startseite',
    geri: 'Zurück',
    kicker: 'One Team',
    baslikSol: 'Unternehmer',
    baslikSag: 'Ökosystem',
    intro: 'Eine Familie auf dem Weg zu Gesundheit, Wohlstand und Freiheit – mit Unterstützung für angehende Unternehmer.',
    misyon: 'Mission',
    misyonMetin1: 'Wir glauben, ein Leben voller Gesundheit, Wohlstand und Freiheit ist',
    misyonVurgu: ' für jeden ',
    misyonMetin2: 'möglich. Als One Team-Familie arbeiten wir gemeinsam dafür.',
    vizyon: 'Vision',
    vizyonMetin1: 'Das',
    vizyonVurgu: ' weltweit größte und einflussreichste ',
    vizyonMetin2: 'Unternehmer-Ökosystem zu werden, das das Leben von Menschen und Gemeinschaften verbessert.',
    altKicker: 'Gemeinsam Stärker',
    altMetin: 'One Team ist eine der erfolgreichsten Unternehmer-Solidargemeinschaften der Welt, gegründet von Amare-Führungskräften.',
    sekmelerKicker: 'Erkunde das Ökosystem',
    egitmenlerBaslik: 'Trainer',
    egitmenlerAciklama: 'Experten, die ihr Wissen und ihre Erfahrung mit uns teilen',
    komisyonlarBaslik: 'Ausschüsse',
    komisyonlarAciklama: '11 Arbeitsausschüsse, die vom Exekutivausschuss eingerichtet wurden',
    yurutmeBaslik: 'Exekutivausschuss',
    yurutmeAciklama: 'Die Führungskräfte des OneTeam-Ökosystems',
    ke: 'Erkunden',
    copyright: '© 2026 Powered by OneTeam',
  },
  nl: {
    anasayfa: 'Home',
    geri: 'Terug',
    kicker: 'One Team',
    baslikSol: 'Ondernemers',
    baslikSag: 'Ecosysteem',
    intro: 'Een familie op weg naar gezondheid, welvaart en vrijheid — met steun voor aspirant-ondernemers.',
    misyon: 'Missie',
    misyonMetin1: 'Wij geloven dat een leven vol gezondheid, welvaart en vrijheid',
    misyonVurgu: ' voor iedereen ',
    misyonMetin2: 'mogelijk is. Als One Team-familie werken we hier samen aan.',
    vizyon: 'Visie',
    vizyonMetin1: 'Het',
    vizyonVurgu: ' grootste en meest invloedrijke ',
    vizyonMetin2: 'ondernemersecosysteem ter wereld worden dat het leven van individuen en gemeenschappen verbetert.',
    altKicker: 'Samen Sterker',
    altMetin: 'One Team is een van \'s werelds meest succesvolle ondernemers-solidariteitsgemeenschappen, opgericht door Amare-leiders.',
    sekmelerKicker: 'Ontdek het Ecosysteem',
    egitmenlerBaslik: 'Trainers',
    egitmenlerAciklama: 'Experts die hun kennis en ervaring delen',
    komisyonlarBaslik: 'Commissies',
    komisyonlarAciklama: '11 werkcommissies opgericht door het Uitvoerend Bestuur',
    yurutmeBaslik: 'Uitvoerend Bestuur',
    yurutmeAciklama: 'De leiders die het OneTeam-ecosysteem aansturen',
    ke: 'Verkennen',
    copyright: '© 2026 Powered by OneTeam',
  },
};

const HakkimizdaSayfasi = () => {
  const navigate = useNavigate();
  const geri = useSmartBack('/');
  const { lang } = useTranslation();
  const tr = I18N[lang] || I18N.tr;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 relative">
      {/* Dekoratif altın aurora */}
      <div className="absolute top-0 left-0 right-0 h-[700px] bg-[radial-gradient(ellipse_at_center_top,rgba(251,191,36,0.18)_0%,transparent_75%)] pointer-events-none" />
      <div className="absolute top-40 -left-32 w-[28rem] h-[28rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute top-80 -right-32 w-[28rem] h-[28rem] rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[40rem] h-[20rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 py-6 sm:py-10 max-w-4xl">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
          <button onClick={geri}
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white px-4 py-2 rounded-full text-sm font-semibold transition-all spring-tap">
            <ArrowLeft className="w-4 h-4" /> {tr.geri || tr.anasayfa}
          </button>
          <LanguageSwitcher />
        </div>

        {/* HERO */}
        <div className="text-center mb-12 sm:mb-16 animate-fade-in">
          {/* OneTeam logo — transparent + halo glow */}
          <div className="relative inline-block mb-6">
            <div className="absolute -inset-6 bg-amber-400/20 blur-3xl pointer-events-none" />
            <img
              src="/logos/oneteam-logo.png"
              alt="OneTeam"
              className="relative w-24 sm:w-28 md:w-32 h-auto"
              style={{
                filter: 'drop-shadow(0 8px 24px rgba(251, 191, 36, 0.35)) drop-shadow(0 0 40px rgba(251, 191, 36, 0.2))',
              }}
            />
          </div>

          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-12 bg-amber-400/50" />
            <span className="text-amber-300 text-xs sm:text-sm uppercase tracking-[0.4em] font-semibold whitespace-nowrap">
              {tr.kicker}
            </span>
            <div className="h-px w-12 bg-amber-400/50" />
          </div>

          {/* Başlık */}
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight mb-4 leading-tight">
            {tr.baslikSol} <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 bg-clip-text text-transparent font-bold">{tr.baslikSag}</span>
          </h1>

          <p className="text-purple-100/90 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            {tr.intro}
          </p>
        </div>

        {/* Ekosistem Sekmeleri — Eğitmenler / Komisyonlar / Yürütme Kurulu (ÖNE ÇIKARILDI — BÜYÜK) */}
        <section className="mb-10 sm:mb-14">
          {/* Kicker */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-12 sm:w-16 bg-amber-400/50" />
            <span className="text-amber-300 text-[11px] sm:text-sm uppercase tracking-[0.5em] font-bold whitespace-nowrap">
              {tr.sekmelerKicker}
            </span>
            <div className="h-px w-12 sm:w-16 bg-amber-400/50" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {[
              { key: 'egitmenler', href: '/konusmacilar', icon: GraduationCap, baslik: tr.egitmenlerBaslik, aciklama: tr.egitmenlerAciklama },
              { key: 'komisyonlar', href: '/komisyonlar', icon: Building2, baslik: tr.komisyonlarBaslik, aciklama: tr.komisyonlarAciklama },
              { key: 'yurutme', href: '/yurutmekurulu', icon: Crown, baslik: tr.yurutmeBaslik, aciklama: tr.yurutmeAciklama },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => navigate(s.href)}
                  className="group relative bg-gradient-to-br from-white/[0.10] to-white/[0.03] hover:from-white/[0.15] hover:to-white/[0.05] backdrop-blur-md border-2 border-amber-300/30 hover:border-amber-300/70 rounded-3xl p-7 sm:p-9 transition-all duration-300 spring-tap text-left shadow-2xl hover:shadow-amber-500/30 overflow-hidden hover:-translate-y-1"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Köşe glow */}
                  <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-amber-400/10 group-hover:bg-amber-400/25 blur-3xl transition-colors pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-purple-500/10 group-hover:bg-purple-500/20 blur-3xl transition-colors pointer-events-none" />
                  <div className="relative">
                    {/* İkon — BÜYÜK */}
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400/35 to-amber-600/15 border border-amber-300/50 shadow-lg mb-5 group-hover:scale-105 transition-transform">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300" />
                    </div>
                    {/* Başlık — BÜYÜK */}
                    <h3 className="text-white font-bold text-xl sm:text-2xl mb-2 leading-tight">
                      {s.baslik}
                    </h3>
                    <p className="text-purple-100/85 text-sm leading-relaxed mb-5 min-h-[2.75rem]">
                      {s.aciklama}
                    </p>
                    {/* CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-amber-300/20">
                      <span className="text-xs uppercase tracking-wider font-extrabold text-amber-300">
                        {tr.ke}
                      </span>
                      <ArrowRight className="w-5 h-5 text-amber-300 transition-transform group-hover:translate-x-1.5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* MİSYON + VİZYON — KOMPAKT yan yana */}
        <section className="mb-10 sm:mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* MİSYON */}
          <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md border border-amber-300/20 rounded-2xl p-5 sm:p-6 overflow-hidden shadow-lg">
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-300/40 flex-shrink-0">
                  <Target className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-amber-300 text-xs uppercase tracking-[0.4em] font-bold">
                  {tr.misyon}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
              </div>
              <p className="text-white/90 text-sm leading-relaxed">
                {tr.misyonMetin1}
                <span className="text-amber-300 font-medium">{tr.misyonVurgu}</span>
                {tr.misyonMetin2}
              </p>
            </div>
          </div>

          {/* VİZYON */}
          <div className="relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] backdrop-blur-md border border-amber-300/20 rounded-2xl p-5 sm:p-6 overflow-hidden shadow-lg">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/25 to-amber-600/10 border border-amber-300/40 flex-shrink-0">
                  <Compass className="w-5 h-5 text-amber-300" />
                </div>
                <span className="text-amber-300 text-xs uppercase tracking-[0.4em] font-bold">
                  {tr.vizyon}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-amber-400/40 to-transparent" />
              </div>
              <p className="text-white/90 text-sm leading-relaxed">
                {tr.vizyonMetin1}
                <span className="text-amber-300 font-medium">{tr.vizyonVurgu}</span>
                {tr.vizyonMetin2}
              </p>
            </div>
          </div>
        </section>

        {/* Alt manifesto bandı */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-px w-10 bg-amber-400/40" />
            <span className="text-amber-300/90 text-[10px] sm:text-xs uppercase tracking-[0.5em] font-bold whitespace-nowrap">
              {tr.altKicker}
            </span>
            <div className="h-px w-10 bg-amber-400/40" />
          </div>
          <p className="text-purple-200/70 text-sm max-w-2xl mx-auto leading-relaxed">
            {tr.altMetin}
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-white/10">
          <p className="text-purple-300/60 text-xs tracking-wider">
            {tr.copyright}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HakkimizdaSayfasi;
