const express = require('express');
const path = require('path');
const ejs = require('ejs');
const methodOverride = require('method-override');
const contactRoutes = require('./Public/contactroutes');
const OpenAI = require('openai');
const puppeteer = require('puppeteer');

const app = express();
app.use(methodOverride('_method'));
app.use(express.static("public"));
const PORT = process.env.PORT || 3000;

const openaiClient = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

function buildKundliHtml({ name = '', dob = '', time = '', place = '' }) {
    const date = dob ? new Date(dob) : null;
    const month = date ? date.getMonth() + 1 : 0;
    const day = date ? date.getDate() : 1;
    const hour = time ? parseInt(time.split(":")[0], 10) : 0;

    const zodiacSigns = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];
    const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu", "Mercury", "Mars", "Jupiter"];
    const houseNames = ["First House", "Second House", "Third House", "Fourth House", "Fifth House", "Sixth House", "Seventh House", "Eighth House", "Ninth House", "Tenth House", "Eleventh House", "Twelfth House"];

    const zodiac = zodiacSigns[(month - 1 + 12) % 12] || 'Unknown';
    const element = ['Earth', 'Air', 'Water', 'Fire'][Math.floor(((month - 1 + 12) % 12) / 3)] || 'Unknown';
    const luckyNumber = ((day + hour) % 9) + 1;
    const nativity = ['Balanced', 'Creative', 'Practical', 'Intuitive'][Math.floor(((day + hour) % 4))];
    const karma = ['Learning', 'Growth', 'Healing', 'Success'][Math.floor(((day + hour) % 4))];
    const chartNotes = [
        'A strong first house gives confidence and presence.',
        'The second house indicates stable finances and values.',
        'The third house shows communication strength.',
        'The fourth house is supportive for family and roots.',
        'The fifth house has creativity and romance energy.',
        'The sixth house points to health awareness and service.',
        'The seventh house supports strong relationships.',
        'The eighth house indicates transformation and intuition.',
        'The ninth house highlights spirituality and learning.',
        'The tenth house is great for career ambition.',
        'The eleventh house gives hopes, dreams and social success.',
        'The twelfth house asks for rest, retreat and recharge.'
    ];

    const housesHtml = houseNames.map((house, index) => {
        const planet = planets[(index + hour) % planets.length];
        const note = chartNotes[index];
        return `<div class="bg-slate-900/80 border border-purple-700 rounded-3xl p-4 min-h-[110px]">
                  <div class="text-sm uppercase text-purple-300 tracking-[0.2em]">${house}</div>
                  <div class="text-lg font-semibold text-white mt-2">${planet}</div>
                  <div class="text-gray-400 text-sm mt-2">${note}</div>
                </div>`;
    }).join('');

    return `
      <div class="bg-slate-950/90 p-6 rounded-3xl shadow-2xl border border-purple-500">
        <div class="text-center mb-8">
          <h3 class="text-3xl font-bold text-purple-300">Kundli Preview for ${name || 'Guest'}</h3>
          <p class="text-gray-400 mt-2">${dob || 'Date missing'} · ${time || 'Time missing'} · ${place || 'Place missing'}</p>
        </div>

        <div class="grid gap-4 md:grid-cols-2 mb-8">
          <div class="bg-slate-900/80 rounded-3xl border border-purple-700 p-5">
            <div class="text-sm uppercase text-purple-300 tracking-[0.2em]">Zodiac Sign</div>
            <div class="text-2xl font-semibold mt-3">${zodiac}</div>
          </div>
          <div class="bg-slate-900/80 rounded-3xl border border-purple-700 p-5">
            <div class="text-sm uppercase text-purple-300 tracking-[0.2em]">Element</div>
            <div class="text-2xl font-semibold mt-3">${element}</div>
          </div>
          <div class="bg-slate-900/80 rounded-3xl border border-purple-700 p-5">
            <div class="text-sm uppercase text-purple-300 tracking-[0.2em]">Lucky Number</div>
            <div class="text-2xl font-semibold mt-3">${luckyNumber}</div>
          </div>
          <div class="bg-slate-900/80 rounded-3xl border border-purple-700 p-5">
            <div class="text-sm uppercase text-purple-300 tracking-[0.2em]">Life Focus</div>
            <div class="text-2xl font-semibold mt-3">${nativity}</div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-3">
          ${housesHtml}
        </div>

        <div class="mt-8 bg-slate-900/80 rounded-3xl border border-purple-700 p-6">
          <h4 class="text-xl font-semibold text-purple-200">Quick Guidance</h4>
          <p class="text-gray-300 mt-3">Your kundli chart is formed locally from the entered birth details. It is designed to look like a traditional astrology layout with houses, planets, and career/love indicators.</p>
          <p class="text-gray-300 mt-2">Remember, this is a visual kundli-style preview, not a full astrology calculation. Use it for presentation and reference.</p>
        </div>
      </div>
    `;
}

