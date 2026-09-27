const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Configuración del cliente
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

client.on('qr', (qr) => {
    console.log('Escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ ¡El bot está en línea y con todos los comandos listos!');
});

client.on('message', async (message) => {
    const body = message.body.trim();
    const chat = await message.getChat();

    // --- 1. CREAR STICKERS (!s o !sticker) ---
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
                console.error(err);
                await message.reply('❌ Ocurrió un error al intentar crear el sticker.');
            }
        } else {
            await message.reply('⚠️ Adjunta una foto/video o responde a una con `!s` para hacer un sticker.');
        }
        return;
    }

    if (!body.startsWith('!')) return;

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Comprobación de grupo para comandos grupales
    if (!chat.isGroup && ['kick', 'mute', 'unmute', 'todos', 'hidetag', 'n'].includes(command)) {
        await message.reply('❌ Este comando solo funciona dentro de grupos.');
        return;
    }

    // --- 2. NOTIFICAR A TODOS OCULTO (!n <texto>, !todos <texto> o !hidetag <texto>) ---
    if (command === 'n' || command === 'todos' || command === 'hidetag') {
        try {
            const textNotice = args.join(' ') || '📢 *Aviso general*';
            let mentions = [];

            // Añadimos a todos los participantes a la lista oculta de menciones
            for (let participant of chat.participants) {
                mentions.push(participant.id._serialized);
            }

            // Enviamos el mensaje en limpio con las menciones por detrás
            await chat.sendMessage(textNotice, { mentions });
        } catch (err) {
            console.error(err);
            await message.reply('❌ Ocurrió un error al intentar notificar a los miembros.');
        }
    }

    // --- 3. EXPULSAR USUARIO (!kick) ---
    else if (command === 'kick') {
        let userToKick;
        if (message.mentionedJidList.length > 0) {
            userToKick = message.mentionedJidList[0];
        } else if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            userToKick = quotedMsg.author || quotedMsg.from;
        }

        if (!userToKick) {
            await message.reply('⚠️ Etiqueta a alguien o responde a su mensaje para expulsarlo. Ejemplo: `!kick @usuario`');
            return;
        }

        try {
            await chat.removeParticipants([userToKick]);
            await message.reply('✅ Usuario expulsado.');
        } catch (err) {
            await message.reply('❌ Error al expulsar. Asegúrate de que el bot sea ADMINISTRADOR del grupo.');
        }
    }

    // --- 4. CERRAR CHAT (!mute) ---
    else if (command === 'mute') {
        try {
            await chat.setMessagesAdminsOnly(true);
            await message.reply('🔒 El grupo ha sido cerrado. Solo los administradores pueden enviar mensajes.');
        } catch (err) {
            await message.reply('❌ Error al cerrar el grupo. El bot debe ser ADMINISTRADOR.');
        }
    }

    // --- 5. ABRIR CHAT (!unmute) ---
    else if (command === 'unmute') {
        try {
            await chat.setMessagesAdminsOnly(false);
            await message.reply('🔓 El grupo ha sido abierto. Todos los miembros pueden escribir.');
        } catch (err) {
            await message.reply('❌ Error al abrir el grupo. El bot debe ser ADMINISTRADOR.');
        }
    }

    // --- 6. COMANDOS EXTRA ---
    else if (command === 'ping') {
        await message.reply('¡Pong! El bot está en línea y activo.');
    } else if (command === 'creador') {
        await message.reply('Bot desarrollado por *Javier la cabra*.');
    }
});

client.initialize().catch(err => {
    console.error('❌ Error al inicializar el cliente:', err.message);
});