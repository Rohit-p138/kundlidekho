const http = require('http');
const fs = require('fs');

function postKundli(data) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(data).toString();
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: '/kundli',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function downloadPdf(urlPath, outFile) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3000,
      path: urlPath,
      method: 'GET'
    };
    const file = fs.createWriteStream(outFile);
    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error('Bad status: ' + res.statusCode));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    });
    req.on('error', (err) => {
      fs.unlink(outFile, () => reject(err));
    });
    req.end();
  });
}

(async () => {
  try {
    console.log('Posting form to /kundli...');
    const html = await postKundli({ name: 'Test', dob: '1990-01-01', time: '00:00', place: 'Test' });
    fs.writeFileSync('response_preview.html', html, 'utf8');
    console.log('Saved response_preview.html (' + html.length + ' bytes)');
    console.log('Contains preview title?', html.includes('Kundli Preview for'));
    console.log('Contains download link?', html.includes('Download Kundli as PDF'));

    console.log('Requesting /kundli/download to save kundli_test.pdf (this may take a few seconds)...');
    await downloadPdf('/kundli/download?name=Test&dob=1990-01-01&time=00%3A00&place=Test', 'kundli_test.pdf');
    const s = fs.statSync('kundli_test.pdf');
    console.log('Saved kundli_test.pdf size:', s.size, 'bytes');
    console.log('All checks completed.');
  } catch (err) {
    console.error('Test failed:', err.message || err);
    process.exit(2);
  }
})();
