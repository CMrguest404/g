import axios from 'axios';
import fs from 'fs';
import readline from 'readline';
import { generateRandomString } from './randomUtils'; // Import random function
import * as config from './config.json'; // Import config.json file
import chalk from 'chalk'; // Import chalk for colored text

// ASCII Art to display with color
const asciiArt = chalk.blue(`
            __  __  __           _____                        _     _  _      ___    _  _   
           / / |  \\/  |         / ____|                      | |   | || |    / _ \\  | || |  
          / /  | \\  / |  _ __  | |  __   _   _    ___   ___  | |_  | || |_  | | | | | || |_ 
         / /   | |\\/| | | '__| | | |_ | | | | |  / _ \\ / __| | __| |__   _| | | | | |__   _|
    _   / /    | |  | | | |    | |__| | | |_| | |  __/ \\__ \\ | |_     | |   | |_| |    | |  
   (_) /_/     |_|  |_| |_|     \\_____|  \\__,_|  \\___| |___/  \\__|    |_|    \\___/     |_|  
 
   Powered by 4.0 Keep Running if some user limit,inc remove email sent,stop if all user limit
`);

// Create the interface to read user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Global variables to track sent and remaining email count
let globalSentCount = 0;
let globalRemainingCount = 0;

// Variables to count success, failure, and WebApp rate limits
let successCount = 0;
let failureCount = 0;
let webAppLimitReached = new Set<number>(); // Set to store WebApp indices that hit rate limit

// Function to read Web App URLs from smtp.txt
function getWebAppUrls(): string[] {
  const smtpFile = fs.readFileSync('smtp.txt', 'utf-8');
  return smtpFile.split('\n').map((url) => url.trim()).filter((url) => url);
}

// Function to read email list from a file
function getEmailList(fileName: string): string[] {
  const emailList = fs.readFileSync(fileName, 'utf-8').split('\n').map((email) => email.trim()).filter((email) => email);
  globalRemainingCount = emailList.length;
  return emailList;
}

// Function to remove email from the list after it's sent
function removeEmailFromList(fileName: string, emailToRemove: string): void {
  if (config.deleteSentEmails) {  // Only delete if config says so
    let emailList = getEmailList(fileName);
    emailList = emailList.filter((email) => email !== emailToRemove); // Remove sent email
    fs.writeFileSync(fileName, emailList.join('\n'), 'utf-8'); // Write the updated list to file
  }
}

// Function to generate dynamic file name
function generateFileName(): string {
  const randomID = generateRandomString(7, 'alphanumeric');
  const randomUppercase = generateRandomString(5, 'uppercase');
  const randomLowercase = generateRandomString(4, 'lowercase');

  // Use config setting to allow dynamic file names based on template
  let fileName = config.newFileNameTemplate
    .replace(/{randomID:\d+}/g, randomID)
    .replace(/{randomUppercase:\d+}/g, randomUppercase)
    .replace(/{randomLowercase:\d+}/g, randomLowercase);
  
  return fileName || 'defaultFileName.pdf'; // Default if no template is found
}

