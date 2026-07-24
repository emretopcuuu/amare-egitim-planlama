import { ICERIK, INSTAGRAM_URL, YOUTUBE_KANAL_URL } from "./icerik";

const SITE = "https://emretopcu.ai";

// Google zengin sonuçları + AI araçları için yapılandırılmış veri.
// Tek doğruluk kaynağı ICERIK; SSS buradan türer.
export function jsonLd() {
  const kisi = {
    "@type": "Person",
    "@id": `${SITE}/#emretopcu`,
    name: "Emre Topçu",
    jobTitle: "Presidential Diamond",
    worksFor: { "@type": "Organization", name: "One Team Global" },
    description:
      "Doğrudan satış lideri. Ekipler kuran, liderler yetiştiren ve bu işi sistemle yapan bir Presidential Diamond.",
    url: SITE,
    image: `${SITE}/og.png`,
    homeLocation: { "@type": "Place", name: "İstanbul, Türkiye" },
    alumniOf: {
      "@type": "CollegeOrUniversity",
      name: "Kocaeli Üniversitesi",
    },
    knowsAbout: [
      "Doğrudan satış",
      "Liderlik",
      "Ekip kurma",
      "Kişisel gelişim",
      "Satış sistemleri",
    ],
    sameAs: [INSTAGRAM_URL, YOUTUBE_KANAL_URL],
  };

  const kitap = {
    "@type": "Book",
    name: "İlk 72 Saat",
    author: { "@id": `${SITE}/#emretopcu` },
    inLanguage: "tr",
    datePublished: "2017",
    about: "Doğrudan satışta ilk başlangıç sistemi.",
  };

  const site = {
    "@type": "WebSite",
    "@id": `${SITE}/#site`,
    url: SITE,
    name: "Emre Topçu",
    inLanguage: ["tr", "en", "de", "es", "ru", "az"],
    about: { "@id": `${SITE}/#emretopcu` },
    // Sesli asistanlar için okunabilir bölümler.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#manifesto", "#teori"],
    },
  };

  const sss = {
    "@type": "FAQPage",
    mainEntity: ICERIK.tr.sss.sorular.map((s) => ({
      "@type": "Question",
      name: s.soru,
      acceptedAnswer: { "@type": "Answer", text: s.cevap },
    })),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["#sss"],
    },
  };

  // Eğitim videoları — Google video zengin sonuçları.
  const videolar = ICERIK.tr.videolar.liste.map((v) => ({
    "@type": "VideoObject",
    name: v.baslik,
    description: v.ozet,
    thumbnailUrl: `${SITE}${v.gorsel}`,
    uploadDate: "2020-01-01",
    embedUrl:
      v.platform === "vimeo"
        ? `https://player.vimeo.com/video/${v.id}`
        : `https://www.youtube-nocookie.com/embed/${v.id}`,
    publisher: { "@id": `${SITE}/#emretopcu` },
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [kisi, kitap, site, sss, ...videolar],
  };
}
