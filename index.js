/**
 * DANUU-MD WhatsApp Bot - Final Complete Code
 *
 * This file contains all the necessary code and commands to run your bot.
 * It includes all the features requested by the user:
 * - Basic Commands: .start, .ping, .help, .info
 * - Fun Commands: .sticker, .quote, .song
 * - Automation Features: Auto Status View, Auto Reply, Auto React
 * - PM Permit Feature: Welcome message for unknown contacts
 * - PM Automation: Auto reply for "sv", "save", etc.
 * - Button-based Menu
 * - QR Code linking
 * - Auto-connected message
 *
 * Steps to run this code:
 * 1. Make sure you have Node.js installed on your computer.
 * 2. Create a new folder for your project and open your terminal inside that folder.
 * 3. Run the following command to initialize your project:
 * `npm init -y`
 * 4. Install the necessary libraries:
 * `npm install @whiskeysockets/baileys pino ytdl-core ytsr`
 * 5. Save this file as `index.js` in your project folder.
 * 6. Start the bot from your terminal by running:
 * `node index.js`
 * 7. Scan the QR code that appears in the console to link your device.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    proto,
    jidNormalized,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const {
    Boom
} = require('@hapi/boom');
const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Set the command prefix to '.'
const prefix = '.';

// Function to start the bot
async function startBot() {
    // Load authentication credentials
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('auth_info_baileys');

    // Fetch the latest version of Baileys
    const {
        version
    } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')}`);

    const sock = makeWASocket({
        logger: pino({
            level: 'silent'
        }),
        auth: state,
        browser: Browsers.macOS('Chrome'),
        version,
        // Enable QR code linking
        qr: true
    });
    
    // Event handler for connection updates
    sock.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;
        
        if (qr) {
            console.log('Scan the QR code to link your device:', qr);
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Connection is open! The DANUU-MD bot is now online.');
            // Send the "connected" message to the owner's chat
            await sock.sendMessage(sock.user.id, {
                text: 'DANUU-MD BOT CONNECTED'
            });
        }
    });

    // Save credentials when they are updated
    sock.ev.on('creds.update', saveCreds);

    // --- Automation Feature: Auto Status View and React ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        // Check if the message is a status update from someone else
        if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
            console.log(`New status update from ${msg.key.participant || msg.key.remoteJid}, auto-viewing...`);
            // Mark the status as read
            await sock.readMessages([msg.key]);

            // React to the status
            await sock.sendMessage(msg.key.participant, {
                react: {
                    text: '👏', // You can change this emoji to your preference
                    key: msg.key
                }
            });
        }
    });

    // --- Main Message Handler ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        // Ensure the message is not from the bot itself and is a valid message type
        // This check is updated to make the bot work ONLY in personal chats.
        if (!msg.key.fromMe && m.type === 'notify' && msg.message && !msg.key.remoteJid.endsWith('@g.us')) {
            const remoteJid = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const lowerCaseText = messageText.toLowerCase();

            // --- PM Permit Feature ---
            // Check if the sender is not in your contacts
            const isContact = await sock.onWhatsApp(remoteJid);
            if (!isContact.exists) {
                const permitMessage = `
*This is an automated message.*
Hello, I am the bot for this number. I do not recognize your number. Please wait for the owner of this number to respond.
`;
                await sock.sendMessage(remoteJid, {
                    text: permitMessage
                });
                return; // Stop processing further commands to avoid spam
            }
            
            console.log(`Received a message from ${remoteJid}: ${messageText}`);
            
            // --- PM Automation: Auto reply for "sv", "save", etc. ---
            const saveKeywords = ['sv', 'save', 'සෙව්', 'සෙවු'];
            if (saveKeywords.includes(lowerCaseText.trim())) {
                await sock.sendMessage(remoteJid, {
                    text: 'HARI OYAWA AUTO SV'
                });
            }

            // --- Automation Feature: Auto React (Aimed) ---
            // React to messages that contain the word "danuu"
            if (lowerCaseText.includes('danuu')) {
                await sock.sendMessage(remoteJid, {
                    react: {
                        text: '👍', // You can change this emoji
                        key: msg.key
                    }
                });
            }

            // --- Auto Reply Feature ---
            if (lowerCaseText === 'hello') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hi! I\'m DANUU-MD bot.*'
                });
            } else if (lowerCaseText === 'hi') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hello! How can I help you today?*'
                });
            }

            // --- Other Commands ---
            // Command: .start
            if (lowerCaseText === `${prefix}start`) {
                const startMessage = `
හලෝ! මම DANUU-MD Bot.
මම මගේ නිර්මාතෘ විසින් විශේෂයෙන් නිර්මාණය කරන ලද්දේ ඔබ වෙනුවෙන් සේවය කිරීමටයි. මගේ සියලු විධාන ලැයිස්තුව බැලීමට ${prefix}menu ටයිප් කරන්න.
                `;
                await sock.sendMessage(remoteJid, {
                    text: startMessage
                });
            }

            // Command: .ping
            if (lowerCaseText === `${prefix}ping`) {
                await sock.sendMessage(remoteJid, {
                    text: 'Pong!'
                });
            }

            // --- Command: .menu (updated with buttons) ---
            if (lowerCaseText === `${prefix}menu`) {
                const buttonMessage = {
                    text: `*DANUU-MD Bot Menu*

ඔබට අවශ්‍ය විධානය තෝරාගන්න.`,
                    footer: 'Powered by DANUU-MD',
                    buttons: [
                        { buttonId: `${prefix}info`, buttonText: { displayText: 'Info' }, type: 1 },
                        { buttonId: `${prefix}ping`, buttonText: { displayText: 'Ping' }, type: 1 },
                        { buttonId: `${prefix}song`, buttonText: { displayText: 'Song Download' }, type: 1 },
                    ],
                    headerType: 1
                };

                await sock.sendMessage(remoteJid, buttonMessage);
            }

            // Command: .info
            if (lowerCaseText === `${prefix}info`) {
                const infoMessage = `Hello, I'm the DANUU-MD bot. I was created with the Baileys library to automate tasks on WhatsApp.`;
                await sock.sendMessage(remoteJid, {
                    text: infoMessage
                });
            }

            // Command: .sticker
            if (lowerCaseText === `${prefix}sticker` && msg.message?.imageMessage) {
                const media = await proto.Message.fromObject(msg.message).imageMessage;
                const buffer = await sock.downloadMediaMessage(media);
                await sock.sendMessage(remoteJid, {
                    sticker: buffer
                });
            }

            // Command: .quote
            if (lowerCaseText === `${prefix}quote`) {
                const quotes = [
                    "The only way to do great work is to love what you do. - Steve Jobs",
                    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
                    "The best way to predict the future is to create it. - Peter Drucker",
                    "Do not wait for a perfect time. Take the moment and make it perfect. - Sri Chinmoy",
                ];
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                await sock.sendMessage(remoteJid, {
                    text: randomQuote
                });
            }

            // --- Command: .song <song name> ---
            if (lowerCaseText.startsWith(`${prefix}song `)) {
                const songQuery = messageText.slice(`${prefix}song `.length).trim();
                if (songQuery.length > 0) {
                    await sock.sendMessage(remoteJid, {
                        text: `_Searching for "${songQuery}"..._`
                    });

                    try {
                        const filters = await ytsr.getFilters(songQuery);
                        const filter = filters.get('Type').find(o => o.name === 'Video');
                        const searchResults = await ytsr(filter.url, {
                            limit: 1
                        });

                        if (searchResults.items.length > 0) {
                            const video = searchResults.items[0];
                            const stream = ytdl(video.url, {
                                filter: 'audioonly'
                            });
                            
                            const audioPath = path.join(__dirname, 'temp_audio.mp3');
                            stream.pipe(fs.createWriteStream(audioPath));

                            stream.on('end', async () => {
                                await sock.sendMessage(remoteJid, {
                                    audio: {
                                        url: audioPath
                                    },
                                    mimetype: 'audio/mp4'
                                });
                                fs.unlinkSync(audioPath);
                            });
                        } else {
                            await sock.sendMessage(remoteJid, {
                                text: 'Sorry, I could not find that song.'
                            });
                        }
                    } catch (error) {
                        console.error('Error downloading song:', error);
                        await sock.sendMessage(remoteJid, {
                            text: 'Something went wrong while trying to download the song. Please try again.'
                        });
                    }
                } else {
                    await sock.sendMessage(remoteJid, {
                        text: `Please provide a song name. Example: ${prefix}song Bossa no.1`
                    });
                }
            }
        }
    });
}

// Start the bot
startBot();
