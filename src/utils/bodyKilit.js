// iOS'a dayanıklı arka plan kaydırma kilidi (modal / alt panel açıkken).
// body{overflow:hidden} iOS Safari'de dokunma kaydırmasını durdurmaz; position:fixed +
// kaydedilen scrollY durdurur, kapanınca aynı yere döner. Sayaçlı → iç içe katmanlar güvenli.
let kilitSayac = 0;
let kayitliY = 0;

export const bodyKilitle = () => {
  if (typeof document === 'undefined') return;
  if (kilitSayac++ > 0) return;
  kayitliY = window.scrollY || 0;
  document.body.style.top = `-${kayitliY}px`;
  document.body.classList.add('modal-kilit');
};

export const bodyKilidiAc = () => {
  if (typeof document === 'undefined') return;
  if (kilitSayac > 0) kilitSayac--;
  if (kilitSayac > 0) return;
  document.body.classList.remove('modal-kilit');
  document.body.style.top = '';
  window.scrollTo(0, kayitliY);
};
