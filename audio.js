import { GameSettings } from './config.js';

const context = new (window.AudioContext || window.webkitAudioContext)();
const buffers = {};

// Пути к файлам (теперь в папке assets)
const sounds = {
    bounce: 'assets/bounce.mp3',
    rim: 'assets/rim.mp3',
    net: 'assets/net.mp3',
    over: 'assets/over.mp3',
    throw: 'assets/throw.mp3'
};

export async function initAudio() {
    // Предзагрузка звуков
    const promises = Object.keys(sounds).map(async (key) => {
        try {
            const response = await fetch(sounds[key]);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            buffers[key] = audioBuffer;
        } catch (e) {
            console.warn(`Не удалось загрузить звук: ${key} (${sounds[key]})`, e);
        }
    });

    await Promise.all(promises);
}

export function playSound(name, volume = 1.0) {
    if (!GameSettings.sound || !buffers[name]) return;

    // Разблокировка AudioContext (нужна для браузеров)
    if (context.state === 'suspended') {
        context.resume();
    }

    const source = context.createBufferSource();
    source.buffer = buffers[name];

    const gainNode = context.createGain();
    gainNode.gain.value = volume;

    source.connect(gainNode);
    gainNode.connect(context.destination);
    
    // Рандомизация высоты тона для реализма (чтобы не звучало как пулемет)
    if (name === 'bounce' || name === 'rim') {
        source.playbackRate.value = 0.9 + Math.random() * 0.2; 
    }

    source.start(0);
}
