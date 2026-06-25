import "server-only";

// Sabah özlü söz kütüphanesi — her kategori 20 söz.
// Kategori, kişinin Pusula iç engel kategorisiyle eşleşir.
// Rotasyon: (kampGunu - 1) % 20 → 3 günlük kampte ilk 3 söz, 90 günlük yolculukta tam tur.

export type OzluKategori = "erteleme" | "cesaret" | "zaman" | "liderlik";

export const OZLU_SOZLER: Record<OzluKategori, { metin: string; kaynak: string }[]> = {
  erteleme: [
    { metin: "Yarını bekleyenlerin yarını olmaz.", kaynak: "Benjamin Franklin" },
    { metin: "Erteleme zamanın hırsızıdır.", kaynak: "Edward Young" },
    { metin: "Bir yıl sonra, bugün başlamış olmayı keşke diyeceksiniz.", kaynak: "Karen Lamb" },
    { metin: "İlerlemenin sırrı başlamaktır.", kaynak: "Mark Twain" },
    { metin: "Hiç bitmemiş bir işin verdiği yorgunluk kadar büyük yorgunluk yoktur.", kaynak: "William James" },
    { metin: "Eylemsizlik şüpheyi ve korkuyu besler. Eylem ise özgüveni ve cesareti.", kaynak: "Dale Carnegie" },
    { metin: "Bir ağaç dikmenin en iyi zamanı yirmi yıl önceydi. İkinci en iyi zaman şimdi.", kaynak: "Çin atasözü" },
    { metin: "Büyük olmak için başlamanız gerekir; başlamak için büyük olmanız gerekmez.", kaynak: "Zig Ziglar" },
    { metin: "Mükemmeli beklerken iyiyi kaçırma.", kaynak: "Voltaire" },
    { metin: "Fırsatlar kaybolmaz; birileri gidip onları alır.", kaynak: "Ann Landers" },
    { metin: "Karar anında yapabileceğiniz en iyi şey doğruyu yapmak, en kötüsü hiçbir şey yapmamak.", kaynak: "Theodore Roosevelt" },
    { metin: "İş yaparken ilham gelir. Beklerken gelmez.", kaynak: "Pablo Picasso" },
    { metin: "Her büyük yolculuk tek bir adımla başlar.", kaynak: "Lao Tzu" },
    { metin: "'Bir gün' deyin; takvimde o gün yoktur.", kaynak: "Modern söz" },
    { metin: "Başlamaktan duyduğunuz korku, başladıktan sonra kaybolur.", kaynak: "Marie Curie" },
    { metin: "Beklemek değişimi getirmez; başlamak değişimi başlatır.", kaynak: "Jim Rohn" },
    { metin: "Bir fikir, eyleme geçmeden büyüyemez.", kaynak: "Arnold Glasow" },
    { metin: "Koşullar hiç mükemmel olmayacak. Şimdi en iyisi.", kaynak: "Napoleon Hill" },
    { metin: "Düşündüğünüz şeyi yapmak, düşünmekten daha kolaydır.", kaynak: "Konfüçyüs" },
    { metin: "Bugün yapabileceğini yarına bırakma.", kaynak: "Benjamin Franklin" },
  ],
  cesaret: [
    { metin: "Cesaret korkunun olmadığı yer değil; korkuya rağmen ilerlemeye karar vermektir.", kaynak: "Nelson Mandela" },
    { metin: "En büyük zafer, hiç düşmemek değil; her düşüşten sonra kalkmaktır.", kaynak: "Konfüçyüs" },
    { metin: "Korku kapıya geldi; cesaret kapıyı açtı. Kapıda kimse yoktu.", kaynak: "İngiliz atasözü" },
    { metin: "Büyük işler yapmak için yüreklilik gerekir.", kaynak: "Aristo" },
    { metin: "Risk almayan kişi hiçbir şeye ulaşamaz, hiçbir şey olmaz ve olmayı bırakır.", kaynak: "Leo Buscaglia" },
    { metin: "Yaşamın en büyük hatası, sürekli hata yapma korkusudur.", kaynak: "Elbert Hubbard" },
    { metin: "Cesaret bir erdemdir; değeri son nefeste bilinir.", kaynak: "Winston Churchill" },
    { metin: "Kendinize inanmak, cesaretin ilk adımıdır.", kaynak: "Eleanor Roosevelt" },
    { metin: "Tehlikesiz denizlerde kaptanlık öğrenilmez.", kaynak: "Eski denizci atasözü" },
    { metin: "Cesaret korkuyu yok etmez; korkuyu kontrol etmek demektir.", kaynak: "Mark Twain" },
    { metin: "Yüreğin sesi aklın sesinden daha yüksek çıktığında, o ses doğrudur.", kaynak: "Ralph Waldo Emerson" },
    { metin: "Başarısızlık korkusu sizi durdurmasın; başarısız olmak denemiş olmaktır.", kaynak: "Robert Kiyosaki" },
    { metin: "Bir insan gerçekten cesur olduğunda, başkalarına da güç verir.", kaynak: "Harriet Tubman" },
    { metin: "Büyük hayaller için büyük cesaret şarttır.", kaynak: "Oprah Winfrey" },
    { metin: "Karanlığı lanetlemek yerine bir mum yak.", kaynak: "Çin atasözü" },
    { metin: "Cesaret, başkalarının durduğu yerde bir adım atmaktır.", kaynak: "Abraham Lincoln" },
    { metin: "Denemekten utanmak, başarısız olmaktan çok daha utanç vericidir.", kaynak: "Theodore Roosevelt" },
    { metin: "En cesur eylem, kendiniz olmaktır.", kaynak: "Coco Chanel" },
    { metin: "Bir savaşı kazanmak için korkuyu kabul et, ama onu yönet.", kaynak: "Sun Tzu" },
    { metin: "İçinizdeki dev uyandığında, dışınızdaki hiçbir şey sizi durduramaz.", kaynak: "Tony Robbins" },
  ],
  zaman: [
    { metin: "Zamanı en iyi kullanan, en çok yaşayandır.", kaynak: "Edward Young" },
    { metin: "Meşgul olmak ile üretken olmak aynı şey değildir.", kaynak: "Tim Ferriss" },
    { metin: "Her şeyi yapabilirsiniz; ama hepsini aynı anda yapamazsınız.", kaynak: "David Allen" },
    { metin: "Öncelikleri belirlemek, zamanınızın değerini belirler.", kaynak: "Jim Rohn" },
    { metin: "Hayır diyemeyen kişi zamanını başkalarına satıyor demektir.", kaynak: "Modern söz" },
    { metin: "Başarılı insanların da 24 saati var; fark, bu saatlere ne koyduklarında.", kaynak: "Arnold Bennett" },
    { metin: "Enerjinizi değil, zamanınızı yönetin.", kaynak: "Jim Loehr & Tony Schwartz" },
    { metin: "Bir şeye zaman bulamıyorsanız, aslında onu öncelikli görmüyorsunuzdur.", kaynak: "Modern söz" },
    { metin: "Dikkatiniz neredeyse, zamanınız oraya gider.", kaynak: "Robin Sharma" },
    { metin: "Verimliliğin sırrı, nerede 'hayır' diyeceğinizi bilmektir.", kaynak: "Steve Jobs" },
    { metin: "Önemli olan şeyleri yapmak için, önemsiz olanları bırakmayı öğren.", kaynak: "Warren Buffett" },
    { metin: "Zamanınızı önceliklerinize değil, önceliklerinizi zamanınıza göre ayarlayın.", kaynak: "Stephen Covey" },
    { metin: "İnsan vakitlerini kendileri değil; zamanı geçirenler çalar.", kaynak: "Seneca" },
    { metin: "Hiç kimse zamanı geri getiremez; ama hiç kimse onu doğru kullanmaktan da alıkoyamaz.", kaynak: "Benjamin Franklin" },
    { metin: "Seçim yapmak, başkalarını bırakmak anlamına gelir. Bu liderliğin özüdür.", kaynak: "Peter Drucker" },
    { metin: "Odaklanmanın gücü, ne yapacağınızı bilmekte değil; ne yapmayacağınızı bilmektedir.", kaynak: "Gary Keller" },
    { metin: "Zamanı harcadığınız yere dikkat edin; orası hayatınızın harcandığı yer.", kaynak: "Annie Dillard" },
    { metin: "İki görev arasında seçim yapamayan, ikisini de bitiremez.", kaynak: "Publilius Syrus" },
    { metin: "Yapmanız gereken her şeyi yapmak için zamanınız var. Gereksiz olan için değil.", kaynak: "Peter Drucker" },
    { metin: "Bugünü iyi yaşa; yarın değil, bugün.", kaynak: "Konfüçyüs" },
  ],
  liderlik: [
    { metin: "Liderlik makam değil, insanların hayatına dokunmaktır.", kaynak: "John Maxwell" },
    { metin: "En iyi lider, insanlara 'ben yaptım' değil 'biz yaptık' hissini yaşatandır.", kaynak: "Lao Tzu" },
    { metin: "Yöneticiler doğru şeyleri yapar; liderler şeyleri doğru yapar.", kaynak: "Warren Bennis" },
    { metin: "Lider bir umut dağıtıcısıdır.", kaynak: "Napoleon Bonaparte" },
    { metin: "Liderlik bir unvan değil, eylemdir.", kaynak: "Simon Sinek" },
    { metin: "Bir ekibi yönetmek kolaydır; onlara ilham vermek başka bir sanattır.", kaynak: "Jack Welch" },
    { metin: "İnsanlar sizi unuttuktan sonra bile, yetiştirdiğiniz liderler hatırlanır.", kaynak: "John Maxwell" },
    { metin: "Liderlik; başkalarını daha iyi yapma sorumluluğunu üstlenmektir.", kaynak: "Simon Sinek" },
    { metin: "Cesur kararlar liderliğin özüdür; güvenli kararlar herkesin işidir.", kaynak: "Peter Drucker" },
    { metin: "Kendinizi yönetemeyenler başkalarını yönetemez.", kaynak: "Platon" },
    { metin: "Büyük liderler, kendilerinden büyük insanlar yetiştirir.", kaynak: "Jack Welch" },
    { metin: "Liderlik etkisi yetkiden değil, karakterden gelir.", kaynak: "Dwight D. Eisenhower" },
    { metin: "Güç, insanlara ne yapacaklarını söylemekten değil, onları doğruya yönlendirmekten gelir.", kaynak: "Dwight D. Eisenhower" },
    { metin: "Lider kriz anında belli olur.", kaynak: "Türk atasözü" },
    { metin: "Başkalarından fazla bilmek değil; farklı görmek liderliğin özüdür.", kaynak: "Margaret Mead" },
    { metin: "İnsanları en çok motive eden şey para değil; anlamlı bir şeyin parçası olmaktır.", kaynak: "Daniel Pink" },
    { metin: "Bir lider yol gösterir; giden kişi büyük lider adayıdır.", kaynak: "Lao Tzu" },
    { metin: "Güçlü lider soru sorar; zayıf lider cevap verir.", kaynak: "Voltaire" },
    { metin: "Lider olmak, en az bir kişinin hayatını kalıcı olarak değiştirmiş olmaktır.", kaynak: "John Quincy Adams" },
    { metin: "Ekibinizin başarısı sizin başarınızdır; sizin başarınız ekibinizin.", kaynak: "Konfüçyüs" },
  ],
};

// Pusula ic_engel_kat → özlü söz kategorisi eşlemesi
export function kategoriSec(icEngelKat: string | null | undefined): OzluKategori {
  switch (icEngelKat) {
    case "belirsizlik":
      return "erteleme";
    case "red_korkusu":
      return "cesaret";
    case "kontrol":
      return "zaman"; // "her şeyi ben yapmalıyım" → zaman yönetimi / devretme
    case "yetersizlik":
      return "cesaret";
    case "baskasinin_onayi":
      return "cesaret";
    case "degersizlik":
    case "impostor":
      return "liderlik";
    default:
      return "liderlik"; // Pusula dolmamışsa veya "diger" → liderlik
  }
}

// Gün bazlı rotasyon (tekrar etmesin): (gun - 1) % 20
export function sozSec(
  kategori: OzluKategori,
  gun: number
): { metin: string; kaynak: string } {
  const liste = OZLU_SOZLER[kategori];
  const idx = Math.max(0, (gun - 1) % liste.length);
  return liste[idx];
}