// Function to send emails to the Web Apps
async function sendEmails(emailList: string[], fileName: string): Promise<void> {
  const webAppUrls = getWebAppUrls();
  const limitPerApp = 1400;
  const chunkSize = Math.min(limitPerApp, Math.ceil(emailList.length / webAppUrls.length));

  const sendEmailsForWebApp = async (webAppUrl: string, emails: string[], index: number): Promise<void> => {
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      // If WebApp is rate-limited, skip sending
      if (webAppLimitReached.has(index)) {
        console.log(chalk.yellow(`WebApp #${index + 1} already rate-limited. Skipping email ${email}`));
        continue;
      }

      try {
        // Generate random strings for dynamic email subject
        const randomID = generateRandomString(7, 'alphanumeric');
        const randomUppercase = generateRandomString(5, 'uppercase');
        const randomLowercase = generateRandomString(4, 'lowercase');
        const randomNumber = generateRandomString(10, 'numeric');

        // Build the dynamic subject using the random strings
        const dynamicSubject = config.subjectTemplate
          .replace(/{email}/g, email)
          .replace(/{randomID:\d+}/g, randomID)
          .replace(/{randomUppercase:\d+}/g, randomUppercase)
          .replace(/{randomLowercase:\d+}/g, randomLowercase)
          .replace(/{randomNumber:\d+}/g, randomNumber);

                  // Build the dynamic ReplyTO using the random strings

                  // Build the dynamic ReplyTO using the random strings
        const dynamicReplyto = config.replyToTemplate
        .replace(/{email}/g, email)
        .replace(/{randomID:\d+}/g, randomID)
        .replace(/{randomUppercase:\d+}/g, randomUppercase)
        .replace(/{randomLowercase:\d+}/g, randomLowercase)
        .replace(/{randomNumber:\d+}/g, randomNumber);

        // Log the email details being sent
        console.log(chalk.blue(`To: ${email}, WebApp #${index + 1}, Subject: ${dynamicSubject}`));

        // Generate file name dynamically
        const fileNameForAttachment = generateFileName();

        // Send email request to the WebApp
        await axios.get(webAppUrl, {
          params: {
            to: email,
            subject: dynamicSubject,
            fromName: config.fromName, // Ensure UTF-8 encoding for 'from' name
            replyTo: dynamicReplyto,
            attachment: config.enableAttachment ? 'true' : 'false',  // Conditionally attach file
            newFileName: fileNameForAttachment, // Attach renamed file
            htmlFileId: config.letter,
            imageFileId: config.ImageBase64,
            attachmentFileId: config.attachment,
          },
        });

        // Increment counters and update status
        successCount++;
        globalSentCount++;
        globalRemainingCount--;

        // Optionally remove email from list after it's sent
        removeEmailFromList(fileName, email);

        // Log success
        console.log(chalk.green(`Email Sent to: ${email}`));
      } catch (error) {
        if (error.response && error.response.status === 429) { // Check for rate-limit error (HTTP 429)
          console.error(chalk.red(`WebApp #${index + 1} rate limit reached: ${error.message}`));
          webAppLimitReached.add(index); // Mark WebApp as rate-limited
          break; // Break the loop if rate limit is hit
        } else {
          failureCount++;
          console.error(chalk.red(`Failed to Send: ${email} from WebApp #${index + 1}: ${error.message}`));
        }
      }
    }
  };

  const promises = webAppUrls.map((webAppUrl, index) => {
    const chunkStart = index * chunkSize;
    const chunkEnd = chunkStart + chunkSize;
    const emailChunk = emailList.slice(chunkStart, chunkEnd);
    return sendEmailsForWebApp(webAppUrl, emailChunk, index);
  });

  // Continue sending emails until all emails are sent or all WebApps are rate-limited
  while (globalRemainingCount > 0 && webAppLimitReached.size < webAppUrls.length) {
    await Promise.allSettled(promises); // Ensure that all promises are handled
  }

  // Recap after sending process
  const remainingEmails = getEmailList(fileName).length;
  console.log(chalk.blue('\n=== Email Delivery Recap ==='));
  console.log(chalk.green(`Total Success: ${successCount}`));
  console.log(chalk.red(`Total Failed: ${failureCount}`));
  console.log(chalk.yellow(`Total Undelivered: ${remainingEmails}`));
  console.log(chalk.blue('Sent By ./MrGuest404 Sender.'));
}

// Function to prompt the user for email list
function promptForEmailList(): void {
  console.log(asciiArt);  // Display ASCII art with color

  rl.question('Your List Name (example list.txt): ', (fileName) => {
    try {
      let emailList = getEmailList(fileName);
      console.log(chalk.green(`Your list is VALID ${fileName}`)); // Log if the list is valid
      sendEmails(emailList, fileName).catch(console.error).finally(() => rl.close());
    } catch (error) {
      console.error(chalk.red(`Error reading file: ${fileName} - ${error.message}`)); // Log error if file cannot be read
      rl.close();
    }
  });
}

// Start the email sending process
promptForEmailList();