// Nakshatra-aware PDF generation (approximate, illustrative only)
const nakshatraNames = [
        'Ashwini','Bharani','Krittika','Rohini','Mrigashirsha','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'
];

function computeNakshatra({ dob = '', time = '' }) {
        const date = dob ? new Date(dob + 'T' + (time || '00:00') + ':00') : new Date();
        const days = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
        const hour = date.getHours();
        const idx = Math.abs((days + hour) % 27);
        return { index: idx, name: nakshatraNames[idx] };
}

function buildKundliPdfHtml({ name = '', dob = '', time = '', place = '' }) {
        const date = dob ? new Date(dob) : null;
        const month = date ? date.getMonth() + 1 : 0;
        const day = date ? date.getDate() : 1;
        const hour = time ? parseInt(time.split(":")[0], 10) : 0;

        const zodiacSigns = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];
        const planets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
        const houseNames = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

        const zodiac = zodiacSigns[(month - 1 + 12) % 12] || 'Unknown';
        const nat = computeNakshatra({ dob, time });

        // Create house data
        let houseData = [];
        for (let i = 0; i < 12; i++) {
            const planet = planets[(i + hour) % planets.length];
            houseData.push({
                house: i + 1,
                zodiac: zodiacSigns[(i + month) % 12],
                planet: planet,
                degree: (Math.random() * 360).toFixed(1)
            });
        }

        return `
            <div style="font-family: Arial, sans-serif; color: #000; background: white; padding: 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 15px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: bold;">KUNDLI (BIRTH CHART)</h1>
                    <p style="margin: 8px 0; font-size: 14px;"><strong>${name || 'Guest'}</strong></p>
                    <p style="margin: 0; font-size: 12px; color: #333;">Date: ${dob || 'N/A'} | Time: ${time || 'N/A'} | Place: ${place || 'N/A'}</p>
                </div>

                <!-- Main Chart Container -->
                <div style="display: flex; gap: 30px; margin-bottom: 20px;">
                    
                    <!-- Kundli Chart (12 Houses) -->
                    <div style="flex: 1;">
                        <table cellpadding="8" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 3px solid #000;">
                            <tr>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 12</strong><br>${houseData[11].zodiac}<br>${houseData[11].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 1</strong><br>${houseData[0].zodiac}<br>${houseData[0].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 2</strong><br>${houseData[1].zodiac}<br>${houseData[1].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 3</strong><br>${houseData[2].zodiac}<br>${houseData[2].planet}
                                </td>
                            </tr>
                            <tr>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 11</strong><br>${houseData[10].zodiac}<br>${houseData[10].planet}
                                </td>
                                <td colspan="2" style="text-align: center; border: 2px solid #000; background: #fffacd; min-height: 60px; font-weight: bold; font-size: 13px;">
                                    ASCENDANT (Lagna)<br>${houseData[0].zodiac}<br>☉ ☽ ♂
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 4</strong><br>${houseData[3].zodiac}<br>${houseData[3].planet}
                                </td>
                            </tr>
                            <tr>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 10</strong><br>${houseData[9].zodiac}<br>${houseData[9].planet}
                                </td>
                                <td colspan="2" style="text-align: center; border: 2px solid #000; background: #fffacd; min-height: 60px; font-weight: bold; font-size: 13px;">
                                    MIDHEAVEN (10th)<br>${houseData[9].zodiac}<br>♃ ♀ ♄
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 5</strong><br>${houseData[4].zodiac}<br>${houseData[4].planet}
                                </td>
                            </tr>
                            <tr>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 9</strong><br>${houseData[8].zodiac}<br>${houseData[8].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 8</strong><br>${houseData[7].zodiac}<br>${houseData[7].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #fff; min-height: 60px; font-size: 12px;">
                                    <strong>House 7</strong><br>${houseData[6].zodiac}<br>${houseData[6].planet}
                                </td>
                                <td style="width: 25%; text-align: center; border: 2px solid #000; background: #f9f9f9; min-height: 60px; font-size: 12px;">
                                    <strong>House 6</strong><br>${houseData[5].zodiac}<br>${houseData[5].planet}
                                </td>
                            </tr>
                        </table>
                    </div>

                    <!-- Info Box -->
                    <div style="width: 280px; border: 2px solid #000; padding: 15px; background: #f0f0f0;">
                        <h3 style="margin-top: 0; font-size: 14px; border-bottom: 1px solid #000; padding-bottom: 8px;">Birth Details</h3>
                        <table style="width: 100%; font-size: 11px; margin-bottom: 12px;">
                            <tr>
                                <td style="padding: 4px 0;"><strong>Date:</strong></td>
                                <td>${dob}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Time:</strong></td>
                                <td>${time}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Place:</strong></td>
                                <td>${place}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Zodiac:</strong></td>
                                <td>${zodiac}</td>
                            </tr>
                            <tr>
                                <td style="padding: 4px 0;"><strong>Nakshatra:</strong></td>
                                <td>${nat.name}</td>
                            </tr>
                        </table>

                        <h3 style="margin-top: 12px; font-size: 14px; border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 8px 0;">Planetary Positions</h3>
                        <div style="font-size: 10px; line-height: 1.8;">
                            <p style="margin: 4px 0;"><strong>☉ Sun:</strong> ${houseData[0].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>☽ Moon:</strong> ${houseData[1].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>♂ Mars:</strong> ${houseData[2].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>☿ Mercury:</strong> ${houseData[3].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>♃ Jupiter:</strong> ${houseData[4].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>♀ Venus:</strong> ${houseData[5].zodiac}</p>
                            <p style="margin: 4px 0;"><strong>♄ Saturn:</strong> ${houseData[6].zodiac}</p>
                        </div>
                    </div>
                </div>

                <!-- Footer Notes -->
                <div style="border-top: 2px solid #000; padding-top: 12px; font-size: 10px; color: #555;">
                    <p style="margin: 0;"><strong>Note:</strong> This Kundli is generated for informational and presentational purposes. 
                    For accurate astrological analysis and detailed predictions, please consult with a qualified astrologer.</p>
                </div>
            </div>
        `;
}

