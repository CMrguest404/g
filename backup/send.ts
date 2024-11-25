const axios = require('axios');
const fs = require('fs');

// Fungsi untuk membuat random string angka dengan panjang tertentu
function generateRandomNumberString(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

// Fungsi untuk membaca URL Web App dari file smtp.txt
function getWebAppUrls() {
  const smtpFile = fs.readFileSync('smtp.txt', 'utf-8');
  return smtpFile.split('\n').map(url => url.trim()).filter(url => url);
}

// Fungsi untuk mengirim email secara paralel
async function sendEmails() {
  const webAppUrls = getWebAppUrls();
  const emailList = fs.readFileSync('list.txt', 'utf-8').split('\n').map(email => email.trim());
  
  const limitPerApp = 1400; // Batas pengiriman email per Web App
  const chunkSize = Math.min(limitPerApp, Math.ceil(emailList.length / webAppUrls.length));

  // Fungsi untuk mengirim email menggunakan satu Web App
  const sendEmailsForWebApp = async (webAppUrl, emails) => {
    for (const email of emails) {
      try {
        // Subjek dinamis dengan email dan random number
        const randomNumber = generateRandomNumberString(5); // Panjang random number 5
        const dynamicSubject = `Account Update (${email}) [ID: ${randomNumber}]`;

        console.log(`To: ${email}, Using: ${webAppUrl}, Subject: ${dynamicSubject}`);

        await axios.get(webAppUrl, {
          params: {
            to: email,
            from: 'Amazon Service',
            subject: dynamicSubject, // Gunakan subjek dinamis di sini
          },
        });

        console.log(`Email Sent to: ${email}`);
      } catch (error) {
        console.error(`Failed to Send: ${email}: ${error.message}`);
      }
    }
  };

  // Membagi email ke dalam chunk dan mengirimkan secara paralel
  const promises = webAppUrls.map((webAppUrl, index) => {
    const chunkStart = index * chunkSize;
    const chunkEnd = chunkStart + chunkSize;
    const emailChunk = emailList.slice(chunkStart, chunkEnd);

    return sendEmailsForWebApp(webAppUrl, emailChunk);
  });

  await Promise.all(promises);
  console.log('Semua email telah dikirim dari ./MrGuest404 Sender.');
}

// Jalankan pengiriman email
sendEmails();
