// --- TELEGRAM ADS MODULE ---
// Модуль для рекламы через Telegram-канал (Вариант A - простой)

import { GameSettings } from './config.js';

// Конфигурация
export const ADS_CONFIG = {
    // ССЫЛКА НА ТВОЙ TELEGRAM КАНАЛ
    // Замени на свою ссылку!
    channelUrl: 'https://t.me/+-9JyGNrhlydhMjFi',
    
    // Ключ для localStorage (отметка что игрок уже подписался)
    subscribedKey: 'dunkRise_subscribed',
    
    // Таймаут перед возвратом (мс) - минимальное время в канале
    minSubscribeTime: 3000
};

// Состояние
let isPaused = false;
let pauseCallback = null;
let resumeCallback = null;
let isProcessing = false;
let reviveCallback = null;

/**
 * Открыть Telegram-канал и поставить на паузу игру
 */
export function openChannel(onRevive) {
    if (isProcessing) return;
    isProcessing = true;
    reviveCallback = onRevive;
    
    // Проверяем, подписан ли уже игрок
    const alreadySubscribed = localStorage.getItem(ADS_CONFIG.subscribedKey);
    
    if (alreadySubscribed === 'true') {
        // Уже подписан - сразу даём шанс
        console.log('Игрок уже подписан, даём второй шанс');
        isProcessing = false;
        if (reviveCallback) reviveCallback();
        return;
    }
    
    // Останавливаем таймер
    pauseTimer();
    
    // Открываем канал через Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
        // Открываем в Telegram
        window.Telegram.WebApp.openTelegramLink(ADS_CONFIG.channelUrl);
    } else {
        // Если не в Telegram - открываем в новой вкладке
        window.open(ADS_CONFIG.channelUrl, '_blank');
    }
    
    // Ждём возврата игрока
    setTimeout(() => {
        // Игрок вернулся - проверяем
        isProcessing = false;
        
        // Визуально подтверждаем
        if (GameSettings.vibration && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        
        // Помечаем как подписанный
        localStorage.setItem(ADS_CONFIG.subscribedKey, 'true');
        
        // Возобновляем таймер и даём шанс
        resumeTimer();
        if (reviveCallback) reviveCallback();
    }, ADS_CONFIG.minSubscribeTime);
}

/**
 * Поставить таймер на паузу
 */
export function pauseTimer() {
    isPaused = true;
    if (pauseCallback) pauseCallback();
    console.log('Таймер на паузе');
}

/**
 * Возобновить таймер
 */
export function resumeTimer() {
    isPaused = false;
    if (resumeCallback) resumeCallback();
    console.log('Таймер возобновлён');
}

/**
 * Проверить, подписан ли игрок
 */
export function isSubscribed() {
    return localStorage.getItem(ADS_CONFIG.subscribedKey) === 'true';
}

/**
 * Сбросить подписку (для тестов)
 */
export function resetSubscription() {
    localStorage.removeItem(ADS_CONFIG.subscribedKey);
    console.log('Подписка сброшена');
}

/**
 * Установить колбэк на паузу
 */
export function setPauseCallback(callback) {
    pauseCallback = callback;
}

/**
 * Установить колбэк на возобновление
 */
export function setResumeCallback(callback) {
    resumeCallback = callback;
}

/**
 * Обновить ссылку на канал
 */
export function setChannelUrl(url) {
    ADS_CONFIG.channelUrl = url;
}
