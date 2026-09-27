const { Client, LocalAuth } = require('whatsapp-web.js');

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

// Guardar actividad de usuarios en grupos (para detectar fantasmas)
// Formato: { groupId: { userId: contadorMensajes } }
const contadoresGrupo = {};

client.on('qr', (qr) => {
    console.log('--- CÓDIGO QR GENERADO ---');
    console.log('Abre este enlace en tu navegador para ver tu QR:');
    console.log(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300`);
    console.log('--------------------------');
});

client.on('ready', () => {
    console.log('¡El bot está encendido y listo!');
});

client.on('message', async (message) => {
    // Ignorar mensajes enviados por el propio bot para evitar bucles
    if (message.fromMe) return;

    const chat = await message.getChat();
    const texto = message.body.trim();
    const textoMinuscula = texto.toLowerCase();

    // --- REGISTRO DE ACTIVIDAD PARA FANTASMAS (SOLO EN GRUPOS) ---
    if (chat.isGroup) {
        const groupId = chat.id._serialized;
        const userId = message.author || message.from;

        if (!contadoresGrupo[groupId]) {
            contadoresGrupo[groupId] = {};
        }
        contadoresGrupo[groupId][userId] = (contadoresGrupo[groupId][userId] || 0) + 1;
    }

    // --- COMANDO !menu / !ayuda ---
    if (textoMinuscula === '!menu' || textoMinuscula === '!ayuda') {
        const menuText = `🤖 *MENÚ DE COMANDOS DEL BOT* 🤖

📌 *!menu* - Muestra este menú.
📌 *!n <texto>* - Notifica a TODOS los miembros del grupo en oculto (Ejemplo: *!n Hola a todos*).
👻 *!fantasmas* - Muestra miembros que no han enviado mensajes desde que inició el bot.
📌 *!ping* - Revisa si el bot está activo.
📌 *!creador* - Muestra los créditos del creador.
📸 *!sticker* - Responde a una imagen con este comando para convertirla en sticker.`;
        
        await message.reply(menuText);
        return;
    }

    // --- COMANDO !n (MENCIÓN OCULTA A TODOS) ---
    if (textoMinuscula.startsWith('!n ')) {
        if (!chat.isGroup) {
            await message.reply('❌ Este comando solo funciona en grupos.');
            return;
        }

        const mensajeAEnviar = texto.slice(3).trim();
        if (!mensajeAEnviar) {
            await message.reply('⚠️ Debes incluir un mensaje. Ejemplo: `!n Hola a todos`');
            return;
        }

        let menciones = [];
        for (let participante of chat.participants) {
            menciones.push(participante.id._serialized);
        }

        // Envía el mensaje etiquetando en segundo plano a todos
        await chat.sendMessage(mensajeAEnviar, { mentions: menciones });
        return;
    }

    // --- COMANDO !fantasmas ---
    if (textoMinuscula === '!fantasmas') {
        if (!chat.isGroup) {
            await message.reply('❌ Este comando solo funciona en grupos.');
            return;
        }

        const groupId = chat.id._serialized;
        const registroActual = contadoresGrupo[groupId] || {};
        
        let fantasmas = [];
        for (let participante of chat.participants) {
            const userId = participante.id._serialized;
            // Si el participante no tiene mensajes registrados
            if (!registroActual[userId]) {
                fantasmas.push(participante);
            }
        }

        if (fantasmas.length === 0) {
            await message.reply('🎉 ¡Increíble! Todos los miembros han interactuado al menos una vez.');
        } else {
            let respuesta = `👻 *LISTA DE FANTASMAS DE ESTE GRUPO* 👻\n\nTotal inactivos: ${fantasmas.length}\n\n`;
            let mencionesFantasmas = [];
            
            fantasmas.forEach((p) => {
                respuesta += `• @${p.id.user}\n`;
                mencionesFantasmas.push(p.id._serialized);
            });

            await chat.sendMessage(respuesta, { mentions: mencionesFantasmas });
        }
        return;
    }

    // --- OTROS COMANDOS ÚTILES ---
    if (textoMinuscula === '!ping') {
        await message.reply('🏓 ¡Pong! El bot está en línea y funcionando.');
    } else if (textoMinuscula === '!creador') {
        await message.reply('👑 Bot desarrollado y configurado por *Javier la cabra*.');
    } else if (textoMinuscula === '!sticker' && message.hasMedia) {
        try {
            const media = await message.downloadMedia();
            await client.sendMessage(message.from, media, { sendMediaAsSticker: true });
        } catch (error) {
            await message.reply('❌ Ocurrió un error al intentar crear el sticker.');
        }
    }
});

client.initialize();