function getFallbackAnswer(message) {
    const lower = (message || '').toLowerCase();
    
    // Greeting responses
    if (lower.match(/\b(hello|hi|hey|greetings)\b/)) {
        return 'Hello! I am your Astro Assistant. Ask me anything about astrology, kundli, zodiac signs, horoscopes, or life guidance. What would you like to know?';
    }
    
    // Kundli and Birth Chart
    if (lower.match(/\b(kundli|birth chart|natal chart|horoscope)\b/)) {
        return 'A kundli (birth chart) is a celestial map of the stars at your birth time. It shows planetary positions and their influence on your life. Use our Kundli Generator to create yours and discover your astrological insights!';
    }
    
    // Zodiac Sign Questions
    if (lower.match(/\b(zodiac|sun sign|my sign|what sign)\b/)) {
        return 'Your zodiac sign is determined by your birth date. Each sign has unique traits, strengths, and challenges. Fire signs (Aries, Leo, Sagittarius) are passionate, Earth signs (Taurus, Virgo, Capricorn) are grounded, Air signs (Gemini, Libra, Aquarius) are intellectual, and Water signs (Cancer, Scorpio, Pisces) are emotional.';
    }
    
    // Career and Success
    if (lower.match(/\b(career|job|business|success|promotion|work)\b/)) {
        return 'Career success in astrology depends on the 10th house (career) and planetary aspects. Saturn promotes hard work, Mercury aids communication skills, and Jupiter brings expansion. Check your kundli for these placements to understand your professional path.';
    }
    
    // Love and Relationships
    if (lower.match(/\b(love|relationship|marriage|romance|partner|spouse|dating)\b/)) {
        return 'Love and relationships are shown in the 7th house (partnerships) and Venus placement in your kundli. Venus rules romance and relationships. Mars shows passion, while the Moon sign affects emotional compatibility. Ask about your specific sign or planetary placements!';
    }
    
    // Money and Finance
    if (lower.match(/\b(money|finance|wealth|financial|income|business|prosperity)\b/)) {
        return 'Financial abundance is indicated by the 2nd house (wealth) and 11th house (gains). Jupiter brings prosperity, while Saturn teaches financial discipline. The Sun shows earning potential. Venus in the 2nd house brings material comfort. Generate your kundli to see your wealth indicators!';
    }
    
    // Health Questions
    if (lower.match(/\b(health|disease|illness|sick|wellness|fitness)\b/)) {
        return 'Health in astrology relates to the 6th house (health) and the Moon\'s strength. Mars can indicate physical energy, Saturn shows chronic issues, and Jupiter gives healing. A strong 1st house ensures overall vitality. Consult your kundli for health indicators.';
    }
    
    // Moon Sign and Emotions
    if (lower.match(/\b(moon|moon sign|emotions|feelings|emotional)\b/)) {
        return 'Your Moon sign represents your inner emotional nature and subconscious mind. While your Sun sign is your identity, your Moon sign is your emotional world. The Moon also affects daily moods and is important in matching compatibility with partners.';
    }
    
    // Planets and Planetary Aspects
    if (lower.match(/\b(planet|mercury|venus|mars|jupiter|saturn|sun|moon|rahu|ketu|aspect)\b/)) {
        return 'Each planet governs different life areas: Sun (identity), Moon (emotions), Mercury (communication), Venus (love/beauty), Mars (action/courage), Jupiter (luck/growth), Saturn (discipline/karma), Rahu (ambition), Ketu (detachment). Their positions in your kundli reveal your strengths and challenges.';
    }
    
    // Houses in Kundli
    if (lower.match(/\b(house|1st house|2nd house|3rd house|4th house|5th house|6th house|7th house|8th house|9th house|10th house|11th house|12th house)\b/)) {
        return 'The 12 houses in a kundli represent different life areas: 1st (self), 2nd (wealth), 3rd (communication), 4th (home), 5th (creativity), 6th (health), 7th (relationships), 8th (transformation), 9th (spirituality), 10th (career), 11th (gains), 12th (liberation). Check your kundli to see their influence!';
    }
    
    // Predictions and Future
    if (lower.match(/\b(future|prediction|forecast|what will|what happen|will i)\b/)) {
        return 'Astrological predictions depend on your complete birth chart including planetary transits and dasha periods. For accurate predictions, generate your kundli and look for current planetary movements affecting your chart. Major life events often occur during significant planetary transits.';
    }
    
    // Compatibility and Matching
    if (lower.match(/\b(compatible|compatibility|match|matching|suitable|right person)\b/)) {
        return 'Astrological compatibility (Kundli Milan) checks the matching of birth charts between two people, considering Moon signs, Venus placements, and overall chart harmony. The Guna matching system rates compatibility on an 36-point scale. A proper analysis requires both birth times and locations.';
    }
    
    // Yes/No Questions
    if (lower.match(/\b(yes|no|should i|can i|will i|is it)\b/) && (lower.includes('?') || lower.endsWith('?'))) {
        return 'Astrology shows possibilities, not certainties. Planetary influences provide guidance, but your free will and actions matter most. For specific yes/no questions, share more context about the situation so I can provide better astrological insights!';
    }
    
    // Default response
    return 'I am your Astro Assistant! I can help with questions about kundli, zodiac signs, birth charts, planetary positions, love, career, health, money, compatibility, and astrological guidance. What would you like to know?';
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/contact', contactRoutes);

// Set EJS as view engine
app.set('view engine', 'ejs');
app.engine('ejs', ejs.renderFile);
app.set('views', path.join(__dirname, 'Views'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'Public')));

