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
 
   Powered by 4.0 Keep Running if some user limit,inc remove email sent
   `);

// Membaca input dari command line untuk memilih file
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Variabel global untuk total email yang terkirim dan yang tersisa
let globalSentCount = 0;
let globalRemainingCount = 0;

// Variabel untuk menghitung jumlah email berhasil dan gagal
let successCount = 0;
let failureCount = 0;

// Fungsi untuk membaca URL Web App dari file smtp.txt
function getWebAppUrls(): string[] {
  const smtpFile = fs.readFileSync('smtp.txt', 'utf-8');
  return smtpFile.split('\n').map((url) => url.trim()).filter((url) => url);
}

// Fungsi untuk membaca daftar email dari file dan memperbarui file
function getEmailList(fileName: string): string[] {
  const emailList = fs.readFileSync(fileName, 'utf-8').split('\n').map((email) => email.trim()).filter((email) => email);
  globalRemainingCount = emailList.length;
  return emailList;
}

// Fungsi untuk menghapus email yang sudah terkirim dari file
function removeEmailFromList(fileName: string, emailToRemove: string): void {
  let emailList = getEmailList(fileName);
  emailList = emailList.filter((email) => email !== emailToRemove); // Menghapus email yang sudah terkirim
  fs.writeFileSync(fileName, emailList.join('\n'), 'utf-8'); // Menulis kembali daftar email ke file
}

// Fungsi untuk mengirim email secara paralel
async function sendEmails(emailList: string[], fileName: string): Promise<void> {
  const webAppUrls = getWebAppUrls();
  const limitPerApp = 1400;
  const chunkSize = Math.min(limitPerApp, Math.ceil(emailList.length / webAppUrls.length));

  const sendEmailsForWebApp = async (webAppUrl: string, emails: string[], index: number): Promise<void> => {
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

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

        // Menampilkan informasi log untuk email yang dikirim
        console.log(chalk.blue(`To: ${email}, WebApp #${index + 1}, Subject: ${dynamicSubject}`));
        
        await axios.get(webAppUrl, {
          params: {
            to: email,
            from: config.fromName,
            subject: dynamicSubject,
          },
        });

        // Update global counters
        globalSentCount++;
        globalRemainingCount--;
        successCount++;

        // Menghapus email dari file setelah terkirim
        removeEmailFromList(fileName, email); // Hapus email yang sudah terkirim dari file

        // Menampilkan hanya email yang terkirim
        console.log(chalk.green(`Email Sent to: ${email}`));
        console.log(chalk.blue(`Global Sent: ${globalSentCount}, Global Remaining: ${globalRemainingCount}`));
      } catch (error) {
        failureCount++;
        console.error(chalk.red(`Failed to Send: ${email} from WebApp #${index + 1}: ${error.message}`));
      }
    }
  };

  const promises = webAppUrls.map((webAppUrl, index) => {
    const chunkStart = index * chunkSize;
    const chunkEnd = chunkStart + chunkSize;
    const emailChunk = emailList.slice(chunkStart, chunkEnd);
    return sendEmailsForWebApp(webAppUrl, emailChunk, index); // Pass the index here
  });

  await Promise.allSettled(promises);

  // Rekapitulasi setelah semua selesai
  console.log(chalk.blue('\n=== Email Delivery Recapitulation ==='));
  console.log(chalk.green(`Total Success: ${successCount}`));
  console.log(chalk.red(`Total Fail: ${failureCount}`));
  console.log(chalk.blue('Sent By ./MrGuest404 Sender.'));
}

// Fungsi untuk memilih daftar email dari input pengguna
function promptForEmailList(): void {
  console.log(asciiArt);  // Menampilkan ASCII Art dengan warna

  rl.question('Your List Name (example list.txt): ', (fileName) => {
    try {
      let emailList = getEmailList(fileName);
      console.log(chalk.green(`Your List Is VALID ${fileName}`)); // Warna hijau untuk daftar valid
      sendEmails(emailList, fileName).catch(console.error).finally(() => rl.close());
    } catch (error) {
      console.error(chalk.red(`Error read file: ${fileName} - ${error.message}`)); // Warna merah untuk error
      rl.close();
    }
  });
}

// Jalankan prompt untuk memilih daftar email
promptForEmailList();
