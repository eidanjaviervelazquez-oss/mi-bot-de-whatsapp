const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Configuración de Puppeteer optimizada para servidores y uso local
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

// Generar código QR en la terminal
client.on('qr', (qr) => {
    console.log('Escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('✅ ¡El bot está en línea y conectado con éxito!');
});

// Evento al recibir mensajes
client.on('message', async (message) => {
    const body = message.body.trim();
    if (!body.startsWith('!')) return; // Ignorar si no empieza con "!"

    const args = body.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const chat = await message.getChat();

    // Comprobación de si el mensaje proviene de un grupo
    if (!chat.isGroup) {
        if (['kick', 'mute', 'unmute'].includes(command)) {
            await message.reply('❌ Este comando solo funciona dentro de grupos.');
            return;
        }
    }

    // --- COMANDO !kick (Expulsar usuario) ---
    if (command === 'kick') {
        // Verificar si se mencionó a alguien o se respondió a un mensaje
        let userToKick;
        
        if (message.mentionedJidList.length > 0) {
            userToKick = message.mentionedJidList[0];
        } else if (message.hasQuotedMsg) {
            const quotedMsg = await message.getQuotedMessage();
            userToKick = quotedMsg.author || quotedMsg.from;
        }

        if (!userToKick) {
            await message.reply('⚠️ Etiqueta a alguien o responde a su mensaje para expulsarlo. Ejemplo: !kick @usuario');
            return;
        }

        try {
            await chat.removeParticipants([userToKick]);
            await message.reply('✅ Usuario expulsado con éxito del grupo.');
        } catch (err) {
            console.error(err);
            await message.reply('❌ Error al expulsar. Asegúrate de que el bot sea ADMINISTRADOR del grupo.');
        }
    }

    // --- COMANDO !mute (Solo admins pueden escribir) ---
    else if (command === 'mute') {
        try {
            await chat.setMessagesAdminsOnly(true);
            await message.reply('🔒 El grupo ha sido cerrado. Solo los administradores pueden enviar mensajes.');
        } catch (err) {
            console.error(err);
            await message.reply('❌ Error al cerrar el grupo. Asegúrate de que el bot sea ADMINISTRADOR.');
        }
    }

    // --- COMANDO !unmute (Todos los miembros pueden escribir) ---
    else if (command === 'unmute') {
        try {
            await chat.setMessagesAdminsOnly(false);
            await message.reply('🔓 El grupo ha sido abierto. Todos los miembros pueden escribir.');
        } catch (err) {
            console.error(err);
            await message.reply('❌ Error al abrir el grupo. Asegúrate de que el bot sea ADMINISTRADOR.');
        }
    }

    // --- COMANDOS BÁSICOS ---
    else if (command === 'ping') {
        await message.reply('¡Pong! El bot está en línea y activo.');
    } else if (command === 'creador') {
        await message.reply('Bot desarrollado por *Javier la cabra*.');
    }
});

// Inicialización del cliente
client.initialize().catch(err => {
    console.error('❌ Error al inicializar el cliente:', err.message);
});