// Middleware
// Note: JSON and URL-encoded middleware are already registered above before routes.

// Routes
app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.get('/dashboard', (req, res) => {
    res.render('index.ejs');
});

app.get('/kundligeneretor', (req, res) => {
    res.render('kundligeneretor.ejs', { kundliHtml: null, downloadEnabled: false, formData: {} });
});

app.post('/kundli', (req, res) => {
    console.log('POST /kundli body=', req.body);
    const { name, dob, time, place } = req.body;
    const formData = { name, dob, time, place };
    const kundliHtml = buildKundliHtml(formData);

    res.render('kundligeneretor.ejs', {
        kundliHtml,
        downloadEnabled: true,
        formData
    });
});

app.get('/kundli/pdf', (req, res) => {
    const { name, dob, time, place } = req.query;
    const kundliHtml = buildKundliPdfHtml({ name, dob, time, place });
    res.render('kundli-pdf.ejs', { kundliHtml });
});

app.get('/kundli/download', async (req, res) => {
    const { name, dob, time, place } = req.query;
    const url = `http://127.0.0.1:${PORT}/kundli/pdf?name=${encodeURIComponent(name || '')}&dob=${encodeURIComponent(dob || '')}&time=${encodeURIComponent(time || '')}&place=${encodeURIComponent(place || '')}`;

    try {
        console.log('Starting PDF generation for:', name);
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        console.log('Browser launched');
        
        const page = await browser.newPage();
        console.log('Page created');
        
        await page.goto(url, { waitUntil: 'networkidle0' });
        console.log('Page loaded');
        
        await page.waitForSelector('#pdfContent');
        console.log('PDF content found');
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
        });
        console.log('PDF generated, size:', pdfBuffer.length);
        
        await browser.close();
        console.log('Browser closed');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="kundli-' + name.replace(/\s+/g, '-') + '.pdf"');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF download generation failed:', error.message);
        console.error('Full error:', error);
        res.status(500).send('Unable to generate PDF: ' + error.message);
    }
});

