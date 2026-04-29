const express = require('express');
const path = require('path');
const ejs = require('ejs');
const methodOverride = require('method-override');
const contactRoutes = require('./Public/contactroutes');

const app = express();
app.use(methodOverride('_method'));
const port = 3000;

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
    res.render('kundligeneretor.ejs');
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});