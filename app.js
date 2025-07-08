const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Базовые маршруты для тестирования
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/index-sap.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index-sap.html'));
});

// API для тестирования
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/notifications/settings', (req, res) => {
    res.json({ 
        enabled: true, 
        email: false, 
        push: false 
    });
});

app.post('/api/notifications/push/subscribe', (req, res) => {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
        return res.status(400).json({ 
            error: 'Subscription and userId required' 
        });
    }
    
    res.json({ 
        success: true, 
        message: 'Subscription saved',
        userId: userId 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

module.exports = app; 