// server-config.js - Расширенная конфигурация сервера для SAP UI5

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Middleware для SAP UI5
const configureSapUI5 = (app) => {
    // Сжатие ответов
    app.use(compression({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression.filter(req, res);
        }
    }));

    // Безопасность
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 
                           "https://openui5.hana.ondemand.com", 
                           "https://sapui5.hana.ondemand.com"],
                styleSrc: ["'self'", "'unsafe-inline'", 
                          "https://openui5.hana.ondemand.com",
                          "https://sapui5.hana.ondemand.com"],
                imgSrc: ["'self'", "data:", "blob:", "https:"],
                connectSrc: ["'self'", "ws:", "wss:", "https:"],
                fontSrc: ["'self'", "https://openui5.hana.ondemand.com"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 минут
        max: 100, // Лимит запросов
        message: 'Слишком много запросов с этого IP'
    });

    app.use('/api/', limiter);

    // Кэширование статических ресурсов
    app.use('/js/sap-ui5', express.static('public/js/sap-ui5', {
        maxAge: '1d',
        etag: true,
        lastModified: true
    }));

    // Специальные маршруты для SAP UI5
    app.get('/sap-ui-version.json', (req, res) => {
        res.json({
            version: '1.108.0',
            buildTime: new Date().toISOString(),
            features: {
                fiori3: true,
                horizon: true,
                darkMode: true,
                rtl: true
            }
        });
    });

    // Поддержка Component-preload.js
    app.get('/Component-preload.js', async (req, res) => {
        try {
            const componentPreload = await generateComponentPreload();
            res.type('application/javascript');
            res.send(componentPreload);
        } catch (error) {
            res.status(500).send('Error generating Component-preload.js');
        }
    });

    // WebSocket для real-time обновлений
    const WebSocket = require('ws');
    const server = require('http').createServer(app);
    const wss = new WebSocket.Server({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleWebSocketMessage(ws, data);
            } catch (error) {
                ws.send(JSON.stringify({ error: 'Invalid message format' }));
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });
    });

    // Broadcast функция для уведомлений
    app.locals.broadcast = (type, data) => {
        const message = JSON.stringify({ type, data, timestamp: new Date() });
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    };

    return server;
};

// Генерация Component-preload.js
async function generateComponentPreload() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const components = {
        'lab01/Component.js': await fs.readFile('public/js/sap-ui5/Component.js', 'utf8'),
        'lab01/manifest.json': JSON.stringify(require('./manifest.json')),
        'lab01/i18n/i18n.properties': await fs.readFile('public/i18n/i18n.properties', 'utf8')
    };
    
    // Добавляем все контроллеры
    const controllersDir = 'public/js/sap-ui5/controller';
    const controllers = await fs.readdir(controllersDir);
    for (const controller of controllers) {
        if (controller.endsWith('.js')) {
            const content = await fs.readFile(path.join(controllersDir, controller), 'utf8');
            components[`lab01/controller/${controller}`] = content;
        }
    }
    
    // Добавляем все view
    const viewsDir = 'public/js/sap-ui5/view';
    const views = await fs.readdir(viewsDir);
    for (const view of views) {
        if (view.endsWith('.xml')) {
            const content = await fs.readFile(path.join(viewsDir, view), 'utf8');
            components[`lab01/view/${view}`] = content;
        }
    }
    
    // Формируем Component-preload.js
    const preload = `
jQuery.sap.registerPreloadedModules({
    "version": "2.0",
    "modules": ${JSON.stringify(components, null, 2)}
});`;
    
    return preload;
}

// Обработка WebSocket сообщений
function handleWebSocketMessage(ws, data) {
    switch(data.type) {
        case 'subscribe':
            ws.userId = data.userId;
            ws.send(JSON.stringify({ 
                type: 'subscribed', 
                message: 'Successfully subscribed to updates' 
            }));
            break;
            
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
        case 'getStatus':
            // Отправляем текущий статус
            ws.send(JSON.stringify({
                type: 'status',
                data: {
                    connected: true,
                    timestamp: new Date()
                }
            }));
            break;
    }
}

// Middleware для проверки SAP UI5 режима
const sapUI5Mode = (req, res, next) => {
    req.isSapUI5 = req.path.includes('-sap') || 
                   req.headers['x-sap-ui5'] === 'true' ||
                   req.query['sap-ui5'] === 'true';
    next();
};

// Экспорт конфигурации
module.exports = {
    configureSapUI5,
    sapUI5Mode,
    generateComponentPreload
};