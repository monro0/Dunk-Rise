// --- SKIN TEXTURE LOADER ---

const skinImages = {};
const loadingPromises = {};

/**
 * Загрузить текстуру для скина
 * @param {string} skinId - ID скина
 * @param {string} basePath - Путь к папке с ассетами
 * @returns {Promise<HTMLImageElement>}
 */
export function loadSkinTexture(skinId, basePath = 'assets/skins/') {
    if (loadingPromises[skinId]) {
        return loadingPromises[skinId];
    }
    
    if (skinImages[skinId]) {
        return Promise.resolve(skinImages[skinId]);
    }
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `${basePath}${skinId}.png`;
        
        img.onload = () => {
            skinImages[skinId] = img;
            resolve(img);
        };
        
        img.onerror = () => {
            console.warn(`Текстура не найдена: ${img.src}, используем процедурную отрисовку`);
            resolve(null);
        };
        
        loadingPromises[skinId] = img;
    });
}

/**
 * Загрузить все текстуры скинов
 * @param {Array} skins - Массив скинов из config
 * @param {string} basePath - Путь к папке с ассетами
 * @returns {Promise<void>}
 */
export async function loadAllSkins(skins, basePath = 'assets/skins/') {
    const promises = skins.map(skin => loadSkinTexture(skin.id, basePath));
    await Promise.all(promises);
    console.log('Все скины загружены');
}

/**
 * Получить текстуру скина
 * @param {string} skinId - ID скина
 * @returns {HTMLImageElement|null}
 */
export function getSkinTexture(skinId) {
    return skinImages[skinId] || null;
}

/**
 * Проверить, загружена ли текстура
 * @param {string} skinId - ID скина
 * @returns {boolean}
 */
export function isSkinLoaded(skinId) {
    return !!(skinImages[skinId] && skinImages[skinId].complete);
}
