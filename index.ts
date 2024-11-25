import axios from 'axios';
import fs from 'fs';
import readline from 'readline';
import { generateRandomString } from './randomUtils'; // Impor fungsi random
import * as config from './config.json'; // Mengimpor file config.json
import chalk from 'chalk'; // Mengimpor pustaka chalk untuk warna teks

// ASCII Art yang ingin ditampilkan dengan warna
const asciiArt = chalk.blue(`
            __  __  __           _____                        _     _  _      ___    _  _   
           / / |  \\/  |         / ____|                      | |   | || |    / _ \\  | || |  
          / /  | \\  / |  _ __  | |  __   _   _    ___   ___  | |_  | || |_  | | | | | || |_ 
         / /   | |\\/| | | '__| | | |_ | | | | |  / _ \\ / __| | __| |__   _| | | | | |__   _|
    _   / /    | |  | | | |    | |__| | | |_| | |  __/ \\__ \\ | |_     | |   | |_| |    | |  
   (_) /_/     |_|  |_| |_|     \\_____|  \\__,_|  \\___| |___/  \\__|    |_|    \\___/     |_|  
`);

// Membaca input dari command line untuk memilih file
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi untuk membaca URL Web App dari file smtp.txt
function getWebAppUrls(): string[] {
  const smtpFile = fs.readFileSync('smtp.txt', 'utf-8');
  return smtpFile.split('\n').map(url => url.trim()).filter(url => url);
}

// Fungsi untuk mengirim email secara paralel
async function sendEmails(emailList: string[]): Promise<void> {
  const webAppUrls = getWebAppUrls();
  const limitPerApp = 1400;
  const chunkSize = Math.min(limitPerApp, Math.ceil(emailList.length / webAppUrls.length));

  const sendEmailsForWebApp = async (webAppUrl: string, emails: string[], index: number): Promise<void> => {
    for (const email of emails) {
      try {
        // Menggunakan fungsi dari randomUtils.ts untuk menghasilkan random string
        const randomID = generateRandomString(7, 'alphanumeric'); // Random alphanumeric
        const randomUppercase = generateRandomString(5, 'uppercase'); // Random uppercase
        const randomLowercase = generateRandomString(4, 'lowercase'); // Random lowercase
        const randomNumber = generateRandomString(10, 'numeric'); // Random numeric (angka)

        // Template Subjek dengan random strings
        const dynamicSubject = config.subjectTemplate
          .replace(/{email}/g, email)
          .replace(/{randomID:\d+}/g, randomID)
          .replace(/{randomUppercase:\d+}/g, randomUppercase)
          .replace(/{randomLowercase:\d+}/g, randomLowercase)
          .replace(/{randomNumber:\d+}/g, randomNumber); // Ganti {randomNumber:10} dengan angka acak

        // Hanya menampilkan nomor baris dari URL WebApp
        console.log(chalk.black(`To: ${email}, Using WebApp #${index + 1}, Subject: ${dynamicSubject}`));

        await axios.get(webAppUrl, {
          params: {
            to: email,
            from: config.fromName,
            subject: dynamicSubject,
          },
        });

        console.log(chalk.green(`Email Sent to: ${email}`)); // Warna hijau untuk email yang terkirim
      } catch (error) {
        console.error(chalk.red(`Failed to Send: ${email}: ${error.message}`)); // Warna merah untuk kegagalan
      }
    }
  };

  const promises = webAppUrls.map((webAppUrl, index) => {
    const chunkStart = index * chunkSize;
    const chunkEnd = chunkStart + chunkSize;
    const emailChunk = emailList.slice(chunkStart, chunkEnd);
    return sendEmailsForWebApp(webAppUrl, emailChunk, index); // Pass the index here
  });

  await Promise.all(promises);
  console.log(chalk.blue('All Mail Sent By ./MrGuest404 Sender.')); // Warna biru untuk pesan akhir
}

// Fungsi untuk memilih daftar email dari input pengguna
function promptForEmailList(): void {
  console.log(asciiArt);  // Menampilkan ASCII Art dengan warna

  rl.question('Your List Name (example list.txt): ', (fileName) => {
    try {
      const emailList = fs.readFileSync(fileName, 'utf-8').split('\n').map(email => email.trim());
      console.log(chalk.green(`Your List Is VALID ${fileName}`)); // Warna hijau untuk daftar valid
      sendEmails(emailList).catch(console.error).finally(() => rl.close());
    } catch (error) {
      console.error(chalk.red(`Error read file: ${fileName} - ${error.message}`)); // Warna merah untuk error
      rl.close();
    }
  });
}

// Jalankan prompt untuk memilih daftar email
promptForEmailList();
