const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Detección automática del ejecutable de Puppeteer para Render y Linux
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
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

// Mostrar código QR en los logs de Render
client.on('qr', (qr) => {
    console.log('--- ESCANEA ESTE CÓDIGO QR CON WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('✅ ¡El bot está en línea y funcionando 24/7 en Render!');
});

// Manejo de mensajes
client.on('message', async (message) => {
    const body = message.body.trim();
    const chat = await message.getChat();

    // --- COMANDO !s / !sticker (Crear Stickers con Título y Creador) ---
    if (body.startsWith('!s') || body.startsWith('!sticker')) {
        let targetMessage = message;

        if (message.hasQuotedMsg) {
            targetMessage = await message.getQuotedMessage();
        }

        if (targetMessage.hasMedia) {
            try {
                const media = await targetMessage.downloadMedia();
                const args = body.split(' ').slice(1).join(' ');
                let stickerName = 'Bot de WhatsApp';
                let stickerAuthor = 'Javier la cabra';

                if (args.includes('|')) {
                    const parts = args.split('|');
                    stickerName = parts[0].trim() || stickerName;
                    stickerAuthor = parts[1].trim() || stickerAuthor;
                } else if (args.length > 0) {
                    stickerName = args;
                }

                await message.reply(media, message.from, {
                    sendMediaAsSticker: true,
                    stickerName: stickerName,
                    stickerAuthor: stickerAuthor
                });
            } catch (err) {
                console.error('Error al crear sticker:', err);
                await message.reply('❌ Ocurrió un error al procesar la imagen.');
            }
        } else {
            await message.reply('⚠️ Envía una imagen/video con `!s` o responde a uno con `!s`.');
        }
        return;
    }

    if (!body.startsWith('!')) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Verificación de comandos grupales
    if (!chat.isGroup && ['kick', 'mute', 'unmute', 'todos', 'hidetag', 'n'].includes(command)) {
        await message.reply('❌ Este comando solo funciona dentro de grupos.');
        return;
    }

    // --- COMANDOS !n, !todos, !hidetag (Mención oculta) ---
    if (['n', 'todos', 'hidetag'].includes(command)) {
        try {
            const textNotice = args.join(' ') || '📢 *Aviso general*';
            let mentions = [];

            for (let participant of chat.participants) {
                mentions.push(participant.id._serialized);
            }

            await chat.sendMessage(textNotice, { mentions });
        } catch (err) {
            console.error('Error en mención oculta:', err);
            await message.reply('❌ No se pudo notificar a los miembros.');
        }
    }

    // --- COMANDO !kick (Expulsar usuario) ---
    else if (command === 'kick') {
        let userToKick;
        if (message.mentionedJidList.length > 0) {
            userToKick = message.mentionedJidList[0];
        } else if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            userToKick = quotedMsg.author || quotedMsg.from;
        }

        if (!userToKick) {
            await message.reply('⚠️ Etiqueta a alguien o responde a su mensaje. Ejemplo: `!kick @usuario`');
            return;
        }

        try {
            await chat.removeParticipants([userToKick]);
            await message.reply('✅ Usuario expulsado.');
        } catch (err) {
            await message.reply('❌ Error al expulsar. Verifica que el bot sea ADMINISTRADOR.');
        }
    }

    // --- COMANDO !mute (Cerrar grupo) ---
    else if (command === 'mute') {
        try {
            await chat.setMessagesAdminsOnly(true);
            await message.reply('🔒 Grupo cerrado. Solo los administradores pueden escribir.');
        } catch (err) {
            await message.reply('❌ Error al cerrar el grupo. El bot debe ser ADMINISTRADOR.');
        }
    }

    // --- COMANDO !unmute (Abrir grupo) ---
    else if (command === 'unmute') {
        try {
            await chat.setMessagesAdminsOnly(false);
            await message.reply('🔓 Grupo abierto. Todos los miembros pueden escribir.');
        } catch (err) {
            await message.reply('❌ Error al abrir el grupo. El bot debe ser ADMINISTRADOR.');
        }
    }

    // --- COMANDOS EXTRA ---
    else if (command === 'ping') {
        await message.reply('¡Pong! El bot está en línea.');
    } else if (command === 'creador') {
        await message.reply('Bot desarrollado por *Javier la cabra*.');
    }
});

client.initialize().catch(err => {
    console.error('❌ Error crítico al inicializar WhatsApp Web:', err);
});