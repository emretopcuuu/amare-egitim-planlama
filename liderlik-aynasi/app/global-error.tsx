"use client";

// #6 Son çare hata sınırı: kök layout bile çökerse devreye girer. Kendi
// <html>/<body>'sini kurar; globals.css yüklenmeyebileceği için satır içi
// stil + sade Türkçe metin. Yine de boş/teknik ekran yok — tek warm buton.
export default function GlobalHata({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06121e",
          color: "#e6edf4",
          fontFamily: "system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "360px" }}>
          <div style={{ fontSize: "48px" }}>🪞</div>
          <h1 style={{ fontSize: "24px", margin: "16px 0 8px", fontWeight: 600 }}>
            Bir şey ters gitti
          </h1>
          <p style={{ color: "#9fb0c0", lineHeight: 1.6, margin: 0 }}>
            Endişelenme — verilerin güvende. Birlikte tekrar deneyelim.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "24px",
              width: "100%",
              height: "56px",
              borderRadius: "16px",
              border: "none",
              background: "linear-gradient(180deg,#fbbf24,#d97706)",
              color: "#1a1206",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  );
}
