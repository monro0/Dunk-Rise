// --- FIREBASE LEADERBOARD MODULE ---

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { 
    getDatabase, 
    ref, 
    set, 
    push, 
    onValue, 
    query, 
    orderByChild, 
    limitToLast,
    get
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js";

// Firebase конфигурация
const firebaseConfig = {
    apiKey: "AIzaSyCczC5hu2M3dAgM3PKU7QdLm2qAzVOa-wk",
    authDomain: "dunk-rise.firebaseapp.com",
    databaseURL: "https://dunk-rise-default-rtdb.firebaseio.com",
    projectId: "dunk-rise",
    storageBucket: "dunk-rise.firebasestorage.app",
    messagingSenderId: "318544912488",
    appId: "1:318544912488:web:f719fc9a2095a1d5931bdd",
    measurementId: "G-XHW7N3250P"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ФУНКЦИИ ---

/**
 * Получить идентификатор игрока
 * Если Telegram доступен - используем ID, иначе генерируем уникальный
 */
function getPlayerId() {
    // Проверяем Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user && user.id) {
            return `tg_${user.id}`;
        }
    }
    
    // Проверяем сохранённый ID
    let savedId = localStorage.getItem('dunkRise_playerId');
    if (savedId) {
        return savedId;
    }
    
    // Генерируем новый ID
    savedId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('dunkRise_playerId', savedId);
    return savedId;
}

/**
 * Получить имя игрока
 */
function getPlayerName() {
    // Проверяем Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        if (user) {
            // Формируем имя из first_name и last_name
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            if (firstName && lastName) {
                return `${firstName} ${lastName}`;
            }
            if (firstName) {
                return firstName;
            }
            if (user.username) {
                return `@${user.username}`;
            }
        }
    }
    
    // Проверяем сохранённое имя
    let savedName = localStorage.getItem('dunkRise_playerName');
    if (savedName) {
        return savedName;
    }
    
    // Генерируем имя по умолчанию
    savedName = `Игрок ${Math.floor(Math.random() * 10000)}`;
    localStorage.setItem('dunkRise_playerName', savedName);
    return savedName;
}

/**
 * Сохранить результат в таблице лидеров
 * @param {number} score - Очки
 * @returns {Promise<boolean>} - Успешно ли сохранено
 */
export async function saveScore(score) {
    const playerId = getPlayerId();
    const playerName = getPlayerName();
    const timestamp = Date.now();
    
    try {
        // Проверяем существующий рекорд игрока
        const playerRef = ref(db, `leaderboard/${playerId}`);
        const snapshot = await get(playerRef);
        
        if (snapshot.exists()) {
            const existingData = snapshot.val();
            // Обновляем только если новый результат лучше
            if (score > existingData.score) {
                await set(playerRef, {
                    score: score,
                    name: playerName,
                    timestamp: timestamp,
                    updatedAt: new Date().toISOString()
                });
                return true;
            }
            return false; // Результат не лучше существующего
        } else {
            // Новый игрок
            await set(playerRef, {
                score: score,
                name: playerName,
                timestamp: timestamp,
                createdAt: new Date().toISOString()
            });
            return true;
        }
    } catch (error) {
        console.error('Ошибка сохранения результата:', error);
        return false;
    }
}

/**
 * Получить топ-N игроков
 * @param {number} limit - Количество игроков (по умолчанию 20)
 * @param {function} callback - Функция обратного вызова с данными
 * @returns {function} - Функция для отписки от обновлений
 */
export function getTopPlayers(limit = 20, callback) {
    const leaderboardRef = ref(db, 'leaderboard');
    const topQuery = query(
        leaderboardRef, 
        orderByChild('score'), 
        limitToLast(limit)
    );
    
    const unsubscribe = onValue(topQuery, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const players = [];
            
            // Преобразуем объект в массив
            Object.entries(data).forEach(([id, playerData]) => {
                players.push({
                    id: id,
                    ...playerData
                });
            });
            
            // Сортируем по убыванию очков
            players.sort((a, b) => b.score - a.score);
            
            // Добавляем позиции
            players.forEach((player, index) => {
                player.rank = index + 1;
            });
            
            callback(players);
        } else {
            callback([]); // Таблица пуста
        }
    }, (error) => {
        console.error('Ошибка получения таблицы лидеров:', error);
        callback([]);
    });
    
    return unsubscribe;
}

/**
 * Получить позицию игрока в таблице
 * @returns {Promise<object|null>} - Данные игрока и позиция
 */
export async function getPlayerRank() {
    const playerId = getPlayerId();
    
    try {
        const playerRef = ref(db, `leaderboard/${playerId}`);
        const snapshot = await get(playerRef);
        
        if (snapshot.exists()) {
            const playerData = snapshot.val();
            
            // Получаем всех игроков с большим или равным счётом
            const leaderboardRef = ref(db, 'leaderboard');
            const scoreQuery = query(
                leaderboardRef,
                orderByChild('score')
            );
            const allSnapshot = await get(scoreQuery);
            
            let rank = 1;
            if (allSnapshot.exists()) {
                const allData = allSnapshot.val();
                const sortedPlayers = Object.entries(allData)
                    .map(([id, data]) => ({ id, ...data }))
                    .sort((a, b) => b.score - a.score);
                
                const index = sortedPlayers.findIndex(p => p.id === playerId);
                rank = index + 1;
            }
            
            return {
                id: playerId,
                ...playerData,
                rank: rank
            };
        }
        
        return null; // Игрок не в таблице
    } catch (error) {
        console.error('Ошибка получения позиции:', error);
        return null;
    }
}

/**
 * Проверить, является ли результат новым рекордом
 * @param {number} score - Текущий счёт
 * @returns {Promise<boolean>} - Новый ли это рекорд
 */
export async function isNewRecord(score) {
    const playerId = getPlayerId();
    
    try {
        const playerRef = ref(db, `leaderboard/${playerId}`);
        const snapshot = await get(playerRef);
        
        if (snapshot.exists()) {
            const existingScore = snapshot.val().score;
            return score > existingScore;
        }
        
        return true; // Игрока ещё нет в таблице
    } catch (error) {
        console.error('Ошибка проверки рекорда:', error);
        return false;
    }
}

// Экспорт утилит
export { getPlayerId, getPlayerName };
