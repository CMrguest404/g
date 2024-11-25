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
  
  const limitPerApp = 1400;
  const chunkSize = Math.ceil(emailList.length / webAppUrls.length);

  // Fungsi untuk mengirim email menggunakan satu Web App
  const sendEmailsForWebApp = async (webAppUrl, emails) => {
    for (const email of emails) {
      try {
        // Generate random string untuk subject
        const randomSubject = `Your Account Details Have Been Updated (xMail: ${generateRandomNumberString(7)})`; //`Information About Account Status Update (Customer ID: ${generateRandomNumberString(7)})`

        console.log(`To ${email} With ${webAppUrl} Subject: ${randomSubject}`);

        await axios.get(webAppUrl, {
          params: {
            to: email,
            from: 'Amazon Service',
            subject: randomSubject, // Gunakan random string di sini
          },
        });

        console.log(`Email Sent to: ${email}`);
      } catch (error) {
        console.error(`Failed To Sent: ${email}: ${error.message}`);
      }
    }
  };

  // Membagi email ke dalam chunk dan mengirimkan secara paralel
  const promises = webAppUrls.map((webAppUrl, index) =>
    sendEmailsForWebApp(webAppUrl, emailList.slice(index * chunkSize, (index + 1) * chunkSize))
  );

  await Promise.all(promises);
  console.log('Semua email telah dikirim dari ./MrGuest404 Sender.');
}

// Jalankan pengiriman email
sendEmails();
