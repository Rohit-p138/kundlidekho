const cp = require('child_process');
const http = require('http');
const fs = require('fs');

function waitForOutput(proc, match, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; reject(new Error('Timeout waiting for output: ' + match)); proc.kill(); } }, timeout);
    proc.stdout.on('data', (d) => {
      const s = (d||'').toString();
      process.stdout.write(s);
      if (!done && s.includes(match)) { done = true; clearTimeout(timer); resolve(); }
    });
    proc.stderr.on('data', (d) => process.stderr.write(d.toString()));
    proc.on('exit', (code) => { if (!done) { done = true; clearTimeout(timer); reject(new Error('Server exited with code ' + code)); } });
  });
}

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
  // Start server as child process
  const server = cp.spawn(process.execPath, ['index.js'], { cwd: process.cwd(), env: process.env });
  try {
    await waitForOutput(server, 'Server is running on');
    console.log('\nServer started — running tests...');
    const html = await postKundli({ name: 'Test', dob: '1990-01-01', time: '00:00', place: 'Test' });
    fs.writeFileSync('response_preview.html', html, 'utf8');
    console.log('Saved response_preview.html (' + html.length + ' bytes)');
    console.log('Contains preview title?', html.includes('Kundli Preview for'));
    console.log('Contains download link?', html.includes('Download Kundli as PDF'));

    console.log('Downloading PDF to kundli_test.pdf (may take a few seconds)...');
    await downloadPdf('/kundli/download?name=Test&dob=1990-01-01&time=00%3A00&place=Test', 'kundli_test.pdf');
    const s = fs.statSync('kundli_test.pdf');
    console.log('Saved kundli_test.pdf size:', s.size, 'bytes');
    console.log('ALL CHECKS PASSED');
  } catch (err) {
    console.error('Test error:', err && err.message ? err.message : err);
  } finally {
    server.kill();
  }
})();
