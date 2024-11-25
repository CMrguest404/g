import axios from 'axios';
import fs from 'fs';
import readline from 'readline';
import { generateRandomString } from './randomUtils'; // Impor fungsi random
import * as config from './config.json'; // Mengimpor file config.json
import chalk from 'chalk'; // Mengimpor pustaka chalk untuk warna
import { default as pLimit } from 'p-limit'; // Mengimpor p-limit untuk membatasi jumlah thread

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

// Fungsi untuk memilih daftar email dari input pengguna
function promptForEmailList(): void {
  console.log(asciiArt);  // Menampilkan ASCII Art dengan warna

  rl.question('Your List Name (example list.txt): ', (fileName) => {
    try {
      const emailList = fs.readFileSync(fileName, 'utf-8').split('\n').map(email => email.trim());
      console.log(chalk.green(`Your List Is VALID ${fileName}`)); // Warna hijau untuk daftar valid
      sendEmails(emailList, fileName).catch(console.error).finally(() => rl.close());
    } catch (error) {
      console.error(chalk.red(`Error reading file: ${fileName} - ${error.message}`)); // Warna merah untuk error
      rl.close();
    }
  });
}

// Fungsi untuk mengirim email dan menghapus yang sudah terkirim dari file
async function sendEmails(emailList: string[], fileName: string): Promise<void> {
  const totalEmails = emailList.length;
  let sentCount = 0;  // Hitung jumlah email yang terkirim
  let remainingCount = totalEmails;  // Sisa email yang belum terkirim
  
  console.log(`Starting email sending process...`);
  console.log(`Total emails to be sent: ${totalEmails}`);

  // Menggunakan p-limit untuk membatasi 10 thread per user
  const limit = pLimit(10);

  // Membuat daftar promises untuk pengiriman email
  const emailPromises = emailList.map(email => {
    return limit(async () => {
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
        console.log(chalk.blue(`To: ${email}, Subject: ${dynamicSubject}`));

        // Mengirim email
        await axios.get('https://example.com/send-email', { // Ganti dengan URL WebApp Anda
          params: {
            to: email,
            from: config.fromName,
            subject: dynamicSubject,
          }
        });

        // Jika email berhasil dikirim, hapus dari file
        removeEmailFromFile(fileName, email);
        sentCount++;
        remainingCount--;
        console.log(chalk.green(`Email Sent to: ${email}`)); // Email berhasil terkirim
      } catch (error) {
        console.error(chalk.red(`Failed to send email to: ${email} - Error: ${error.message}`)); // Email gagal terkirim
      }

      // Menampilkan status pengiriman
      console.log(`Sent: ${sentCount}, Remaining: ${remainingCount}`);
    });
  });

  // Menunggu semua email dikirim
  await Promise.all(emailPromises);

  console.log(chalk.blue('All Mail Sent By ./MrGuest404 Sender.'));
  console.log(chalk.green(`Total Sent: ${sentCount}`));
  console.log(chalk.red(`Total Remaining: ${remainingCount}`));
}

// Fungsi untuk menghapus email dari file .txt
function removeEmailFromFile(fileName: string, email: string): void {
  const emailList = fs.readFileSync(fileName, 'utf-8').split('\n').map(line => line.trim());
  const updatedList = emailList.filter(item => item !== email); // Menghapus email yang sudah terkirim
  fs.writeFileSync(fileName, updatedList.join('\n'), 'utf-8'); // Menyimpan daftar email yang tersisa
}

// Jalankan prompt untuk memilih daftar email
promptForEmailList();
