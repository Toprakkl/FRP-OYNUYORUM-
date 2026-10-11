# FRP Masası

Tek kişilik, yapay zeka hakemli bir FRP masası. Telefonda ve bilgisayarda aynı ekran: üstte karakter, altta hikâye, zarı kod atar, hakem sahneyi anlatır.

## Neyi bilerek değiştirdim

Plan Supabase, hesap, görsel üretimi ve uzun bir faz listesi istiyordu. Oynamak için bunların hiçbiri şart değil.

- Kayıt bu tarayıcıda durur. Aylar sonra aynı tarayıcıda kaldığın yerden devam edersin. Telefonla bilgisayar arasında geçiş, indirilen `.frp.json` yedeğiyle olur.
- Hakem Gemini API'dir. Gemini sohbetindeki Pro abonelik bu uygulamaya bağlanmaz. Anahtar [Google AI Studio](https://aistudio.google.com/apikey) üzerinden alınır; ücretsiz kota bu masa için yeter.
- Varsayılan model `gemini-3.8-flash`. Eski `gemini-2.5-flash` yeni anahtarlarda kısıtlı.
- Zar istemcide, kriptografik olarak atılır. Bonus sunucuda, karakter kağıdındaki statten hesaplanır. Hakem zar atmaz.
- Can, para, XP, eşya, görev ve kişi ancak doğrulanmış komutla değişir. Yapay zeka tek turda en fazla 6 komut yollar; can değişimi −30 ile +30 arasındadır.
- Görsel üretimi yok. Portreyi kendin yüklersin.

## Çalıştırma

```bash
npm install
npm run dev
```

İstersen kökte `.env.local`:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.8-flash
```

Anahtarı oyunun ayarlar sekmesine de yapıştırabilirsin. Anahtar macera dosyasına yazılmaz.

Anahtar yokken yerel anlatıcı sahneyi taşır. Kurallı bir hakem değildir; kapı, zar ve karakter kağıdı yine çalışır.

## Nasıl oynanır

1. Yeni macerada bir dünya ve sınıf seç.
2. Riskli bir işte d20 at, statı seç, ne yaptığını yaz.
3. Risksiz işte zar atmadan yaz. Hakem gerekirse senden atmanı ister.
4. Can, altın, eşya ve görevler üstteki sekmelerden elle de değişir. Her değişiklik günlükte durur ve geri alınabilir.
5. Dünya kitabına mekan, kişi ve sır yaz. "Her tur hakeme git" işaretli notlar her turda gider. "Yalnız hakem bilsin" işaretli notlar sende görünür, anlatımda açıkça söylenmez.

Tek zar yeter. Hasar ayrı bir zar değildir; hakem yarayı cana işler.

Kolayda ölüm yok. Normalde bayılırsın. Sertte sıfır can ölür; karakter sayfasından diriltebilirsin.

+18 kapalı başlar. Açmak için 18 yaş onayı gerekir. 18 yaşından küçük bir karakterde bu ayar açılmaz ve cinsel içerik üretilmez.
