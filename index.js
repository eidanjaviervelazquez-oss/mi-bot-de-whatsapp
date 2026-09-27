const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Evento cuando se genera el código QR (se mostrará en los logs de Render)
client.on('qr', (qr) => {
    console.log('Escanea este código QR desde tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Evento cuando el bot está listo y conectado
client.on('ready', () => {
    console.log('--------------------------------------------------');
    console.log('¡Bot activado y funcionando en Render correctamente!');
    console.log('Creado por: Javier la cabra 🐐');
    console.log('--------------------------------------------------');
});

// Escuchador de mensajes y comandos
client.on('message', async (message) => {
    try {
        const content = message.body ? message.body.trim() : '';
        const chat = await message.getChat();

        // 1. Comando !creditos
        if (content.toLowerCase() === '!creditos') {
            await message.reply('🤖 Bot creado por: Javier la cabra 🐐');
        }

        // 2. Comando !n (Mencionar a todos sin mostrar el @número)
        if (content.startsWith('!n ')) {
            if (!chat.isGroup) return message.reply('Este comando solo funciona en grupos.');
            
            const textToAnnounce = content.slice(3).trim();
            if (!textToAnnounce) return message.reply('Escribe el mensaje después del !n (Ejemplo: !n Hola a todos)');

            let mentions = [];
            for (let participant of chat.participants) {
                const contact = await client.getContactById(participant.id._serialized);
                mentions.push(contact);
            }

            await chat.sendMessage(textToAnnounce, { mentions });
        }

        // 3. Comando !s / !sticker / !steal (Robar o convertir sticker con tu marca)
        if (content.toLowerCase() === '!sticker' || content.toLowerCase() === '!s' || content.toLowerCase().startsWith('!steal')) {
            let targetMessage = message;
            
            if (message.hasQuotedMsg) {
                targetMessage = await message.getQuotedMessage();
            }

            if (targetMessage.hasMedia) {
                const media = await targetMessage.downloadMedia();
                if (media) {
                    await client.sendMessage(message.from, media, {
                        sendMediaAsSticker: true,
                        stickerName: 'Javier la cabra 🐐',
                        stickerAuthor: 'Javier la cabra 🐐'
                    });
                }
            } else {
                await message.reply('Responde a una imagen o sticker con el comando !s para ponerle tu marca.');
            }
        }

        // 4. Comandos !mute y !unmute
        if (content.toLowerCase() === '!mute') {
            if (!chat.isGroup) return message.reply('Este comando solo funciona en grupos.');
            await chat.setMessagesAdminsOnly(true);
            await message.reply('🔒 Grupo silenciado. Solo los administradores pueden enviar mensajes.');
        }

        if (content.toLowerCase() === '!unmute') {
            if (!chat.isGroup) return message.reply('Este comando solo funciona en grupos.');
            await chat.setMessagesAdminsOnly(false);
            await message.reply('🔓 Grupo desmutado. Todos los miembros pueden hablar.');
        }

        // 5. Comando !fantasmas (Detectar inactivos)
        if (content.toLowerCase() === '!fantasmas') {
            if (!chat.isGroup) return message.reply('Este comando solo funciona en grupos.');
            
            const messages = await chat.fetchMessages({ limit: 100 });
            const activeUsers = new Set(messages.map(m => m.author || m.from));
            
            let ghosts = [];
            for (let participant of chat.participants) {
                if (!activeUsers.has(participant.id._serialized)) {
                    ghosts.push(`@${participant.id.user}`);
                }
            }

            if (ghosts.length === 0) {
                await message.reply('👻 No se encontraron fantasmas en los últimos 100 mensajes.');
            } else {
                let replyText = `👻 *Fantasmas detectados (${ghosts.length}):*\n\n` + ghosts.join('\n');
                await message.reply(replyText);
            }
        }

        // 6. Comando !kickall (Modo emergencia: Expulsar a todos los no-admins)
        if (content.toLowerCase() === '!kickall') {
            if (!chat.isGroup) return message.reply('Este comando solo funciona en grupos.');
            
            await message.reply('⚠️ Iniciando protocolo de emergencia: Expulsando a todos los miembros...');
            
            for (let participant of chat.participants) {
                if (!participant.isAdmin && !participant.isSuperAdmin) {
                    try {
                        await chat.removeParticipants([participant.id._serialized]);
                    } catch (err) {
                        console.log(`No se pudo expulsar a ${participant.id.user}:`, err.message);
                    }
                }
            }
            await message.reply('✅ Limpieza completada por: Javier la cabra 🐐');
        }

    } catch (error) {
        console.error('Error procesando mensaje:', error);
    }
});

client.initialize();