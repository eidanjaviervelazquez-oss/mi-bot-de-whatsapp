const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason
} = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function connectToWhatsApp() {
    // Guarda la sesión en la carpeta "auth_info"
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut);
            console.log('Conexión cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Bot conectado exitosamente a WhatsApp!');
        }
    });

    // Escuchar mensajes entrantes
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        // Obtener el texto del mensaje
        const body = msg.message.conversation || 
                     msg.message.extendedTextMessage?.text || '';

        if (!body.startsWith('!')) return; // Solo responder si inicia con "!"

        const args = body.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        // --- COMANDO !kick (Expulsar usuario) ---
        if (command === 'kick') {
            if (!isGroup) {
                await sock.sendMessage(from, { text: '❌ Este comando solo funciona dentro de grupos.' });
                return;
            }

            // Obtener la persona etiquetada o a la que se le respondió el mensaje
            let target;
            if (msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
                target = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
            } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
                target = msg.message.extendedTextMessage.contextInfo.participant;
            }

            if (!target) {
                await sock.sendMessage(from, { text: '⚠️ Etiqueta a alguien o responde a su mensaje para expulsarlo. Ejemplo: !kick @usuario' });
                return;
            }

            try {
                await sock.groupParticipantsUpdate(from, [target], 'remove');
                await sock.sendMessage(from, { text: '✅ Usuario expulsado del grupo.' });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(from, { text: '❌ Error al expulsar. Asegúrate de que el bot sea ADMINISTRADOR del grupo.' });
            }
        }

        // --- COMANDO !mute / !unmute (Cerrar o abrir el grupo) ---
        if (command === 'mute' || command === 'unmute') {
            if (!isGroup) {
                await sock.sendMessage(from, { text: '❌ Este comando solo funciona dentro de grupos.' });
                return;
            }

            const setting = command === 'mute' ? 'announcement' : 'not_announcement';
            try {
                await sock.groupSettingUpdate(from, setting);
                const statusText = command === 'mute' 
                    ? '🔒 El grupo ha sido cerrado. Solo los administradores pueden enviar mensajes.' 
                    : '🔓 El grupo ha sido abierto. Todos los miembros pueden escribir.';
                await sock.sendMessage(from, { text: statusText });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(from, { text: '❌ Error al cambiar la configuración. Asegúrate de que el bot sea ADMINISTRADOR.' });
            }
        }
    });
}

connectToWhatsApp();