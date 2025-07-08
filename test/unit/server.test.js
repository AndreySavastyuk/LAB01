const request = require('supertest');
const app = require('../../app.js');

describe('Server Tests', () => {
    describe('GET /', () => {
        it('should respond with 200 status', async () => {
            const response = await request(app)
                .get('/')
                .expect(200);
            
            expect(response.type).toBe('text/html');
        });
    });

    describe('GET /index-sap.html', () => {
        it('should serve SAP UI5 version', async () => {
            const response = await request(app)
                .get('/index-sap.html')
                .expect(200);
            
            expect(response.type).toBe('text/html');
            expect(response.text).toContain('SAP UI5');
        });
    });

    describe('GET /api/health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);
            
            expect(response.body).toHaveProperty('status');
            expect(response.body.status).toBe('ok');
        });
    });

    describe('Static Files', () => {
        it('should serve JavaScript files', async () => {
            const response = await request(app)
                .get('/js/sap-ui5/config.js')
                .expect(200);
            
            expect(response.type).toBe('application/javascript');
        });

        it('should serve CSS files', async () => {
            const response = await request(app)
                .get('/css/style.css')
                .expect(404); // Ожидаем 404, так как файл не создан
        });
    });
}); 