app.get('/chatbot', (req, res) => {
    res.render('chatbot.ejs');
});

app.post('/api/chat', async (req, res) => {
    const message = req.body.message;
    if (!message) {
        return res.status(400).json({ error: 'Missing chat message' });
    }

    try {
        if (!process.env.OPENAI_API_KEY) {
            return res.json({ reply: getFallbackAnswer(message) });
        }

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { 
                    role: 'system', 
                    content: `You are an expert Astro Assistant chatbot with deep knowledge of Vedic and Western astrology. You provide friendly, insightful, and helpful answers about:
- Kundli (birth charts) and their interpretation
- Zodiac signs and their characteristics
- Planetary positions and their influence
- Natal chart analysis
- Astrological compatibility (Kundli Milan)
- Career, love, health, and financial guidance based on astrology
- Moon signs, Sun signs, Ascendants
- Houses in astrology (1st through 12th)
- Planetary transits and their effects
- Nakshatras and their significance
- Remedy suggestions based on astrological principles

Your style:
- Be conversational, warm, and encouraging
- Provide specific astrological insights when possible
- Encourage users to generate their own kundli for personalized insights
- Mention relevant astrological concepts naturally
- Keep answers concise but informative (150-200 words)
- When uncertain, suggest creating a kundli or consulting the kundli generator

Remember: Astrology provides guidance, not certainties. Always encourage positive action and personal growth.` 
                },
                { role: 'user', content: message }
            ],
            max_tokens: 250,
            temperature: 0.8,
        });

        const reply = response.choices?.[0]?.message?.content?.trim() || getFallbackAnswer(message);
        res.json({ reply });
    } catch (error) {
        console.error('Chat API error:', error?.message || error);
        res.json({ reply: getFallbackAnswer(message) });
    }
});

app.get('/astro', (req, res) => {
    res.render('astro.ejs');
});

app.get('/astro3d', (req, res) => {
    res.render('astro3d.ejs');
});

app.get('/auspicious', (req, res) => {
    res.render('auspicious.ejs');
});

app.get('/birthchart', (req, res) => {
    res.render('birthchart.ejs');
});

app.get('/kundlimilan', (req, res) => {
    res.render('kundlimilan.ejs');
});

app.get('/lunarconsellation', (req, res) => {
    res.render('lunarconsellation.ejs');
});

app.get('/marriage', (req, res) => {
    res.render('marriage.ejs');
});

app.get('/zodiac', (req, res) => {
    res.render('zodiac.ejs');
});

app.get('/', (req, res) => {
    res.redirect('/login');  // Redirect root to login
});

app.get('/contact', (req, res) => {
    res.render('contact.ejs');
});

app.get('/horoscope', (req, res) => {
    res.render('horoscope.ejs');
});

app.get('/zodiacc', (req, res) => {
    res.render('zodiacc.ejs');
});

app.get('/explorenow', (req, res) => {
    res.render('explorenow.ejs');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});